import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform, Text } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { initDatabase } from './src/database';
import AppNavigator from './src/navigation/AppNavigator';

// Import sync engine and notification service for native platforms
let syncEngine, notificationService;
if (Platform.OS !== 'web') {
  try {
    syncEngine = require('./src/services/syncEngine').syncEngine;
    notificationService = require('./src/services/notificationService').notificationService;
  } catch (e) {
    console.warn('Sync engine not available:', e);
  }
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');

  useEffect(() => {
    initializeApp();

    // Cleanup on unmount
    return () => {
      if (Platform.OS !== 'web') {
        syncEngine?.stop();
        notificationService?.cleanup();
      }
    };
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing app...');

      // 1. Initialize database
      setLoadingMessage('Setting up database...');
      await initDatabase();
      console.log('✅ Database initialized');

      // 2. Start sync engine (native platforms only)
      if (Platform.OS !== 'web' && syncEngine) {
        setLoadingMessage('Starting sync engine...');
        await syncEngine.start();
        console.log('✅ Sync engine started');
      }

      // Note: Notification service will be initialized after login
      // because it needs userId and userRole

      setLoadingMessage('Ready!');
      setIsReady(true);
      console.log('🎉 App initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      setIsReady(true); // Continue anyway to let user see error
    }
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="light" />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
