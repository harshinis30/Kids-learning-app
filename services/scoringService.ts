import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import { Platform } from 'react-native';

export interface PronunciationResult {
    accuracyScore: number;
    fluencyScore: number;
    completenessScore: number;
    prosodyScore: number;
    compositeScore: number;
    phonemes: { phoneme: string; accuracyScore: number }[];
}

export function computeStars(result: PronunciationResult | number, stage: number = 1): number {
    const score = typeof result === 'number' ? result : result.compositeScore;
    // Thresholds can be adjusted by stage if needed
    if (score >= 90) return 3;
    if (score >= 70) return 2;
    if (score >= 50) return 1;
    return 0;
}

// Ensure these are set in your .env file
const SPEECH_KEY = process.env.EXPO_PUBLIC_SPEECH_KEY;
const SPEECH_REGION = process.env.EXPO_PUBLIC_SPEECH_REGION;

/**
 * Helper: Converts an audio file to the specific WAV format Azure requires.
 * Format: 16kHz sample rate, 1 channel (Mono), PCM s16le
 */
const convertToAzureWav = async (sourceUri: string): Promise<string> => {
    // Generate a temporary filename in the cache directory
    const filename = sourceUri.split('/').pop()?.split('.')[0] || 'temp_audio';
    const targetUri = `${FileSystem.cacheDirectory}${filename}_converted.wav`;

    // FFmpeg command breakdown:
    // -i [input]        : Input file
    // -acodec pcm_s16le : Output codec (16-bit PCM)
    // -ar 16000         : Audio sample rate (16kHz)
    // -ac 1             : Audio channels (Mono)
    // -y                : Overwrite output file if it exists
    const command = `-i "${sourceUri}" -acodec pcm_s16le -ar 16000 -ac 1 -y "${targetUri}"`;

    console.log(`[ScoringService] Starting conversion: ${command}`);
    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
        console.log('[ScoringService] Conversion successful');
        return targetUri;
    } else {
        const logs = await session.getAllLogs();
        console.error('[ScoringService] FFmpeg conversion failed:', logs);
        throw new Error('Failed to convert audio file for Azure.');
    }
};

/**
 * Main function to get pronunciation score.
 */
export const getPronunciationScore = async (
    targetWord: string,
    audioUri: string
): Promise<PronunciationResult | null> => {
    let uriToProcess = audioUri;
    let convertedUri: string | null = null;
    let finalArrayBuffer: ArrayBuffer | null = null;

    try {
        if (!SPEECH_KEY || !SPEECH_REGION) {
            throw new Error('Azure Speech Key or Region is missing in environment variables.');
        }

        if (Platform.OS === 'web') {
            console.log('[ScoringService] Web platform detected. Processing audio via Web Audio...');
            
            // 1. Fetch Blob from the Web URI
            const response = await fetch(audioUri);
            const arrayBuffer = await response.arrayBuffer();

            // 2. Decode and Resample to 16kHz
            const AudioContextClass = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
            const audioCtx = new AudioContextClass({ sampleRate: 16000 });
            const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            // 3. Extract Mono Channel
            const channelData = decodedBuffer.getChannelData(0);

            // 4. Convert Float32 to Int16 PCM
            const pcm16 = new Int16Array(channelData.length);
            for (let i = 0; i < channelData.length; i++) {
                const s = Math.max(-1, Math.min(1, channelData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }

            finalArrayBuffer = pcm16.buffer;

        } else {
            // 1. CONVERSION STEP FOR NATIVE
            if (Platform.OS === 'android' || !audioUri.endsWith('.wav')) {
                console.log('[ScoringService] Detected non-WAV or Android file. Converting...');
                convertedUri = await convertToAzureWav(audioUri);
                uriToProcess = convertedUri;
            }

            // 2. READ FILE
            const base64String = await FileSystem.readAsStringAsync(uriToProcess, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // 3. PREPARE BUFFER
            const buffer = Buffer.from(base64String, 'base64');
            finalArrayBuffer = buffer.buffer.slice(
                buffer.byteOffset,
                buffer.byteOffset + buffer.byteLength
            );
        }

        // 4. SETUP AZURE STREAM
        const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
        const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);
        if (finalArrayBuffer) {
            pushStream.write(finalArrayBuffer);
        }
        pushStream.close(); // Important: Close stream so Azure knows data is finished

        // 5. CONFIGURE RECOGNIZER
        const speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

        // Configure Pronunciation Assessment
        const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
            targetWord,
            sdk.PronunciationAssessmentGradingSystem.HundredMark,
            sdk.PronunciationAssessmentGranularity.Phoneme,
            true // Enable miscue calculation
        );
        pronunciationConfig.applyTo(recognizer);

        // 6. EXECUTE RECOGNITION
        return new Promise((resolve, reject) => {
            recognizer.recognizeOnceAsync(
                (result) => {
                    // Cleanup resources
                    recognizer.close();

                    // Delete the temporary converted file to save space
                    if (convertedUri) {
                        FileSystem.deleteAsync(convertedUri, { idempotent: true }).catch(() => { });
                    }

                    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                        const assessmentResult = sdk.PronunciationAssessmentResult.fromResult(result);
                        
                        const accuracyScore = assessmentResult.accuracyScore;
                        const fluencyScore = assessmentResult.fluencyScore || 0;
                        const completenessScore = assessmentResult.completenessScore || 0;
                        const prosodyScore = assessmentResult.prosodyScore || 0;
                        // Use Azure's official pronunciationScore (weighted composite of all metrics)
                        const compositeScore = assessmentResult.pronunciationScore || 
                            ((accuracyScore * 0.4) + (fluencyScore * 0.2) + (completenessScore * 0.2) + (prosodyScore * 0.2));
                        
                        let phonemes: { phoneme: string; accuracyScore: number }[] = [];
                        if (assessmentResult.detailResult && assessmentResult.detailResult.Words) {
                            phonemes = assessmentResult.detailResult.Words.flatMap((w: any) => 
                                (w.Phonemes || []).map((p: any) => ({
                                    phoneme: p.Phoneme,
                                    accuracyScore: p.AccuracyScore
                                }))
                            );
                        }
                        
                        console.log(`[ScoringService] Scores — Accuracy: ${accuracyScore}, Fluency: ${fluencyScore}, Completeness: ${completenessScore}, Prosody: ${prosodyScore}, Composite: ${compositeScore.toFixed(1)}`);
                        resolve({
                            accuracyScore,
                            fluencyScore,
                            completenessScore,
                            prosodyScore,
                            compositeScore,
                            phonemes
                        });
                    } else {
                        console.warn('[ScoringService] Recognition failed or no match.', result.errorDetails);
                        resolve(null);
                    }
                },
                (error) => {
                    recognizer.close();
                    if (convertedUri) {
                        FileSystem.deleteAsync(convertedUri, { idempotent: true }).catch(() => { });
                    }
                    console.error('[ScoringService] Azure SDK Error:', error);
                    reject(error);
                }
            );
        });

    } catch (error) {
        console.error('[ScoringService] Error:', error);
        // Final cleanup attempt in case of error
        if (convertedUri) {
            FileSystem.deleteAsync(convertedUri, { idempotent: true }).catch(() => { });
        }
        throw error;
    }
};
