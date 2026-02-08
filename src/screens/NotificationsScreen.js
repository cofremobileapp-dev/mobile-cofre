import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../services/ApiService';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const {
    notifications: contextNotifications,
    unreadCount,
    isLoading: contextLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    lastFetchTime,
  } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use context notifications
  useEffect(() => {
    setNotifications(contextNotifications);
    setIsLoading(contextLoading);
  }, [contextNotifications, contextLoading]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      await fetchNotifications();
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Fallback to sample data if API fails
      setNotifications(getSampleNotifications());
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchNotifications();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchNotifications]);

  const handleNotificationPress = async (notification) => {
    try {
      // Mark as read first
      if (!notification.is_read && !notification.isRead) {
        await markAsRead(notification.id);
      }

      // Navigate based on notification type
      const fromUserId = notification.from_user_id || notification.userId;
      const videoId = notification.video_id || notification.videoId;

      switch (notification.type) {
        case 'like':
          // Redirect to profile of user who liked
          if (fromUserId) {
            navigation.navigate('OtherUserProfile', { userId: fromUserId });
          }
          break;

        case 'comment':
          // Redirect to profile of user who commented
          if (fromUserId) {
            navigation.navigate('OtherUserProfile', { userId: fromUserId });
          }
          break;

        case 'follow':
          // Redirect to profile of user who followed
          if (fromUserId) {
            navigation.navigate('OtherUserProfile', { userId: fromUserId });
          }
          break;

        case 'share':
        case 'repost':
          // Redirect to profile of user who shared/reposted
          if (fromUserId) {
            navigation.navigate('OtherUserProfile', { userId: fromUserId });
          }
          break;

        case 'mention':
          // Redirect to the video where user was mentioned
          if (videoId) {
            // Navigate to video detail or user profile
            navigation.navigate('OtherUserProfile', { userId: fromUserId });
          }
          break;

        default:
          // For unknown types, try to navigate to user profile
          if (fromUserId) {
            navigation.navigate('OtherUserProfile', { userId: fromUserId });
          }
          break;
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleFollow = async (userId) => {
    // Safety check: ensure userId is valid
    if (!userId || userId === 'undefined') {
      console.warn('Invalid userId for follow action');
      return;
    }

    try {
      await apiService.toggleFollow(userId);
      // Optionally reload notifications or update UI
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const getSampleNotifications = () => [
    {
      id: 1,
      type: 'follow',
      user: 'chefmuda.bdg',
      userId: 1, // Added userId field
      message: 'mulai mengikuti Anda',
      time: '2 menit lalu',
      isRead: false,
    },
    {
      id: 2,
      type: 'like',
      user: 'pedaslovers',
      userId: 2,
      message: 'menyukai video Anda',
      time: '5 menit lalu',
      hasVideo: true,
      isRead: false,
    },
    {
      id: 3,
      type: 'comment',
      user: 'foodiebandung',
      userId: 3,
      message: 'mengomentari: "Wah pedesnya mantap banget! 🔥"',
      time: '12 menit lalu',
      hasVideo: true,
      isRead: true,
    },
    {
      id: 4,
      type: 'share',
      user: 'makananenak.jkt',
      userId: 4,
      message: 'membagikan video Anda',
      time: '1 jam lalu',
      hasVideo: true,
      isRead: true,
    },
    {
      id: 5,
      type: 'like',
      user: 'kulinerjakarta',
      userId: 5,
      message: 'menyukai video Anda',
      time: '2 jam lalu',
      hasVideo: true,
      isRead: true,
    },
    {
      id: 6,
      type: 'follow',
      user: 'resepnusantara',
      userId: 6,
      message: 'mulai mengikuti Anda',
      time: '3 jam lalu',
      isRead: true,
    },
    {
      id: 7,
      type: 'comment',
      user: 'pecandamakanan',
      userId: 7,
      message: 'mengomentari: "Pengen cobain nih!"',
      time: '5 jam lalu',
      hasVideo: true,
      isRead: true,
    },
    {
      id: 8,
      type: 'share',
      user: 'foodvlogger',
      userId: 8,
      message: 'membagikan video Anda',
      time: '1 hari lalu',
      hasVideo: true,
      isRead: true,
    },
  ];

  const getNotificationIcon = (type) => {
    let iconName, bgColor;

    switch (type) {
      case 'follow':
        iconName = 'person-add';
        bgColor = '#06402B';
        break;
      case 'like':
        iconName = 'heart';
        bgColor = '#FF3B5C';
        break;
      case 'comment':
        iconName = 'chatbubble';
        bgColor = '#3B82F6';
        break;
      case 'share':
        iconName = 'share-social';
        bgColor = '#8B5CF6';
        break;
      default:
        iconName = 'person';
        bgColor = '#06402B';
    }

    return (
      <View style={[styles.notificationIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={iconName} size={20} color="#FFFFFF" />
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifikasi</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000000" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06402B" />
          <Text style={styles.loadingText}>Memuat notifikasi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifikasi</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#06402B']}
              tintColor="#06402B"
            />
          }
        >
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                !notification.isRead && !notification.is_read && styles.unreadNotification
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              {/* Profile Icon */}
              {getNotificationIcon(notification.type)}

              {/* Notification Content */}
              <View style={styles.notificationContent}>
                <View style={styles.notificationText}>
                  <Text style={styles.notificationUser}>{notification.user}</Text>
                  <Text style={styles.notificationMessage}> {notification.message}</Text>
                </View>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </View>

              {/* Right Action */}
              {notification.type === 'follow' && (!notification.isRead && !notification.is_read) && (
                <TouchableOpacity
                  style={styles.followButton}
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent notification press
                    const userId = notification.from_user_id || notification.userId;
                    handleFollow(userId);
                  }}
                >
                  <Text style={styles.followButtonText}>Ikuti Balik</Text>
                </TouchableOpacity>
              )}

              {notification.hasVideo && (
                <View style={styles.videoThumbnail}>
                  <Ionicons name="restaurant" size={20} color="#06402B" />
                </View>
              )}

              {/* Unread Indicator */}
              {(!notification.isRead && !notification.is_read) && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="notifications-outline" size={64} color="#06402B" />
          </View>
          <Text style={styles.emptyTitle}>Belum Ada Notifikasi</Text>
          <Text style={styles.emptyDescription}>
            Notifikasi tentang likes, komentar, dan followers{'\n'}akan muncul di sini
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    width: 40,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    alignItems: 'flex-end',
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  unreadNotification: {
    backgroundColor: '#E8F5E9',
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationText: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  notificationUser: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '400',
  },
  notificationTime: {
    fontSize: 12,
    color: '#666666',
  },
  followButton: {
    backgroundColor: '#06402B',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  videoThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#06402B',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default NotificationsScreen;
