/**
 * Hook-based Audio Recording Manager
 * Uses expo-audio's useAudioRecorder for proper lifecycle management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from 'expo-audio';
import {
  getInfoAsync,
  makeDirectoryAsync,
  moveAsync,
  deleteAsync,
} from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system';
import { generateId } from '../utils/helpers';

export interface RecordingResult {
  uri: string;
  duration: number; // in seconds
}

// Custom recording preset optimized for speech recognition
// 16kHz mono is ideal for speech-to-text services
const SPEECH_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    outputFormat: 'lpcm', // Linear PCM for WAV
    sampleRate: 16000,
    numberOfChannels: 1,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    sampleRate: 16000,
  },
};

interface UseAudioRecordingResult {
  isRecording: boolean;
  isPrepared: boolean;
  duration: number;
  error: string | null;
  hasPermission: boolean | null;
  requestPermission: () => Promise<boolean>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingResult | null>;
  cancelRecording: () => Promise<void>;
}

export function useAudioRecording(): UseAudioRecordingResult {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPrepared, setIsPrepared] = useState(false);
  
  const recordingStartTime = useRef<number | null>(null);
  
  // Use expo-audio's hook for recording
  const audioRecorder = useAudioRecorder(SPEECH_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(audioRecorder);

  // Check permissions on mount
  useEffect(() => {
    AudioModule.getRecordingPermissionsAsync().then((status) => {
      setHasPermission(status.granted);
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setHasPermission(status.granted);
      return status.granted;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permission');
      return false;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      // Check permission
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('Microphone permission not granted');
        }
      }

      // Configure audio mode for recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Prepare and start recording
      await audioRecorder.prepareToRecordAsync();
      setIsPrepared(true);
      
      audioRecorder.record();
      recordingStartTime.current = Date.now();
      
      console.log('Recording started');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      throw err;
    }
  }, [audioRecorder, hasPermission, requestPermission]);

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    if (!recorderState.isRecording && !isPrepared) {
      console.log('No active recording to stop');
      return null;
    }

    try {
      await audioRecorder.stop();
      setIsPrepared(false);

      const duration = recordingStartTime.current 
        ? Math.round((Date.now() - recordingStartTime.current) / 1000)
        : Math.round(recorderState.durationMillis / 1000);
      
      recordingStartTime.current = null;

      const uri = audioRecorder.uri;
      if (!uri) {
        throw new Error('Recording URI is null');
      }

      // Move to permanent location
      const permanentUri = await saveRecording(uri);

      console.log('Recording stopped, saved to:', permanentUri);

      return {
        uri: permanentUri,
        duration,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      throw err;
    }
  }, [audioRecorder, recorderState.isRecording, recorderState.durationMillis, isPrepared]);

  const cancelRecording = useCallback(async (): Promise<void> => {
    if (!recorderState.isRecording && !isPrepared) {
      return;
    }

    try {
      await audioRecorder.stop();
      setIsPrepared(false);
      recordingStartTime.current = null;

      // Delete the temporary file
      const uri = audioRecorder.uri;
      if (uri) {
        await deleteAsync(uri, { idempotent: true });
      }

      console.log('Recording cancelled');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel recording');
    }
  }, [audioRecorder, recorderState.isRecording, isPrepared]);

  return {
    isRecording: recorderState.isRecording,
    isPrepared,
    duration: Math.round(recorderState.durationMillis / 1000),
    error,
    hasPermission,
    requestPermission,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

// Helper function to save recording to permanent storage
async function saveRecording(tempUri: string): Promise<string> {
  const recordingsDir = `${Paths.document.uri}recordings/`;

  // Ensure directory exists
  const dirInfo = await getInfoAsync(recordingsDir);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(recordingsDir, { intermediates: true });
  }

  const fileName = `recording_${generateId()}.wav`;
  const permanentUri = `${recordingsDir}${fileName}`;

  await moveAsync({
    from: tempUri,
    to: permanentUri,
  });

  return permanentUri;
}

// Utility function to delete a recording file
export async function deleteRecordingFile(uri: string): Promise<void> {
  try {
    await deleteAsync(uri, { idempotent: true });
  } catch (error) {
    console.error('Failed to delete recording file:', error);
  }
}

// Utility function to get recording file size
export async function getRecordingFileSize(uri: string): Promise<number> {
  const fileInfo = await getInfoAsync(uri);
  return (fileInfo as any).size || 0;
}
