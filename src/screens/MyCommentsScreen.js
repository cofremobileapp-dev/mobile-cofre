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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/ApiService';

const MyCommentsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const loadMyComments = useCallback(async (page = 1, isRefresh = false) => {
    try {
      if (page === 1 && !isRefresh) setIsLoading(true);
      if (page > 1) setIsLoadingMore(true);

      console.log('💬 [MyComments] Fetching page', page);
      const response = await apiService.getMyComments(page);
      const data = response.data;
      console.log('💬 [MyComments] Response keys:', Object.keys(data || {}), 'data count:', Array.isArray(data?.data) ? data.data.length : 'N/A');

      // Handle multiple response shapes
      let commentsList = [];
      if (Array.isArray(data?.data)) {
        commentsList = data.data;
      } else if (Array.isArray(data)) {
        commentsList = data;
      } else {
        console.warn('💬 [MyComments] Unexpected response format:', JSON.stringify(data).substring(0, 200));
      }

      if (page === 1) {
        setComments(commentsList);
      } else {
        setComments(prev => [...prev, ...commentsList]);
      }

      setHasMore(!!data?.next_page_url);
      setCurrentPage(page);
      setInitialLoadDone(true);
      console.log('💬 [MyComments] Loaded', commentsList.length, 'comments, hasMore:', !!data?.next_page_url);
    } catch (error) {
      console.error('💬 [MyComments] Error:', error?.message, error?.response?.status, error?.response?.data);
      if (page === 1) setComments([]);
      setInitialLoadDone(true);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMyComments(1);
    }, [loadMyComments])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadMyComments(1, true);
  }, [loadMyComments]);

  const handleDeleteComment = (commentId) => {
    Alert.alert(
      'Hapus Komentar',
      'Apakah Anda yakin ingin menghapus komentar ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteComment(commentId);
              setComments(prev => prev.filter(c => c.id !== commentId));
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus komentar');
            }
          },
        },
      ]
    );
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Baru saja';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari lalu`;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const renderCommentItem = ({ item }) => {
    const video = item.video || {};
    let menuData = {};
    try {
      if (video.menu_data) {
        menuData = typeof video.menu_data === 'string' ? JSON.parse(video.menu_data) : video.menu_data;
      }
    } catch (e) {}

    return (
      <View style={[styles.commentItem, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
        <View style={styles.commentHeader}>
          <View style={styles.videoInfo}>
            {video.thumbnail_url ? (
              <Image source={{ uri: video.thumbnail_url }} style={styles.videoThumb} />
            ) : (
              <View style={[styles.videoThumb, { backgroundColor: colors.backgroundTertiary, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="videocam" size={16} color={colors.iconInactive} />
              </View>
            )}
            <View style={styles.videoMeta}>
              <Text style={[styles.videoTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {menuData?.name || menuData?.description || 'Video'}
              </Text>
              <Text style={[styles.videoCreator, { color: colors.textTertiary }]} numberOfLines={1}>
                @{video.user?.name || 'Unknown'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDeleteComment(item.id)} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={18} color={colors.error || '#EF4444'} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.commentContent, { color: colors.textPrimary }]}>{item.content}</Text>
        <Text style={[styles.commentTime, { color: colors.textTertiary }]}>{formatTimeAgo(item.created_at)}</Text>
      </View>
    );
  };

  if (isLoading || !initialLoadDone) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>Komentar</Text>
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
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Komentar</Text>
        <View style={styles.headerSpacer} />
      </View>

      {comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={64} color={colors.iconInactive} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Belum Ada Komentar</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Komentar yang Anda tulis akan muncul di sini
          </Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          renderItem={renderCommentItem}
          keyExtractor={(item) => `comment-${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          onEndReached={() => {
            if (!isLoadingMore && hasMore) loadMyComments(currentPage + 1);
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
  listContent: { paddingVertical: 4 },
  commentItem: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  commentHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  videoInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  videoThumb: { width: 40, height: 40, borderRadius: 6, marginRight: 10, backgroundColor: '#E5E7EB' },
  videoMeta: { flex: 1 },
  videoTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  videoCreator: { fontSize: 12 },
  deleteButton: { padding: 6 },
  commentContent: { fontSize: 15, lineHeight: 22, marginBottom: 6 },
  commentTime: { fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  emptySubtext: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});

export default MyCommentsScreen;
