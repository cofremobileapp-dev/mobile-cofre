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
import { useTheme } from '../contexts/ThemeContext';

const AdminScreen = ({ navigation }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
  const { isAdmin, user } = useAuth();
  const { colors } = useTheme();
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
  const [badgeApplications, setBadgeApplications] = useState([]);
  const [pendingBadgeCount, setPendingBadgeCount] = useState(0);
  const [badgeLoading, setBadgeLoading] = useState(false);

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
    loadBadgeApplications();
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      // Try to get stats from dedicated API endpoint
      try {
        const response = await apiService.getAdminStats();
        const statsData = response.data?.data || response.data || {};
        // Moderation endpoint returns { pending, approved, rejected, total }
        setStats({
          totalVideos: statsData.total || 0,
          totalUsers: 0, // Not provided by moderation stats
          totalViews: 0,  // Not provided by moderation stats
        });

        // Also load videos to get user count and views
        const videosResponse = await apiService.getVideos(1);
        const allVideos = videosResponse.data?.data || [];
        setStats(prev => ({
          ...prev,
          totalUsers: new Set(allVideos.map(v => v.user?.id).filter(Boolean)).size,
          totalViews: allVideos.reduce((sum, v) => sum + (v.views_count || 0), 0),
        }));
      } catch (apiError) {
        console.log('Admin stats API not available, calculating client-side');
        // Fallback: calculate from videos
        const response = await apiService.getVideos(1);
        const allVideos = response.data?.data || [];
        setStats({
          totalVideos: allVideos.length,
          totalUsers: new Set(allVideos.map(v => v.user?.id).filter(Boolean)).size,
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

  const loadBadgeApplications = async () => {
    try {
      setBadgeLoading(true);
      const response = await apiService.getPendingBadgeApplications();
      const apps = response.data?.applications || [];
      setBadgeApplications(apps);
      setPendingBadgeCount(response.data?.pending_count || 0);
    } catch (error) {
      console.error('Error loading badge applications:', error);
    } finally {
      setBadgeLoading(false);
    }
  };

  const handleApproveBadge = (application) => {
    Alert.alert(
      'Approve Badge',
      `Setujui badge creator untuk ${application.name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Setujui',
          onPress: async () => {
            try {
              await apiService.approveBadgeApplication(application.id);
              Alert.alert('Berhasil', `Badge untuk ${application.name} disetujui!`);
              loadBadgeApplications();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Gagal menyetujui badge');
            }
          },
        },
      ]
    );
  };

  const handleRejectBadge = (application) => {
    Alert.alert(
      'Tolak Badge',
      `Tolak badge creator untuk ${application.name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tolak',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.rejectBadgeApplication(application.id, 'Tidak memenuhi kriteria.');
              Alert.alert('Berhasil', `Badge untuk ${application.name} ditolak.`);
              loadBadgeApplications();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Gagal menolak badge');
            }
          },
        },
      ]
    );
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
    loadBadgeApplications();
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
      <View style={[styles.videoCard, { backgroundColor: colors.card }]}>
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
          <Text style={[styles.videoTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {menuData.name || menuData.description || 'Untitled'}
          </Text>
          <View style={styles.creatorInfo}>
            <Ionicons name="person-circle-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.creatorName, { color: colors.textSecondary }]} numberOfLines={1}>
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
          <Text style={[styles.headerTitle, { color: colors.primary }]}>Admin Panel</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Kelola Video</Text>
        </View>
        <View style={[styles.adminBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="shield-checkmark" size={16} color="#FFD700" />
          <Text style={styles.adminBadgeText}>Admin</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="videocam" size={24} color={colors.primary} />
          <Text style={[styles.statCardValue, { color: colors.primary }]}>{stats.totalVideos}</Text>
          <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>Total Video</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="people" size={24} color={colors.primary} />
          <Text style={[styles.statCardValue, { color: colors.primary }]}>{stats.totalUsers}</Text>
          <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>Creators</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="eye" size={24} color={colors.primary} />
          <Text style={[styles.statCardValue, { color: colors.primary }]}>{stats.totalViews}</Text>
          <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>Total Views</Text>
        </View>
      </View>

      {/* Badge Applications Section */}
      {pendingBadgeCount > 0 && (
        <View style={styles.badgeSection}>
          <View style={styles.badgeSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 0 }]}>
              Badge Applications
            </Text>
            <View style={[styles.pendingBadge, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.pendingBadgeText}>{pendingBadgeCount} pending</Text>
            </View>
          </View>

          {badgeApplications
            .filter(app => app.badge_status === 'pending')
            .map((app) => (
              <View key={app.id} style={[styles.badgeCard, { backgroundColor: colors.card }]}>
                <View style={styles.badgeCardTop}>
                  {app.avatar_url ? (
                    <Image source={{ uri: app.avatar_url }} style={styles.badgeAvatar} />
                  ) : (
                    <View style={[styles.badgeAvatar, styles.badgeAvatarPlaceholder]}>
                      <Text style={styles.badgeAvatarText}>{app.name?.[0]?.toUpperCase() || 'U'}</Text>
                    </View>
                  )}
                  <View style={styles.badgeCardInfo}>
                    <Text style={[styles.badgeCardName, { color: colors.textPrimary }]}>{app.name}</Text>
                    <Text style={[styles.badgeCardEmail, { color: colors.textSecondary }]}>{app.email}</Text>
                    {app.badge_is_culinary_creator && (
                      <View style={styles.culinaryTag}>
                        <Ionicons name="restaurant" size={12} color="#10B981" />
                        <Text style={styles.culinaryTagText}>Culinary Creator</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[styles.badgeReason, { color: colors.textSecondary }]} numberOfLines={3}>
                  "{app.badge_application_reason}"
                </Text>
                <View style={styles.badgeActions}>
                  <TouchableOpacity
                    style={[styles.badgeApproveBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => handleApproveBadge(app)}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.badgeBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.badgeRejectBtn, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleRejectBadge(app)}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                    <Text style={styles.badgeBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.primary }]}>Semua Video</Text>
    </View>
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Akses Ditolak</Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>Anda tidak memiliki akses admin</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && videos.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading && videos.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-outline" size={64} color="#D1D5DB" />
            <Text style={[styles.emptyText, { color: colors.iconInactive }]}>Belum ada video</Text>
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
  // Badge Application Styles
  badgeSection: {
    marginBottom: 20,
  },
  badgeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  badgeAvatarPlaceholder: {
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  badgeCardInfo: {
    flex: 1,
  },
  badgeCardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  badgeCardEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  culinaryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  culinaryTagText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  badgeReason: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 12,
  },
  badgeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  badgeApproveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  badgeRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  badgeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdminScreen;
