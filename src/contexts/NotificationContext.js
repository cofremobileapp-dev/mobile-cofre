import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { AppState } from 'react-native';
import { apiService } from '../services/ApiService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({});

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const pollingIntervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // Fetch notifications from API
  const fetchNotifications = async (silent = false) => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      if (!silent) {
        setIsLoading(true);
      }

      const response = await apiService.get('/notifications');
      const notifData = response.data.data || [];

      setNotifications(notifData);

      // Count unread notifications
      const unread = notifData.filter(n => !n.is_read).length;
      setUnreadCount(unread);

      setLastFetchTime(new Date());
    } catch (error) {
      // Don't clear notifications on error, keep old data
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await apiService.post(`/notifications/${notificationId}/read`);

      // Update local state immediately
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // Silently handle error
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await apiService.post('/notifications/mark-all-read');

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );

      setUnreadCount(0);
    } catch (error) {
      // Silently handle error
    }
  };

  // Refresh notifications (manual refresh)
  const refreshNotifications = async () => {
    await fetchNotifications(false);
  };

  // Setup polling
  const startPolling = () => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Initial fetch
    fetchNotifications(true);

    // Poll every 30 seconds
    pollingIntervalRef.current = setInterval(() => {
      // Only poll if app is in foreground and user is authenticated
      if (appState.current === 'active' && isAuthenticated) {
        fetchNotifications(true); // Silent fetch
      }
    }, 30000); // 30 seconds
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Start/stop polling based on auth state
  useEffect(() => {
    if (isAuthenticated && user) {
      startPolling();
    } else {
      stopPolling();
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => stopPolling();
  }, [isAuthenticated, user]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground, fetch notifications immediately
        if (isAuthenticated) {
          fetchNotifications(true);
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        lastFetchTime,
        fetchNotifications: refreshNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
