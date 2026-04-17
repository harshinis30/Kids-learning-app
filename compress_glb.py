import json
import struct
import io
import os
from PIL import Image

def optimize_glb(input_path, output_path, max_size=512):
    with open(input_path, 'rb') as f:
        magic = f.read(4)
        if magic != b'glTF':
            print("Not a GLB file")
            return
        version, length = struct.unpack('<II', f.read(8))
        
        chunk_length, chunk_type = struct.unpack('<II', f.read(8))
        if chunk_type != 0x4E4F534A: # JSON
            print("First chunk is not JSON")
            return
            
        json_data = f.read(chunk_length)
        gltf = json.loads(json_data.decode('utf-8'))
        
        # pad to 4 bytes boundary
        if f.tell() % 4 != 0:
            f.read(4 - (f.tell() % 4))
            
        chunk_length_2, chunk_type_2 = struct.unpack('<II', f.read(8))
        if chunk_type_2 != 0x004E4942: # BIN\0
            print("Second chunk is not BIN")
            return
            
        bin_data = f.read(chunk_length_2)
        
    print(f"Loaded GLB, {len(gltf.get('images', []))} images found.")

    new_bin_data = bytearray()
    
    # We will rebuild the entire buffer.
    # To keep things simple, we only support GLBs with a single buffer (the BIN chunk).
    if len(gltf.get('buffers', [])) > 1:
        print("Multiple buffers not supported")
        return

    buffer_views = gltf.get('bufferViews', [])
    images = gltf.get('images', [])

    # We need to process all buffer views. Those used by images will be compressed, 
    # others (geometry, animations) will just be copied.
    # Map buffer view index to its new byteOffset and byteLength
    view_mapping = {}
    
    # Sort buffer views by original byteOffset
    sorted_views = sorted([(i, v) for i, v in enumerate(buffer_views)], key=lambda x: x[1].get('byteOffset', 0))

    # Identify which buffer views are images
    image_view_indices = set()
    for img in images:
        if 'bufferView' in img:
            image_view_indices.add(img['bufferView'])

    for old_i, v in sorted_views:
        old_offset = v.get('byteOffset', 0)
        old_length = v.get('byteLength', 0)
        
        data = bin_data[old_offset : old_offset + old_length]
        
        if old_i in image_view_indices:
            # Compress image
            try:
                img = Image.open(io.BytesIO(data))
                if img.mode != 'RGB' and img.mode != 'RGBA':
                    img = img.convert('RGBA')
                img.thumbnail((max_size, max_size))
                out_io = io.BytesIO()
                
                # Check mime type to save as JPEG vs PNG
                # Textures with alpha should stay PNG
                is_jpeg = False
                mime_type = "image/png"
                for im in images:
                    if im.get('bufferView') == old_i:
                        if im.get('mimeType') == 'image/jpeg':
                            is_jpeg = True
                            mime_type = "image/jpeg"
                        break
                
                # We can heavily optimize by using JPEG for everything without alpha
                if img.mode == 'RGB':
                    is_jpeg = True
                    mime_type = "image/jpeg"
                    
                if is_jpeg:
                    img.save(out_io, format='JPEG', quality=85)
                else:
                    img.save(out_io, format='PNG', optimize=True)
                    
                data = out_io.getvalue()
                
                # Update mime type in gltf['images']
                for im in images:
                    if im.get('bufferView') == old_i:
                        im['mimeType'] = "image/jpeg" if is_jpeg else "image/png"
            except Exception as e:
                print(f"Failed to compress image view {old_i}: {e}")

        # ensure 4-byte alignment
        padding = (4 - (len(data) % 4)) % 4
        padded_data = data + (b'\x00' * padding)
        
        new_offset = len(new_bin_data)
        new_bin_data.extend(padded_data)
        
        # update buffer view
        v['byteOffset'] = new_offset
        v['byteLength'] = len(data)

    # update buffer
    if 'buffers' in gltf and len(gltf['buffers']) > 0:
        gltf['buffers'][0]['byteLength'] = len(new_bin_data)

    # Write output
    new_json_data = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    padding_json = (4 - (len(new_json_data) % 4)) % 4
    new_json_data += b' ' * padding_json

    with open(output_path, 'wb') as f:
        # header
        f.write(b'glTF')
        f.write(struct.pack('<II', 2, 12 + 8 + len(new_json_data) + 8 + len(new_bin_data)))
        
        # json chunk
        f.write(struct.pack('<II', len(new_json_data), 0x4E4F534A))
        f.write(new_json_data)
        
        # bin chunk
        f.write(struct.pack('<II', len(new_bin_data), 0x004E4942))
        f.write(new_bin_data)

    print(f"Saved optimized GLB. Original: {len(bin_data)//1024}KB, New: {len(new_bin_data)//1024}KB")

optimize_glb('assets/models/rain_v3.2.glb', 'assets/models/rain_optimized.glb')
