import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/ApiService';

const LikedVideosScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const ITEM_SIZE = (SCREEN_WIDTH - 8) / 3;

  const [likedVideos, setLikedVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const loadLikedVideos = useCallback(async (page = 1, isRefresh = false) => {
    try {
      if (page === 1 && !isRefresh) setIsLoading(true);
      if (page > 1) setIsLoadingMore(true);

      console.log('❤️ [LikedVideos] Fetching page', page);
      const response = await apiService.getLikedVideos(page);
      const data = response.data;
      console.log('❤️ [LikedVideos] Response keys:', Object.keys(data || {}), 'data count:', Array.isArray(data?.data) ? data.data.length : 'N/A');

      // Handle multiple response shapes
      let videos = [];
      if (Array.isArray(data?.data)) {
        videos = data.data;
      } else if (Array.isArray(data)) {
        videos = data;
      } else {
        console.warn('❤️ [LikedVideos] Unexpected response format:', JSON.stringify(data).substring(0, 200));
      }

      if (page === 1) {
        setLikedVideos(videos);
      } else {
        setLikedVideos(prev => [...prev, ...videos]);
      }

      setHasMore(!!data?.next_page_url);
      setCurrentPage(page);
      setInitialLoadDone(true);
      console.log('❤️ [LikedVideos] Loaded', videos.length, 'videos, hasMore:', !!data?.next_page_url);
    } catch (error) {
      console.error('❤️ [LikedVideos] Error:', error?.message, error?.response?.status, error?.response?.data);
      if (page === 1) setLikedVideos([]);
      setInitialLoadDone(true);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLikedVideos(1);
    }, [loadLikedVideos])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadLikedVideos(1, true);
  }, [loadLikedVideos]);

  const handleUnlike = async (videoId) => {
    try {
      await apiService.toggleLike(videoId);
      setLikedVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error) {
      Alert.alert('Error', 'Gagal menghapus like');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const renderVideoItem = ({ item }) => {
    const video = item.video || item;
    let menuData = {};
    try {
      if (video.menu_data) {
        menuData = typeof video.menu_data === 'string' ? JSON.parse(video.menu_data) : video.menu_data;
      }
    } catch (e) {}

    return (
      <TouchableOpacity
        style={[styles.gridItem, { width: ITEM_SIZE, height: ITEM_SIZE * 1.5 }]}
        onPress={() => {
          Alert.alert(
            'Hapus Like',
            'Hapus video ini dari daftar suka?',
            [
              { text: 'Batal', style: 'cancel' },
              { text: 'Hapus', style: 'destructive', onPress: () => handleUnlike(video.id) },
            ]
          );
        }}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: video.thumbnail_url }}
          style={styles.gridImage}
          resizeMode="cover"
        />
        <View style={styles.gridOverlay}>
          <Text style={styles.gridDate} numberOfLines={1}>
            {menuData?.name || formatDate(video.created_at)}
          </Text>
        </View>
        <View style={styles.likeBadge}>
          <Ionicons name="heart" size={12} color="#FF3B5C" />
        </View>
        {video.user?.name && (
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText} numberOfLines={1}>@{video.user.name}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading || !initialLoadDone) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>Suka</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Suka</Text>
        <View style={styles.headerSpacer} />
      </View>

      {likedVideos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color={colors.iconInactive} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Belum Ada Video yang Disukai</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Video yang Anda sukai akan muncul di sini
          </Text>
        </View>
      ) : (
        <FlatList
          data={likedVideos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => `liked-${item.id || item.video?.id}`}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          onEndReached={() => {
            if (!isLoadingMore && hasMore) loadLikedVideos(currentPage + 1);
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} /> : null}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerSpacer: { width: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gridContent: { padding: 1 },
  gridItem: { margin: 1, borderRadius: 4, overflow: 'hidden', position: 'relative' },
  gridImage: { width: '100%', height: '100%', backgroundColor: '#E5E7EB' },
  gridOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 6, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  gridDate: { color: '#FFFFFF', fontSize: 10, fontWeight: '500' },
  likeBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10,
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
  },
  userBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  userBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  emptySubtext: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});

export default LikedVideosScreen;
