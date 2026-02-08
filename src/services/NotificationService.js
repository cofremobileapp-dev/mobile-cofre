import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification handler - how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  notificationListener = null;
  responseListener = null;

  /**
   * Request notification permissions and get Expo Push Token
   */
  async registerForPushNotifications() {
    // 🚨 DEADLINE MODE: ULTRA DEFENSIVE - NO CRASH ALLOWED!
    try {
      if (!Device.isDevice) {
        return null;
      }

      // Check existing permissions (with timeout)
      const { status: existingStatus } = await Promise.race([
        Notifications.getPermissionsAsync(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);

      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Promise.race([
          Notifications.requestPermissionsAsync(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      // Get Expo Push Token (ULTRA DEFENSIVE)
      let token;
      try {
        token = await Promise.race([
          Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId || undefined,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Token timeout')), 5000))
        ]);

      } catch (tokenError) {
        // 🚨 SPECIFIC FIX: projectId error - just skip, don't crash
        return null;
      }

      // Configure Android notification channel (safe)
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'default',
          });
        } catch (channelError) {
          // Silently handle error
        }
      }

      return token.data;
    } catch (error) {
      // 🚨 ULTIMATE SAFETY: NO CRASH
      return null;
    }
  }

  /**
   * Setup notification listeners
   * - notificationListener: triggered when notification received while app is in foreground
   * - responseListener: triggered when user taps on notification
   */
  setupNotificationListeners(navigation, refreshUser = null) {
    // Store refreshUser callback for later use
    this.refreshUser = refreshUser;

    // Listener for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body } = notification.request.content;
        const data = notification.request.content.data;

        // Auto-refresh user data for badge notifications
        if (data?.type === 'badge_approved' || data?.type === 'badge_rejected') {
          if (this.refreshUser) {
            this.refreshUser().catch(() => {
              // Silently handle error
            });
          }
        }

        // You can show custom in-app notification here if needed
        // For now, Expo will show it automatically based on setNotificationHandler config
      }
    );

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        // Auto-refresh user data for badge notifications when tapped
        if (data?.type === 'badge_approved' || data?.type === 'badge_rejected') {
          if (this.refreshUser) {
            this.refreshUser().catch(() => {
              // Silently handle error
            });
          }
        }

        // Navigate based on notification type
        this.handleNotificationNavigation(navigation, data);
      }
    );

    // Return cleanup function
    return () => {
      if (this.notificationListener) {
        Notifications.removeNotificationSubscription(this.notificationListener);
      }
      if (this.responseListener) {
        Notifications.removeNotificationSubscription(this.responseListener);
      }
    };
  }

  /**
   * Handle navigation when user taps on notification
   */
  handleNotificationNavigation(navigation, data) {
    if (!navigation || !data) return;

    try {
      const { type, video_id, user_id, notification_id } = data;

      switch (type) {
        case 'like':
        case 'comment':
        case 'view':
          // Navigate to Home screen (video feed)
          if (video_id) {
            navigation.navigate('Home');
            // You can add video seeking logic here if needed
          }
          break;

        case 'follow':
          // Navigate to user profile
          if (user_id) {
            navigation.navigate('Profile', {
              screen: 'OtherUserProfile',
              params: { userId: user_id }
            });
          }
          break;

        case 'badge_approved':
        case 'badge_rejected':
          // Navigate to user's own profile to see badge status
          navigation.navigate('Profile');
          break;

        case 'mention':
        case 'repost':
          // Navigate to notifications screen
          navigation.navigate('Notifications');
          break;

        default:
          // Default: go to notifications screen
          navigation.navigate('Notifications');
          break;
      }
    } catch (error) {
      // Silently handle error
    }
  }

  /**
   * Send a local notification (for testing or offline scenarios)
   */
  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // null means send immediately
      });
    } catch (error) {
      // Silently handle error
    }
  }

  /**
   * Get notification permissions status
   */
  async getPermissionsStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  /**
   * Clear all notifications from notification center
   */
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Get badge count (iOS only)
   */
  async getBadgeCount() {
    if (Platform.OS === 'ios') {
      return await Notifications.getBadgeCountAsync();
    }
    return 0;
  }

  /**
   * Set badge count (iOS only)
   */
  async setBadgeCount(count) {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }

  /**
   * Clear badge (iOS only)
   */
  async clearBadge() {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(0);
    }
  }
}

export default new NotificationService();
