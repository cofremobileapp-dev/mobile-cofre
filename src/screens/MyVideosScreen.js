import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/ApiService';

const MyVideosScreen = ({ navigation }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const styles = useMemo(() => createStyles(CARD_WIDTH), [CARD_WIDTH]);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async (page = 1) => {
    try {
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      // Load from API
      const response = await apiService.getMyVideos(page);
      const newVideos = response.data.data || [];

      if (page === 1) {
        setVideos(newVideos);
      } else {
        setVideos(prev => [...prev, ...newVideos]);
      }

      setHasMore(response.data.next_page_url !== null);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading videos:', error);
      Alert.alert('Error', 'Gagal memuat video');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadVideos(1);
  }, []);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadVideos(currentPage + 1);
    }
  };

  const handleVideoPress = (video) => {
    // Show video details
    Alert.alert(
      video.menu_data?.name || 'Video',
      `Likes: ${video.likes_count || 0}\nKomentar: ${video.comments_count || 0}\nViews: ${video.views_count || 0}`
    );
  };

  const renderVideoCard = ({ item }) => {
    const menuData = item.menu_data || {};
    const formatPrice = (price) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(price || 0);
    };

    return (
      <TouchableOpacity
        style={styles.videoCard}
        onPress={() => handleVideoPress(item)}
        activeOpacity={0.7}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: item.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.videoOverlay}>
            <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={12} color="#FF3B5C" />
              <Text style={styles.statText}>{item.likes_count || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble" size={12} color="#3B82F6" />
              <Text style={styles.statText}>{item.comments_count || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="eye" size={12} color="#8B5CF6" />
              <Text style={styles.statText}>{item.views_count || 0}</Text>
            </View>
          </View>
        </View>

        {/* Video Info */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {menuData.name || 'Untitled'}
          </Text>
          {menuData.price && (
            <Text style={styles.videoPrice} numberOfLines={1}>
              {formatPrice(menuData.price)}
            </Text>
          )}
          <Text style={styles.uploadDate}>
            {new Date(item.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
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
          <Ionicons name="videocam-outline" size={64} color="#FFFFFF" />
        </View>
        <Text style={styles.emptyTitle}>Belum Ada Video</Text>
        <Text style={styles.emptyDescription}>
          Anda belum mengupload video.{'\n'}
          Mulai berbagi video kuliner Anda sekarang!
        </Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => navigation.navigate('Upload')}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.uploadButtonText}>Upload Video</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="videocam" size={28} color="#06402B" />
          <Text style={styles.summaryNumber}>{videos.length}</Text>
          <Text style={styles.summaryLabel}>Total Video</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="heart" size={28} color="#EF4444" />
          <Text style={styles.summaryNumber}>
            {videos.reduce((sum, v) => sum + (v.likes_count || 0), 0)}
          </Text>
          <Text style={styles.summaryLabel}>Total Likes</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="eye" size={28} color="#8B5CF6" />
          <Text style={styles.summaryNumber}>
            {videos.reduce((sum, v) => sum + (v.views_count || 0), 0)}
          </Text>
          <Text style={styles.summaryLabel}>Total Views</Text>
        </View>
      </View>

      <FlatList
        data={videos}
        renderItem={renderVideoCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#06402B']}
            tintColor="#06402B"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#06402B" />
            </View>
          ) : null
        }
      />
    </View>
  );
};

const createStyles = (CARD_WIDTH) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE8D0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDE8D0',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
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
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: '#06402B',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#06402B',
    marginTop: 4,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  videoCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailContainer: {
    width: '100%',
    height: CARD_WIDTH * 1.3,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8E8E0',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  statsRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  videoPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#06402B',
    marginBottom: 6,
  },
  uploadDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default MyVideosScreen;
