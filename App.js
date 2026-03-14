import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { StoriesProvider } from './src/contexts/StoriesContext';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/NotificationService';
import { apiService } from './src/services/ApiService';

// Inner component that has access to AuthContext
function AppContent() {
  const navigationRef = useRef();
  const cleanupRef = useRef(null);
  const { refreshUser } = useAuth();

  const onNavigationReady = () => {
    if (navigationRef.current) {
      const cleanup = NotificationService.setupNotificationListeners(
        navigationRef.current,
        refreshUser
      );
      cleanupRef.current = cleanup;
    }
  };

  // Check backend connectivity on app start
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        console.log('🔌 [App] Checking backend connectivity...');
        const result = await apiService.checkHealth();
        if (result.success) {
          console.log('✅ [App] Backend is healthy:', result.data);
        } else {
          console.warn('⚠️ [App] Backend health check failed:', result.error);
        }
      } catch (error) {
        console.error('❌ [App] Backend unreachable:', error.message);
      }
    };

    checkBackendHealth();
  }, []);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return (
    <>
      <AppNavigator ref={navigationRef} onReady={onNavigationReady} />
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <StoriesProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </StoriesProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
