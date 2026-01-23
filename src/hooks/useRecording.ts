import { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioRecording } from './useAudioRecording';
import { transcribeAudioFile, initializeSpeechRecognition } from '../services/speechRecognition';
import { categorizeTranscript } from '../services/gemini';
import { createEntry, updateEntry } from '../database/entries';
import { getAllSettings, updateSettings } from '../database/settings';

export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'categorizing' | 'error';

interface UseRecordingResult {
  state: RecordingState;
  duration: number;
  error: string | null;
  startRecord: () => Promise<void>;
  stopRecord: () => Promise<void>;
  cancelRecord: () => Promise<void>;
}

export function useRecording(onComplete?: () => void): UseRecordingResult {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationRef = useRef<number>(60);
  const notificationIntervalRef = useRef<number>(30);
  const lastCheckInTimeRef = useRef<number | null>(null);
  const [localDuration, setLocalDuration] = useState(0);
  
  // Use the hook-based audio recording
  const audioRecording = useAudioRecording();

  // Initialize speech recognition on mount
  useEffect(() => {
    initializeSpeechRecognition().catch(console.error);
  }, []);

  // Load settings
  useEffect(() => {
    getAllSettings().then((settings) => {
      maxDurationRef.current = settings.maxRecordingDuration;
      notificationIntervalRef.current = settings.notificationInterval;
      lastCheckInTimeRef.current = settings.lastCheckInTime;
    });
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecord = useCallback(async () => {
    try {
      setError(null);
      setState('recording');
      setLocalDuration(0);

      await audioRecording.startRecording();

      // Start duration timer
      timerRef.current = setInterval(() => {
        setLocalDuration((prev) => {
          const newDuration = prev + 1;
          // Auto-stop at max duration
          if (newDuration >= maxDurationRef.current) {
            stopRecord();
          }
          return newDuration;
        });
      }, 1000);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  }, [audioRecording]);

  const stopRecord = useCallback(async () => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      setState('transcribing');
      
      const result = await audioRecording.stopRecording();
      
      if (!result) {
        throw new Error('No recording data');
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const recordedAt = currentTime;

      // Calculate elapsed time since last check-in
      // If no last check-in, use the notification interval as default
      let elapsedMinutes: number;
      if (lastCheckInTimeRef.current) {
        elapsedMinutes = Math.round((currentTime - lastCheckInTimeRef.current) / 60);
        // Ensure at least 1 minute
        elapsedMinutes = Math.max(1, elapsedMinutes);
      } else {
        // First check-in ever, use notification interval as default
        elapsedMinutes = notificationIntervalRef.current;
      }

      // Step 1: Transcribe with on-device speech recognition (FREE!)
      let transcript = '';
      try {
        const transcriptionResult = await transcribeAudioFile(result.uri);
        transcript = transcriptionResult.transcript;
      } catch (transcriptionError) {
        console.error('Transcription failed:', transcriptionError);
        // Create a single entry without transcript
        await createEntry({
          recorded_at: recordedAt,
          duration: elapsedMinutes, // Duration in minutes
          audio_uri: result.uri,
        });
        // Update last check-in time
        await updateSettings({ lastCheckInTime: currentTime });
        lastCheckInTimeRef.current = currentTime;
        setError('Transcription failed. Entry saved without transcript.');
        setState('idle');
        onComplete?.();
        return;
      }

      // Step 2: Categorize with Gemini - may return multiple activities
      setState('categorizing');
      try {
        const categorized = await categorizeTranscript(
          transcript,
          elapsedMinutes
        );
        
        // Create an entry for each activity
        for (const activity of categorized.activities) {
          await createEntry({
            recorded_at: recordedAt,
            duration: activity.duration, // Duration in minutes
            transcript: transcript, // Same transcript for all (it's the source)
            summary: activity.summary,
            category_id: activity.category,
            tags: activity.tags,
            audio_uri: result.uri, // Same audio for all
          });
          // Mark as processed during creation
          // Note: We create separate entries for each activity
        }
      } catch (geminiError) {
        // Fallback: save as single uncategorized entry
        console.error('Gemini categorization failed:', geminiError);
        await createEntry({
          recorded_at: recordedAt,
          duration: elapsedMinutes, // Duration in minutes
          transcript: transcript,
          audio_uri: result.uri,
        });
        setError('Recording saved but categorization failed.');
      }

      // Update last check-in time after successful recording
      await updateSettings({ lastCheckInTime: currentTime });
      lastCheckInTimeRef.current = currentTime;

      setState('idle');
      setLocalDuration(0);
      onComplete?.();
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
    }
  }, [audioRecording, onComplete]);

  const cancelRecord = useCallback(async () => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      await audioRecording.cancelRecording();
      setState('idle');
      setLocalDuration(0);
      setError(null);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to cancel recording');
    }
  }, [audioRecording]);

  // Use either our timer or the recorder's duration
  const duration = audioRecording.isRecording ? audioRecording.duration : localDuration;

  return {
    state,
    duration,
    error: error || audioRecording.error,
    startRecord,
    stopRecord,
    cancelRecord,
  };
}
