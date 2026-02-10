import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { secureStorage, STORAGE_KEYS } from '../utils/secureStorage';
import { apiService } from '../services/ApiService';
import NotificationService from '../services/NotificationService';
import * as Device from 'expo-device';

const AuthContext = createContext({});

/**
 * Extract human-readable error message from Axios/Laravel error response.
 * Laravel 422 validation returns: { message: "...", errors: { field: ["msg"] } }
 */
const extractErrorMessage = (error, fallback = 'Terjadi kesalahan. Silakan coba lagi.') => {
  const data = error.response?.data;
  if (!data) return fallback;

  // Laravel validation errors (422) — show all field errors
  if (data.errors && typeof data.errors === 'object') {
    const messages = Object.values(data.errors).flat();
    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  // Single message from backend
  if (data.message) return data.message;

  return fallback;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load stored auth data on app startup
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log('🔐 [AuthContext] Loading stored auth...');
      const storedToken = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const storedUser = await secureStorage.getItem(STORAGE_KEYS.USER_DATA);

      console.log('🔐 [AuthContext] Token found:', !!storedToken);
      console.log('🔐 [AuthContext] User found:', !!storedUser);

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log('🔐 [AuthContext] Parsed user:', parsedUser.email || parsedUser.name);
        setToken(storedToken);
        setUser(parsedUser);
        setIsAdmin(parsedUser.role === 'admin' || parsedUser.is_admin === true);
        apiService.setAuthToken(storedToken);
        console.log('🔐 [AuthContext] Auth token set in ApiService');

        // Register for push notifications
        await registerPushNotificationToken();
      } else {
        console.log('🔐 [AuthContext] No stored auth found, user needs to login');
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
      console.log('🔐 [AuthContext] Auth loading complete');
    }
  };

  /**
   * Register device for push notifications
   */
  const registerPushNotificationToken = async () => {
    try {
      // Get push token from Expo
      const pushToken = await NotificationService.registerForPushNotifications();

      if (!pushToken) {
        return;
      }

      // Register token with backend
      const response = await apiService.registerDeviceToken({
        device_token: pushToken,
        device_type: Platform.OS === 'ios' ? 'ios' : 'android',
        device_name: Device.deviceName || `${Platform.OS} Device`,
      });

    } catch (error) {
      // Don't throw error - push notifications are optional
    }
  };

  /**
   * Remove device token from backend (on logout)
   */
  const removePushNotificationToken = async () => {
    try {
      const pushToken = await NotificationService.registerForPushNotifications();

      if (pushToken) {
        await apiService.removeDeviceToken({
          device_token: pushToken,
        });
      }
    } catch (error) {
      // Don't throw error - continue with logout
    }
  };

  const register = async (name, username, email, password, passwordConfirmation) => {
    try {
      const response = await apiService.post('/register', {
        name,
        username,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      const { user: userData, token: authToken } = response.data;

      // Store auth data securely (only access token)
      await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authToken);
      await secureStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      apiService.setAuthToken(authToken);

      setToken(authToken);
      setUser(userData);
      setIsAdmin(userData.role === 'admin' || userData.is_admin === true);

      // Register for push notifications after successful registration
      await registerPushNotificationToken();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error, 'Registrasi gagal. Silakan coba lagi.'),
      };
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 [AuthContext] Attempting login for:', email);
      const response = await apiService.post('/login', {
        email,
        password,
      });

      console.log('🔐 [AuthContext] Login response received');
      const { user: userData, token: authToken } = response.data;

      // Store auth data securely (only access token)
      await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authToken);
      await secureStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      apiService.setAuthToken(authToken);

      setToken(authToken);
      setUser(userData);
      setIsAdmin(userData.role === 'admin' || userData.is_admin === true);
      console.log('✅ [AuthContext] Login successful for:', userData.email || userData.name);

      // Register for push notifications after successful login
      await registerPushNotificationToken();

      return { success: true };
    } catch (error) {
      console.error('❌ [AuthContext] Login failed:', error.message);
      console.error('❌ [AuthContext] Error details:', JSON.stringify({
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
      }));
      return {
        success: false,
        error: extractErrorMessage(error, 'Login gagal. Silakan coba lagi.'),
      };
    }
  };

  const demoLogin = async () => {
    try {
      // Demo user data for offline mode
      const demoUser = {
        id: 'demo-user',
        name: 'Demo User',
        email: 'demo@example.com',
        avatar: null,
        role: 'user',
        is_demo: true,
      };
      const demoToken = 'demo-token-offline';

      // Store demo auth data
      await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, demoToken);
      await secureStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(demoUser));

      setToken(demoToken);
      setUser(demoUser);
      setIsAdmin(false);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Demo login failed',
      };
    }
  };

  const logout = async () => {
    try {
      // Remove push notification token from backend
      await removePushNotificationToken();

      // Clear stored auth data securely
      await secureStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);

      // Clear state
      setToken(null);
      setUser(null);
      setIsAdmin(false);

      // Clear API service auth
      apiService.setAuthToken(null);

    } catch (error) {
      throw error; // Re-throw to let caller handle it
    }
  };

  /**
   * Refresh user data from backend
   * Call this after profile updates to show changes immediately
   */
  const refreshUser = async () => {
    try {
      const response = await apiService.getProfile();
      const userData = response.data.user || response.data;

      setUser(userData);
      setIsAdmin(userData.role === 'admin' || userData.is_admin === true);

      // Update stored user data
      await secureStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to refresh user data',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        isAdmin,
        register,
        login,
        demoLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
