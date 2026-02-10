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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';
import StoryBar from '../components/Story/StoryBar';
import StoryViewer from '../components/Story/StoryViewer';
import VideoPreviewModal from '../components/VideoPreviewModal';
import useStories from '../hooks/useStories';

const BookmarksScreen = ({ navigation }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const styles = useMemo(() => createStyles(CARD_WIDTH), [CARD_WIDTH]);

  // Real Stories integration
  const { stories, loading: storiesLoading, fetchStories } = useStories();
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  // Video Preview Modal state
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Debug: Track story viewer state changes
  useEffect(() => {
    console.log('📺 [BookmarksScreen] StoryViewer state changed:', {
      showStoryViewer,
      selectedStoryIndex,
      storiesAvailable: stories?.length || 0,
    });

    if (showStoryViewer) {
      console.log('✅ [BookmarksScreen] StoryViewer should be visible now!');
    }
  }, [showStoryViewer, selectedStoryIndex, stories]);

  // Debug: Component mount
  useEffect(() => {
    console.log('🏗️ [BookmarksScreen] Component mounted');
    console.log('👤 [BookmarksScreen] Current user:', {
      id: user?.id,
      email: user?.email,
      name: user?.name,
      hasUser: !!user,
    });
    return () => {
      console.log('💀 [BookmarksScreen] Component unmounting');
    };
  }, []);

  // Debug: Log user changes
  useEffect(() => {
    console.log('👤 [BookmarksScreen] User changed:', {
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.name,
    });
  }, [user]);

  // Debug: Log stories state
  useEffect(() => {
    console.log('📚 [BookmarksScreen] Stories state:', {
      count: stories?.length || 0,
      loading: storiesLoading,
      stories: stories
    });
  }, [stories, storiesLoading]);

  useEffect(() => {
    loadBookmarks();
  }, []);

  // Refresh stories when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (fetchStories) {
        fetchStories();
      }
    }, [fetchStories])
  );

  const loadBookmarks = async (page = 1) => {
    try {
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      // Load from API
      const response = await apiService.getBookmarks(page);
      const newBookmarks = response.data.data || [];

      // Extract video from bookmark object
      const videos = newBookmarks
        .map(bookmark => bookmark.video)
        .filter(video => video !== null);

      if (page === 1) {
        setBookmarks(videos);
      } else {
        setBookmarks(prev => [...prev, ...videos]);
      }

      setHasMore(response.data.next_page_url !== null);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      Alert.alert('Error', 'Gagal memuat bookmark');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadBookmarks(1);
  }, []);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadBookmarks(currentPage + 1);
    }
  };

  const handleVideoPress = (video) => {
    // Show video preview modal directly
    setSelectedVideo(video);
    setShowVideoPreview(true);
  };

  const handleVideoPreviewClose = (wasDeleted) => {
    setShowVideoPreview(false);
    setSelectedVideo(null);
    if (wasDeleted) {
      // Refresh bookmarks if a video was deleted
      loadBookmarks(1);
    }
  };

  const handleToggleBookmark = async (videoId) => {
    try {
      await apiService.toggleBookmark(videoId);
      // Remove from list immediately
      setBookmarks(prev => prev.filter(video => video.id !== videoId));
    } catch (error) {
      console.error('Error removing bookmark:', error);
      Alert.alert('Error', 'Gagal menghapus bookmark');
    }
  };

  // Story handlers (removed useCallback to test)
  const handleStoryPress = (storyIndex, userId) => {
    console.log('📖 [BookmarksScreen] Story pressed:', {
      storyIndex,
      userId,
      totalStories: stories?.length || 0,
      selectedStory: stories?.[storyIndex] ? {
        id: stories[storyIndex].id,
        media_url: stories[storyIndex].media_url,
        media_type: stories[storyIndex].media_type,
      } : null,
    });

    console.log('🔄 [BookmarksScreen] Setting story viewer state...');
    console.log('🔄 [BookmarksScreen] Current showStoryViewer:', showStoryViewer);

    setSelectedStoryIndex(storyIndex);
    setShowStoryViewer(true);

    console.log('🔄 [BookmarksScreen] Called setShowStoryViewer(true)');
  };

  const handleAddStory = () => {
    navigation.navigate('StoryCamera');
  };

  // Render Stories Section using StoryBar component
  const renderStoriesSection = () => {
    // Don't show if still loading
    if (storiesLoading) {
      return null;
    }

    // Always show StoryBar (it will show "Add Story" even if no stories)
    return (
      <StoryBar
        stories={stories || []}
        onStoryPress={handleStoryPress}
        onAddStory={handleAddStory}
      />
    );
  };

  const renderVideoCard = ({ item }) => {
    // Safely parse menu_data
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
      console.warn('Error parsing menu_data in bookmarks:', error);
      menuData = {};
    }

    const formatPrice = (price) => {
      try {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(price || 0);
      } catch (error) {
        return 'Rp 0';
      }
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

          {/* Bookmark Button */}
          <TouchableOpacity
            style={styles.bookmarkButton}
            onPress={() => handleToggleBookmark(item.id)}
          >
            <Ionicons name="bookmark" size={20} color="#FFD700" />
          </TouchableOpacity>

          {/* Stats Badge */}
          <View style={styles.statsBadge}>
            <Ionicons name="heart" size={14} color="#FF3B5C" />
            <Text style={styles.statsText}>{item.likes_count || 0}</Text>
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
          <View style={styles.creatorInfo}>
            <Ionicons name="person-circle-outline" size={14} color="#6B7280" />
            <Text style={styles.creatorName} numberOfLines={1}>
              @{item.user?.name || 'Unknown'}
            </Text>
            {item.user?.badge_status === 'approved' && item.user?.show_badge && (
              <View style={styles.creatorBadge}>
                <Text style={styles.creatorBadgeText}>CREATOR</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06402B" />
        <Text style={styles.loadingText}>Memuat bookmark...</Text>
      </View>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <View style={styles.container}>
        {/* Stories Section - Always show */}
        {renderStoriesSection()}

        {/* Empty State */}
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="bookmark-outline" size={64} color="#FFFFFF" />
          </View>
          <Text style={styles.emptyTitle}>Belum Ada Bookmark</Text>
          <Text style={styles.emptyDescription}>
            Video yang Anda bookmark akan muncul di sini.{'\n'}
            Mulai bookmark video kuliner favorit Anda!
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Ionicons name="compass" size={20} color="#FFFFFF" />
            <Text style={styles.exploreButtonText}>Jelajahi Video</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookmarks}
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
        ListHeaderComponent={
          <>
            {/* Stories Section */}
            {renderStoriesSection()}

            {/* Video Tersimpan Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Video Tersimpan</Text>
            </View>
          </>
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#06402B" />
            </View>
          ) : null
        }
      />

      {/* Story Viewer Modal */}
      <StoryViewer
        visible={showStoryViewer}
        stories={stories}
        initialIndex={selectedStoryIndex}
        onClose={() => setShowStoryViewer(false)}
        onStoryChange={(index) => setSelectedStoryIndex(index)}
      />

      {/* Video Preview Modal */}
      <VideoPreviewModal
        visible={showVideoPreview}
        video={selectedVideo}
        onClose={handleVideoPreviewClose}
        currentUserId={user?.id}
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
    paddingTop: 40,
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
  exploreButton: {
    backgroundColor: '#06402B',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
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
  bookmarkButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorName: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  creatorBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    marginLeft: 4,
  },
  creatorBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#000000',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  // Stories Styles
  storiesSection: {
    backgroundColor: '#EDE8D0',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
  },
  storiesContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  addStoryButton: {
    alignItems: 'center',
    width: 70,
  },
  addStoryAvatarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  addStoryAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  addStoryAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addStoryIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  storyItem: {
    alignItems: 'center',
    width: 70,
  },
  storyAvatarContainer: {
    padding: 3,
    borderRadius: 33,
    marginBottom: 6,
  },
  storyUnviewedRing: {
    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
    borderWidth: 2,
    borderColor: '#06402B',
  },
  storyViewedRing: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  storyUsername: {
    fontSize: 11,
    color: '#374151',
    textAlign: 'center',
    width: '100%',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#EDE8D0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
});

export default BookmarksScreen;
