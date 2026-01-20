import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRecording, RecordingState } from '../hooks/useRecording';
import { formatDuration } from '../utils/helpers';

interface RecordButtonProps {
  onRecordingComplete?: () => void;
}

export function RecordButton({ onRecordingComplete }: RecordButtonProps) {
  const { state, duration, error, startRecord, stopRecord, cancelRecord } = useRecording(onRecordingComplete);
  
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (state === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  const handlePress = async () => {
    if (state === 'idle' || state === 'error') {
      await startRecord();
    } else if (state === 'recording') {
      await stopRecord();
    }
  };

  const getButtonStyle = () => {
    switch (state) {
      case 'recording':
        return styles.buttonRecording;
      case 'transcribing':
      case 'categorizing':
        return styles.buttonProcessing;
      case 'error':
        return styles.buttonError;
      default:
        return styles.buttonIdle;
    }
  };

  const getButtonContent = () => {
    switch (state) {
      case 'recording':
        return (
          <>
            <Ionicons name="stop" size={32} color="#fff" />
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </>
        );
      case 'transcribing':
        return (
          <>
            <Ionicons name="hourglass" size={32} color="#fff" />
            <Text style={styles.statusText}>Transcribing...</Text>
          </>
        );
      case 'categorizing':
        return (
          <>
            <Ionicons name="hourglass" size={32} color="#fff" />
            <Text style={styles.statusText}>Categorizing...</Text>
          </>
        );
      case 'error':
        return (
          <>
            <Ionicons name="refresh" size={32} color="#fff" />
            <Text style={styles.statusText}>Retry</Text>
          </>
        );
      default:
        return (
          <>
            <Ionicons name="mic" size={32} color="#fff" />
            <Text style={styles.statusText}>Record</Text>
          </>
        );
    }
  };

  const isProcessing = state === 'transcribing' || state === 'categorizing';

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: state === 'recording' ? pulseAnim : 1 }] }}>
        <TouchableOpacity
          style={[styles.button, getButtonStyle()]}
          onPress={handlePress}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {getButtonContent()}
        </TouchableOpacity>
      </Animated.View>

      {state === 'recording' && (
        <TouchableOpacity style={styles.cancelButton} onPress={cancelRecord}>
          <Ionicons name="close-circle" size={24} color="#6b7280" />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}

      {error && state === 'error' && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonIdle: {
    backgroundColor: '#6366f1',
  },
  buttonRecording: {
    backgroundColor: '#ef4444',
  },
  buttonProcessing: {
    backgroundColor: '#f59e0b',
  },
  buttonError: {
    backgroundColor: '#6b7280',
  },
  durationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: '#6b7280',
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 200,
  },
});
