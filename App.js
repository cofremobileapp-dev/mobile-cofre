import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { StoriesProvider } from './src/contexts/StoriesContext';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/NotificationService';
import { apiService } from './src/services/ApiService';

// ErrorBoundary catches uncaught JS errors and prevents the app from crashing
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.title}>Oops! Something went wrong</Text>
          <Text style={ebStyles.subtitle}>The app ran into an unexpected error.</Text>
          <TouchableOpacity
            style={ebStyles.button}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={ebStyles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#4CAF50', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
