const fs = require('fs');
const path = require('path');

const epPath = path.join(__dirname, 'src/modules/writing/data/expectedPaths.json');
let ep = JSON.parse(fs.readFileSync(epPath, 'utf8'));

const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
for (const l of letters) {
    if (!ep['cursive_'+l+'_1']) {
        // Just make a dummy zig-zag path for any missing letter to avoid crashes
        ep['cursive_'+l+'_1'] = [
            { x: 0.3, y: 0.5 },
            { x: 0.4, y: 0.3 },
            { x: 0.5, y: 0.5 },
            { x: 0.6, y: 0.3 },
            { x: 0.7, y: 0.5 }
        ];
    }
}
fs.writeFileSync(epPath, JSON.stringify(ep, null, 2));
console.log('Done');
