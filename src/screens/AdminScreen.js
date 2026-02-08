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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';

const AdminScreen = ({ navigation }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
  const { isAdmin, user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalUsers: 0,
    totalViews: 0,
  });

  const styles = useMemo(() => createStyles(CARD_WIDTH), [CARD_WIDTH]);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Akses Ditolak', 'Anda tidak memiliki akses admin', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      return;
    }
    loadVideos();
    loadStats();
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      // Try to get stats from dedicated API endpoint
      try {
        const response = await apiService.getAdminStats();
        setStats({
          totalVideos: response.data.total_videos || 0,
          totalUsers: response.data.total_users || 0,
          totalViews: response.data.total_views || 0,
        });
      } catch (apiError) {
        console.log('Admin stats API not available, calculating client-side');
        // Fallback: calculate from videos
        const response = await apiService.getVideos(1);
        const allVideos = response.data.data || [];
        setStats({
          totalVideos: allVideos.length,
          totalUsers: new Set(allVideos.map(v => v.user?.id)).size,
          totalViews: allVideos.reduce((sum, v) => sum + (v.views_count || 0), 0),
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set default stats on error
      setStats({
        totalVideos: 0,
        totalUsers: 0,
        totalViews: 0,
      });
    }
  };

  const loadVideos = async (page = 1) => {
    try {
      if (page === 1) {
        setIsLoading(true);
      }

      const response = await apiService.getVideos(page);
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
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadVideos(1);
    loadStats();
  }, []);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadVideos(currentPage + 1);
    }
  };

  const handleDeleteVideo = async (video) => {
    Alert.alert(
      'Hapus Video',
      `Apakah Anda yakin ingin menghapus video "${video.menu_data?.name || 'ini'}"?\n\nTindakan ini tidak dapat dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteVideo(video.id);

              // Remove from local state
              setVideos(prev => prev.filter(v => v.id !== video.id));

              Alert.alert('Sukses', 'Video berhasil dihapus');
              loadStats(); // Refresh stats
            } catch (error) {
              console.error('Error deleting video:', error);
              const errorMessage = error.response?.status === 403
                ? 'Anda tidak memiliki izin untuk menghapus video ini'
                : error.response?.data?.message || 'Gagal menghapus video';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const renderVideoCard = ({ item }) => {
    let menuData = {};
    try {
      if (item.menu_data) {
        if (typeof item.menu_data === 'string') {
          menuData = JSON.parse(item.menu_data);
        } else if (typeof item.menu_data === 'object') {
          menuData = item.menu_data;
        }
      }
    } catch (error) {
      console.warn('Error parsing menu_data:', error);
    }

    return (
      <View style={styles.videoCard}>
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: item.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="eye" size={14} color="#FFFFFF" />
              <Text style={styles.statText}>{item.views_count || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={14} color="#FF3B5C" />
              <Text style={styles.statText}>{item.likes_count || 0}</Text>
            </View>
          </View>
        </View>

        {/* Video Info */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {menuData.name || 'Untitled'}
          </Text>
          <View style={styles.creatorInfo}>
            <Ionicons name="person-circle-outline" size={14} color="#6B7280" />
            <Text style={styles.creatorName} numberOfLines={1}>
              @{item.user?.name || 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Admin Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteVideo(item)}
          >
            <Ionicons name="trash" size={18} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Hapus</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSubtitle}>Kelola Video</Text>
        </View>
        <View style={styles.adminBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#FFD700" />
          <Text style={styles.adminBadgeText}>Admin</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="videocam" size={24} color="#06402B" />
          <Text style={styles.statCardValue}>{stats.totalVideos}</Text>
          <Text style={styles.statCardLabel}>Total Video</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#06402B" />
          <Text style={styles.statCardValue}>{stats.totalUsers}</Text>
          <Text style={styles.statCardLabel}>Creators</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="eye" size={24} color="#06402B" />
          <Text style={styles.statCardValue}>{stats.totalViews}</Text>
          <Text style={styles.statCardLabel}>Total Views</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Semua Video</Text>
    </View>
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Akses Ditolak</Text>
          <Text style={styles.errorText}>Anda tidak memiliki akses admin</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && videos.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06402B" />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={videos}
        renderItem={renderVideoCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={renderHeader}
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
          isLoading && videos.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#06402B" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Belum ada video</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const createStyles = (CARD_WIDTH) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE8D0',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#06402B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06402B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  adminBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#06402B',
    marginTop: 8,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#06402B',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
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
  statsContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    gap: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 18,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  creatorName: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
  actionsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 8,
    gap: 6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default AdminScreen;
