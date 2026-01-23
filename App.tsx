import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AudioModule } from 'expo-audio';
import { AppNavigator } from './src/navigation';
import { useDatabase } from './src/hooks/useDatabase';
import {
  requestNotificationPermissions,
  scheduleRecurringNotification,
  addNotificationResponseListener,
} from './src/services/notifications';
import { seedDummyData } from './src/database/seed';

export default function App() {
  const { isReady, error } = useDatabase();
  const [permissionsReady, setPermissionsReady] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        console.log('[App] Starting setup...');
        await AudioModule.requestRecordingPermissionsAsync();
        console.log('[App] Audio permissions done');
        await requestNotificationPermissions();
        console.log('[App] Notification permissions done');
        await scheduleRecurringNotification();
        console.log('[App] Notifications scheduled');
        
        // Seed dummy data for testing (only if needed, not forcing every time)
        // await seedDummyData(true);
        // console.log('[App] Seed data done');
        
        setPermissionsReady(true);
        console.log('[App] Setup complete');
      } catch (err) {
        console.error('[App] Setup error:', err);
        // Still mark as ready so app doesn't hang
        setPermissionsReady(true);
      }
    }

    if (isReady) {
      setup();
    }
  }, [isReady]);

  // Handle notification taps
  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const action = response.notification.request.content.data?.action;
      if (action === 'record') {
        // Navigate to home screen to record
        console.log('User tapped record notification');
      }
    });

    return () => subscription.remove();
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to initialize app</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  if (!isReady || !permissionsReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
