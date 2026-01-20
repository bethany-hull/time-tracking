/**
 * Speech Recognition Service
 * Uses expo-speech-recognition for on-device transcription (free!)
 * 
 * This uses the device's built-in speech recognition:
 * - iOS: Uses Siri's speech recognition
 * - Android: Uses Google's speech recognition
 * 
 * Benefits:
 * - No API costs for transcription
 * - No model downloads needed
 * - Works offline (with on-device recognition enabled)
 * 
 * Note: iOS Simulator has limited speech recognition support.
 * For best results, test on a real device.
 */

import {
  ExpoSpeechRecognitionModule,
  AudioEncodingAndroid,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { Platform } from 'react-native';

// Detect if running in simulator
const isSimulator = __DEV__ && Platform.OS === 'ios';

export interface TranscriptionResult {
  transcript: string;
  confidence?: number;
}

/**
 * Check if speech recognition is available on the device
 */
export function isSpeechRecognitionAvailable(): boolean {
  return ExpoSpeechRecognitionModule.isRecognitionAvailable();
}

/**
 * Check if on-device recognition is supported
 */
export function supportsOnDeviceRecognition(): boolean {
  return ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
}

/**
 * Request speech recognition permissions
 */
export async function requestSpeechPermissions(): Promise<boolean> {
  const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return result.granted;
}

/**
 * Transcribe an audio file using the device's speech recognition
 * 
 * Note: File-based transcription has limited support on iOS Simulator.
 * For simulator testing, consider using live transcription instead.
 * 
 * @param audioUri - The file URI of the audio to transcribe
 * @returns The transcription result
 */
export async function transcribeAudioFile(audioUri: string): Promise<TranscriptionResult> {
  return new Promise((resolve, reject) => {
    let finalTranscript = '';
    let confidence: number | undefined;
    let hasReceivedResult = false;

    // Set up event listeners
    const resultListener = ExpoSpeechRecognitionModule.addListener('result', (event) => {
      // Accumulate results - on Android, we may get multiple final results
      if (event.isFinal) {
        const result = event.results[0];
        if (result) {
          finalTranscript += (finalTranscript ? ' ' : '') + result.transcript;
          confidence = result.confidence;
          hasReceivedResult = true;
        }
      }
    });

    const errorListener = ExpoSpeechRecognitionModule.addListener('error', (event) => {
      cleanup();
      // If no speech was detected, return empty transcript instead of error
      if (event.error === 'no-speech') {
        resolve({ transcript: '', confidence: 0 });
      } else if (event.error === 'network' && isSimulator) {
        // Simulator-specific error - provide helpful message
        console.warn('Speech recognition failed on simulator. This is expected - file transcription works best on real devices.');
        reject(new Error('Speech recognition is limited on iOS Simulator. Please test on a real device, or use live transcription mode.'));
      } else {
        reject(new Error(`Speech recognition error: ${event.error} - ${event.message}`));
      }
    });

    const endListener = ExpoSpeechRecognitionModule.addListener('end', () => {
      cleanup();
      resolve({
        transcript: finalTranscript.trim(),
        confidence,
      });
    });

    const cleanup = () => {
      resultListener.remove();
      errorListener.remove();
      endListener.remove();
    };

    // Start transcription from file
    // Note: requiresOnDeviceRecognition must be false on simulator
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: false, // We only want final results for file transcription
      // On-device recognition doesn't work well on simulator
      requiresOnDeviceRecognition: Platform.OS === 'ios' && !isSimulator,
      audioSource: {
        uri: audioUri,
        // Android-specific audio format settings
        audioChannels: 1,
        audioEncoding: AudioEncodingAndroid.ENCODING_PCM_16BIT,
        sampleRate: 16000,
      },
    });
  });
}

/**
 * Start live speech recognition (real-time transcription while speaking)
 * This is more reliable on iOS Simulator than file-based transcription.
 * 
 * @param onResult - Callback for transcription results
 * @param onError - Callback for errors
 * @returns Function to stop recognition
 */
export function startLiveTranscription(
  onResult: (result: TranscriptionResult, isFinal: boolean) => void,
  onError: (error: Error) => void
): () => void {
  const resultListener = ExpoSpeechRecognitionModule.addListener('result', (event) => {
    const result = event.results[0];
    if (result) {
      onResult(
        { transcript: result.transcript, confidence: result.confidence },
        event.isFinal
      );
    }
  });

  const errorListener = ExpoSpeechRecognitionModule.addListener('error', (event) => {
    if (event.error !== 'no-speech') {
      onError(new Error(`Speech recognition error: ${event.error} - ${event.message}`));
    }
  });

  // Start live recognition
  ExpoSpeechRecognitionModule.start({
    lang: 'en-US',
    interimResults: true, // Get real-time results
    continuous: true, // Keep listening
    requiresOnDeviceRecognition: false, // Use network for reliability
  });

  // Return cleanup function
  return () => {
    ExpoSpeechRecognitionModule.stop();
    resultListener.remove();
    errorListener.remove();
  };
}

/**
 * Stop any ongoing speech recognition
 */
export function stopSpeechRecognition(): void {
  ExpoSpeechRecognitionModule.stop();
}

/**
 * Initialize speech recognition (check availability and request permissions)
 */
export async function initializeSpeechRecognition(): Promise<boolean> {
  if (!isSpeechRecognitionAvailable()) {
    console.warn('Speech recognition is not available on this device');
    return false;
  }

  const hasPermission = await requestSpeechPermissions();
  if (!hasPermission) {
    console.warn('Speech recognition permissions not granted');
    return false;
  }

  return true;
}
