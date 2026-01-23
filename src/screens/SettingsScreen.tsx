import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../hooks/useDatabase';
import { updateSettings } from '../database/settings';
import {
  requestNotificationPermissions,
  scheduleRecurringNotification,
  cancelAllNotifications,
} from '../services/notifications';
import { CategoryManager } from '../components/CategoryManager';

// Helper to format hour to 12-hour time
const formatHour = (hour: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
};

// Generate hours for picker (0-23)
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function SettingsScreen() {
  const { settings, loading, refresh } = useSettings();
  
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationInterval, setNotificationInterval] = useState('30');
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(21);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (settings) {
      setNotificationEnabled(settings.notificationEnabled);
      setNotificationInterval(settings.notificationInterval.toString());
      setStartHour(settings.notificationStartHour);
      setEndHour(settings.notificationEndHour);
    }
  }, [settings]);

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationEnabled(value);
    
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
        setNotificationEnabled(false);
        return;
      }
      await scheduleRecurringNotification(true); // Force reschedule when toggling on
    } else {
      await cancelAllNotifications();
    }
    
    await updateSettings({ notificationEnabled: value });
    refresh();
  };

  const handleIntervalChange = async () => {
    const interval = parseInt(notificationInterval, 10);
    if (isNaN(interval) || interval < 1) {
      Alert.alert('Invalid Value', 'Please enter a valid interval (minimum 1 minute)');
      return;
    }
    
    await updateSettings({ notificationInterval: interval });
    
    if (notificationEnabled) {
      await scheduleRecurringNotification(true); // Force reschedule when interval changes
    }
    
    refresh();
    Alert.alert('Saved', `Notification interval set to ${interval} minutes`);
  };

  const handleStartHourChange = async (hour: number) => {
    if (hour >= endHour) {
      Alert.alert('Invalid Time', 'Start time must be before end time');
      return;
    }
    setStartHour(hour);
    setShowStartPicker(false);
    await updateSettings({ notificationStartHour: hour });
    
    if (notificationEnabled) {
      await scheduleRecurringNotification(true);
    }
    refresh();
  };

  const handleEndHourChange = async (hour: number) => {
    if (hour <= startHour) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }
    setEndHour(hour);
    setShowEndPicker(false);
    await updateSettings({ notificationEndHour: hour });
    
    if (notificationEnabled) {
      await scheduleRecurringNotification(true);
    }
    refresh();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Reminders</Text>
              <Text style={styles.settingDescription}>
                Receive periodic reminders to log your time
              </Text>
            </View>
            <Switch
              value={notificationEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
              thumbColor={notificationEnabled ? '#6366f1' : '#f4f4f5'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Reminder Interval</Text>
              <Text style={styles.settingDescription}>Minutes between reminders</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={notificationInterval}
                onChangeText={setNotificationInterval}
                keyboardType="number-pad"
                onBlur={handleIntervalChange}
              />
              <Text style={styles.inputSuffix}>min</Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Active Hours</Text>
              <Text style={styles.settingDescription}>
                Only send notifications during these hours
              </Text>
            </View>
          </View>
          
          <View style={styles.timeRow}>
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.timeLabel}>Start</Text>
              <Text style={styles.timeValue}>{formatHour(startHour)}</Text>
            </TouchableOpacity>
            
            <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
            
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.timeLabel}>End</Text>
              <Text style={styles.timeValue}>{formatHour(endHour)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Time Picker Modals */}
        <Modal
          visible={showStartPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStartPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setShowStartPicker(false)}
            />
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Start Time</Text>
              <ScrollView 
                style={styles.pickerScroll}
                showsVerticalScrollIndicator={true}
              >
                {HOURS.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.pickerItem,
                      hour === startHour && styles.pickerItemSelected,
                      hour >= endHour && styles.pickerItemDisabled,
                    ]}
                    onPress={() => handleStartHourChange(hour)}
                    disabled={hour >= endHour}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      hour === startHour && styles.pickerItemTextSelected,
                      hour >= endHour && styles.pickerItemTextDisabled,
                    ]}>
                      {formatHour(hour)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity 
                style={styles.pickerCloseButton}
                onPress={() => setShowStartPicker(false)}
              >
                <Text style={styles.pickerCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showEndPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEndPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setShowEndPicker(false)}
            />
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>End Time</Text>
              <ScrollView 
                style={styles.pickerScroll}
                showsVerticalScrollIndicator={true}
              >
                {HOURS.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.pickerItem,
                      hour === endHour && styles.pickerItemSelected,
                      hour <= startHour && styles.pickerItemDisabled,
                    ]}
                    onPress={() => handleEndHourChange(hour)}
                    disabled={hour <= startHour}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      hour === endHour && styles.pickerItemTextSelected,
                      hour <= startHour && styles.pickerItemTextDisabled,
                    ]}>
                      {formatHour(hour)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity 
                style={styles.pickerCloseButton}
                onPress={() => setShowEndPicker(false)}
              >
                <Text style={styles.pickerCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Categories Section */}
        <CategoryManager />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  settingDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
    color: '#1f2937',
  },
  inputSuffix: {
    fontSize: 14,
    color: '#6b7280',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    gap: 16,
  },
  timeButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '80%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerScroll: {
    flexGrow: 0,
  },
  pickerCloseButton: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  pickerCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerItemSelected: {
    backgroundColor: '#eef2ff',
  },
  pickerItemDisabled: {
    opacity: 0.4,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  pickerItemTextDisabled: {
    color: '#9ca3af',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginTop: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  apiKeyContainer: {
    gap: 12,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  apiKeyStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  apiKeyInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
});
