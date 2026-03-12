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

const ArchiveScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const ITEM_SIZE = (SCREEN_WIDTH - 8) / 3; // 3 columns with small gaps

  const [activeTab, setActiveTab] = useState('stories');
  const [archivedStories, setArchivedStories] = useState([]);
  const [archivedVideos, setArchivedVideos] = useState([]);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [videosPage, setVideosPage] = useState(1);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [isLoadingMoreVideos, setIsLoadingMoreVideos] = useState(false);

  useEffect(() => {
    if (activeTab === 'stories') {
      loadArchivedStories();
    } else {
      loadArchivedVideos(1);
    }
  }, [activeTab]);

  // Refresh data when screen comes into focus (e.g., after archiving from share menu or story viewer)
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'stories') {
        loadArchivedStories(true);
      } else {
        loadArchivedVideos(1, true);
      }
    }, [activeTab])
  );

  const loadArchivedStories = async (silent = false) => {
    try {
      if (!silent) setIsLoadingStories(true);

      const results = await Promise.allSettled([
        apiService.getArchivedStories(),
        apiService.getMyStories(),
      ]);

      const archivedRes = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
      const myStoriesRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };

      const extractArr = (resData) => {
        if (Array.isArray(resData)) return resData;
        if (resData?.stories && Array.isArray(resData.stories)) return resData.stories;
        if (resData?.data && Array.isArray(resData.data)) return resData.data;
        if (resData?.data?.stories) return resData.data.stories;
        if (resData?.data?.data) return resData.data.data;
        return [];
      };

      const archived = extractArr(archivedRes?.data);
      const myStories = extractArr(myStoriesRes?.data);

      // Combine and dedup — prioritize archived stories, but also include active own stories
      const combined = [...archived, ...myStories];
      const seen = new Set();
      const unique = combined.filter(s => {
        const id = String(s.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      // Sort newest first
      unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setArchivedStories(unique);
    } catch (error) {
      console.error('Error loading archived stories:', error);
    } finally {
      setIsLoadingStories(false);
      setIsRefreshing(false);
    }
  };

  const loadArchivedVideos = async (page = 1, silent = false) => {
    try {
      if (page === 1 && !silent) setIsLoadingVideos(true);
      if (page > 1) setIsLoadingMoreVideos(true);

      const response = await apiService.get(`/videos/archived?page=${page}`);
      const data = response.data;
      const videos = data?.data || [];

      if (page === 1) {
        setArchivedVideos(videos);
      } else {
        setArchivedVideos(prev => [...prev, ...videos]);
      }

      setHasMoreVideos(!!data?.next_page_url);
      setVideosPage(page);
    } catch (error) {
      console.error('Error loading archived videos:', error?.response?.status, error?.message);
      if (page === 1) setArchivedVideos([]);
    } finally {
      setIsLoadingVideos(false);
      setIsLoadingMoreVideos(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (activeTab === 'stories') {
      loadArchivedStories(true);
    } else {
      loadArchivedVideos(1, true);
    }
  }, [activeTab]);

  const handleUnarchiveStory = async (storyId) => {
    Alert.alert(
      'Batalkan Arsip',
      'Kembalikan story ini dari arsip?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Kembalikan',
          onPress: async () => {
            try {
              await apiService.unarchiveStory(storyId);
              setArchivedStories(prev => prev.filter(s => s.id !== storyId));
              Alert.alert('Berhasil', 'Story berhasil dikembalikan dari arsip');
            } catch (error) {
              console.error('Error unarchiving story:', error);
              Alert.alert('Error', 'Gagal mengembalikan story');
            }
          },
        },
      ]
    );
  };

  const handleUnarchiveVideo = async (videoId) => {
    Alert.alert(
      'Batalkan Arsip',
      'Kembalikan postingan ini dari arsip?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Kembalikan',
          onPress: async () => {
            try {
              await apiService.post(`/videos/${videoId}/unarchive`);
              setArchivedVideos(prev => prev.filter(v => v.id !== videoId));
              Alert.alert('Berhasil', 'Postingan berhasil dikembalikan dari arsip');
            } catch (error) {
              console.error('Error unarchiving video:', error);
              Alert.alert('Error', 'Gagal mengembalikan postingan');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const renderStoryItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.gridItem, { width: ITEM_SIZE, height: ITEM_SIZE * 1.5 }]}
      onPress={() => handleUnarchiveStory(item.id)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.thumbnail_url || item.media_url }}
        style={styles.gridImage}
        resizeMode="cover"
      />
      <View style={styles.gridOverlay}>
        <Text style={styles.gridDate}>{formatDate(item.created_at)}</Text>
      </View>
      {item.is_archived && (
        <View style={styles.archivedBadge}>
          <Ionicons name="archive" size={14} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderVideoItem = ({ item }) => {
    let menuData = {};
    try {
      if (item.menu_data) {
        menuData = typeof item.menu_data === 'string' ? JSON.parse(item.menu_data) : item.menu_data;
      }
    } catch (e) {}

    return (
      <TouchableOpacity
        style={[styles.gridItem, { width: ITEM_SIZE, height: ITEM_SIZE * 1.5 }]}
        onPress={() => handleUnarchiveVideo(item.id)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.thumbnail_url }}
          style={styles.gridImage}
          resizeMode="cover"
        />
        <View style={styles.gridOverlay}>
          <Text style={styles.gridDate} numberOfLines={1}>
            {menuData?.name || formatDate(item.created_at)}
          </Text>
        </View>
        <View style={styles.viewsBadge}>
          <Ionicons name="eye" size={12} color="#FFFFFF" />
          <Text style={styles.viewsText}>{item.views_count || 0}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type) => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={type === 'stories' ? 'time-outline' : 'videocam-outline'}
        size={64}
        color={colors.iconInactive}
      />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {type === 'stories' ? 'Belum Ada Arsip Story' : 'Belum Ada Arsip Postingan'}
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
        {type === 'stories'
          ? 'Story yang Anda arsipkan akan muncul di sini'
          : 'Postingan yang Anda arsipkan akan muncul di sini'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Arsip</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'stories' && [styles.activeTab, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('stories')}
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={activeTab === 'stories' ? colors.primary : colors.iconInactive}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'stories' ? colors.primary : colors.textTertiary },
            ]}
          >
            Arsip Story
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'posts' && [styles.activeTab, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('posts')}
        >
          <Ionicons
            name="grid-outline"
            size={20}
            color={activeTab === 'posts' ? colors.primary : colors.iconInactive}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'posts' ? colors.primary : colors.textTertiary },
            ]}
          >
            Arsip Postingan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'stories' ? (
        isLoadingStories ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : archivedStories.length === 0 ? (
          renderEmptyState('stories')
        ) : (
          <FlatList
            data={archivedStories}
            renderItem={renderStoryItem}
            keyExtractor={(item) => `story-${item.id}`}
            numColumns={3}
            contentContainerStyle={styles.gridContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        )
      ) : isLoadingVideos ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : archivedVideos.length === 0 ? (
        renderEmptyState('posts')
      ) : (
        <FlatList
          data={archivedVideos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => `video-${item.id}`}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={() => {
            if (!isLoadingMoreVideos && hasMoreVideos) {
              loadArchivedVideos(videosPage + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMoreVideos ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 32,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    padding: 1,
  },
  gridItem: {
    margin: 1,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  gridDate: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  archivedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewsBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewsText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default ArchiveScreen;
