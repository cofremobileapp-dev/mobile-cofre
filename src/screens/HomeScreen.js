import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import VideoItem from '../components/VideoItem';

const HomeScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('inspirasi');
  const flatListRef = useRef(null);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  // Screen focus state for auto-pause video feature
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  // Auto-pause videos when navigating away from Home screen
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);

      const refreshOnFocus = async () => {
        setIsRefreshing(true);
        try {
          await loadVideos(1);
          checkUnreadNotifications();
        } catch (error) {
          // Silently handle refresh errors
        } finally {
          setIsRefreshing(false);
        }
      };

      refreshOnFocus();

      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

  // Reload videos when tab changes
  useEffect(() => {
    if (activeTab) {
      setIsLoading(true);
      setVideos([]);
      loadVideos(1);
    }
  }, [activeTab]);

  // Handle navigation from search with videoId
  useEffect(() => {
    if (route.params?.videoId && videos.length > 0) {
      const videoIndex = videos.findIndex(v => v.id === route.params.videoId);
      if (videoIndex !== -1 && flatListRef.current) {
        const timeout = setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: videoIndex,
            animated: true,
          });
          setCurrentIndex(videoIndex);
        }, 100);
        return () => clearTimeout(timeout);
      }
    }
  }, [route.params?.videoId, videos]);

  const checkUnreadNotifications = async () => {
    try {
      const response = await apiService.getNotifications();
      const notifications = response.data?.data || response.data || [];
      const hasUnread = notifications.some(n => !n.is_read);
      setHasUnreadNotifications(hasUnread);
    } catch (error) {
      // Silently handle notification check errors
    }
  };

  const loadVideos = async (page = 1) => {
    try {
      console.log('📹 [HomeScreen] Loading videos, page:', page, 'tab:', activeTab);

      const response = activeTab === 'mengikuti'
        ? await apiService.getFollowingVideos(page)
        : await apiService.getVideos(page);

      console.log('📹 [HomeScreen] API Response:', JSON.stringify(response.data).substring(0, 200));

      const newVideos = response.data.data || response.data || [];

      console.log('📹 [HomeScreen] Loaded', newVideos.length, 'videos');

      if (page === 1) {
        setVideos(newVideos);
      } else {
        setVideos(prev => [...prev, ...newVideos]);
      }

      setHasMore(response.data.next_page_url !== null);
      setCurrentPage(page);
    } catch (error) {
      console.error('❌ [HomeScreen] Error loading videos:', error.message);
      console.error('❌ [HomeScreen] Error details:', JSON.stringify({
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
      }));

      if (error.response?.status === 401) {
        Alert.alert(t('sessionExpired'), t('pleaseLoginAgain'));
      } else if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        Alert.alert(t('timeout'), t('serverNotResponding'));
      } else {
        // Don't show error on initial load, just log it
        console.log('📹 [HomeScreen] Silent error, videos:', videos.length);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreVideos = () => {
    if (!isLoading && hasMore) {
      loadVideos(currentPage + 1);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    try {
      await loadVideos(1);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleVideoError = useCallback(async (videoId, videoUrl) => {
    try {
      const isBrokenUrl = videoUrl.includes('s3.amazonaws.com') || videoUrl.includes('localhost');
      if (isBrokenUrl) {
        setVideos(prevVideos => prevVideos.filter(v => v.id !== videoId));
      }
    } catch (error) {
      // Silently handle video error
    }
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  if (isLoading && videos.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.primary }]}>{t('loading')}</Text>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary }]}>
          <Ionicons name="videocam" size={64} color={colors.textInverse} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.primary }]}>{t('noVideos')}</Text>
        <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
          {t('noApprovedVideos')}{'\n'}
          {t('beFirstToUpload')}
        </Text>
        <TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.primary }]} onPress={handleRefresh}>
          <Ionicons name="refresh" size={20} color={colors.textInverse} />
          <Text style={styles.refreshButtonText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Search Icon - Top Left */}
      <TouchableOpacity
        style={styles.searchButton}
        onPress={() => navigation.navigate('Search')}
      >
        <Ionicons name="search" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Notification Icon - Top Right */}
      <TouchableOpacity
        style={styles.notificationButton}
        onPress={() => {
          setHasUnreadNotifications(false);
          navigation.navigate('Notifications');
        }}
      >
        <Ionicons name="notifications" size={26} color="#FFFFFF" />
        {hasUnreadNotifications && (
          <View style={styles.notificationBadge}>
            <View style={styles.notificationDot} />
          </View>
        )}
      </TouchableOpacity>

      {/* Cofre Logo - Top Center */}
      <View style={styles.topLogo}>
        <Image
          source={require('../../assets/logo-menu.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={({ item, index }) => (
          <VideoItem
            item={item}
            isActive={index === currentIndex}
            currentUserId={user?.id}
            currentUser={user}
            navigation={navigation}
            currentIndex={index}
            totalVideos={videos.length}
            onVideoError={handleVideoError}
            isScreenFocused={isScreenFocused}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={loadMoreVideos}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#FFFFFF"
            colors={[colors.primary, '#FFD700']}
            progressBackgroundColor={colors.card}
            title={t('loading')}
            titleColor="#FFFFFF"
          />
        }
        ListFooterComponent={
          isLoading && !isRefreshing ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />

      {/* Loading Overlay - shown when refreshing */}
      {isRefreshing && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingOverlayText, { color: colors.primary }]}>{t('loading')}</Text>
          </View>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  searchButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 1001,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 1001,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B5C',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  topLogo: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  logoImage: {
    width: 100,
    height: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    borderRadius: 64,
    width: 128,
    height: 128,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  refreshButton: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  footerLoader: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingCard: {
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingOverlayText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default HomeScreen;
