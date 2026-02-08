import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/NotificationService';

// Inner component that has access to AuthContext
function AppContent() {
  const navigationRef = useRef();
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

  const cleanupRef = useRef(null);

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
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
