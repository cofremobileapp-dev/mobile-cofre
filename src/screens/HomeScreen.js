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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import VideoItem from '../components/VideoItem';

const HomeScreen = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    loadVideos();
  }, []);

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
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: videoIndex,
            animated: true,
          });
          setCurrentIndex(videoIndex);
        }, 100);
      }
    }
  }, [route.params?.videoId, videos]);

  const checkUnreadNotifications = async () => {
    try {
      const response = await apiService.getNotifications();
      const notifications = response.data?.data || response.data || [];
      const hasUnread = notifications.some(n => !n.read_at);
      setHasUnreadNotifications(hasUnread);
    } catch (error) {
      // Silently handle notification check errors
    }
  };

  const loadVideos = async (page = 1) => {
    try {
      const response = activeTab === 'mengikuti'
        ? await apiService.getFollowingVideos(page)
        : await apiService.getVideos(page);

      const newVideos = response.data.data || [];

      if (page === 1) {
        setVideos(newVideos);
      } else {
        setVideos(prev => [...prev, ...newVideos]);
      }

      setHasMore(response.data.next_page_url !== null);
      setCurrentPage(page);
    } catch (error) {
      if (error.response?.status === 401) {
        Alert.alert('Error', 'Sesi telah berakhir. Silakan login kembali.');
      } else {
        Alert.alert(
          'Error Koneksi',
          'Gagal memuat video.\n\n' +
          'Pastikan backend server berjalan dan koneksi internet Anda stabil.'
        );
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06402B" />
        <Text style={styles.loadingText}>Memuat video...</Text>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="videocam" size={64} color="#FFFFFF" />
        </View>
        <Text style={styles.emptyTitle}>Belum Ada Video</Text>
        <Text style={styles.emptyDescription}>
          Saat ini belum ada video yang disetujui.{'\n'}
          Jadilah yang pertama untuk mengupload video kuliner Anda!
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.refreshButtonText}>Muat Ulang</Text>
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

      {/* Top Tabs - Inspirasi & Mengikuti */}
      <View style={styles.topTabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inspirasi' && styles.activeTab]}
          onPress={() => setActiveTab('inspirasi')}
        >
          <Text style={[styles.tabText, activeTab === 'inspirasi' && styles.activeTabText]}>
            Inspirasi
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mengikuti' && styles.activeTab]}
          onPress={() => setActiveTab('mengikuti')}
        >
          <Text style={[styles.tabText, activeTab === 'mengikuti' && styles.activeTabText]}>
            Mengikuti
          </Text>
        </TouchableOpacity>
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
            colors={['#06402B', '#FFD700']}
            progressBackgroundColor="#FFFFFF"
            title="Memuat ulang..."
            titleColor="#FFFFFF"
          />
        }
        ListFooterComponent={
          isLoading && !isRefreshing ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#06402B" />
            </View>
          ) : null
        }
      />

      {/* Loading Overlay - shown when refreshing */}
      {isRefreshing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#06402B" />
            <Text style={styles.loadingOverlayText}>Memuat video baru...</Text>
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
  topTabs: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    gap: 24,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFFFFF',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDE8D0',
  },
  loadingText: {
    color: '#06402B',
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDE8D0',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    backgroundColor: '#06402B',
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
    color: '#06402B',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  refreshButton: {
    backgroundColor: '#06402B',
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
    backgroundColor: '#FFFFFF',
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
    color: '#06402B',
    textAlign: 'center',
  },
});

export default HomeScreen;
