import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import { Platform } from 'react-native';

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
): Promise<number | null> => {
    let uriToProcess = audioUri;
    let convertedUri: string | null = null;

    try {
        if (!SPEECH_KEY || !SPEECH_REGION) {
            throw new Error('Azure Speech Key or Region is missing in environment variables.');
        }

        // 1. CONVERSION STEP
        // If on Android (or if the file extension isn't .wav), we must convert it.
        if (Platform.OS === 'android' || !audioUri.endsWith('.wav')) {
            console.log('[ScoringService] Detected non-WAV or Android file. Converting...');
            convertedUri = await convertToAzureWav(audioUri);
            uriToProcess = convertedUri;
        }

        // 2. READ FILE
        // Read the (possibly converted) file as Base64
        const base64String = await FileSystem.readAsStringAsync(uriToProcess, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // 3. PREPARE BUFFER
        const buffer = Buffer.from(base64String, 'base64');
        // Create an ArrayBuffer copy for the Azure SDK
        const arrayBuffer = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
        );

        // 4. SETUP AZURE STREAM
        const pushStream = sdk.AudioInputStream.createPushStream();
        pushStream.write(arrayBuffer);
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
                        console.log(`[ScoringService] Score: ${assessmentResult.accuracyScore}`);
                        resolve(assessmentResult.accuracyScore);
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
