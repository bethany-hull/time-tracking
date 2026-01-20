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

export function SettingsScreen() {
  const { settings, loading, refresh } = useSettings();
  
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationInterval, setNotificationInterval] = useState('30');

  useEffect(() => {
    if (settings) {
      setNotificationEnabled(settings.notificationEnabled);
      setNotificationInterval(settings.notificationInterval.toString());
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
      await scheduleRecurringNotification();
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
      await scheduleRecurringNotification();
    }
    
    refresh();
    Alert.alert('Saved', `Notification interval set to ${interval} minutes`);
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
        </View>

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
