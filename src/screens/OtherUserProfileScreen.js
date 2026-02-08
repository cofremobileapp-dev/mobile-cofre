import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Image,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/ApiService';
import VideoPreviewModal from '../components/VideoPreviewModal';

// Grid calculation constants (same as ProfileScreen)
const COLUMNS = 3;
const ITEM_GAP = 1;

const OtherUserProfileScreen = ({ route, navigation }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  // Calculate item width: account for margins
  const TOTAL_MARGINS = COLUMNS * ITEM_GAP;
  const ITEM_WIDTH = Math.floor((SCREEN_WIDTH - TOTAL_MARGINS) / COLUMNS);
  const { userId } = route.params;
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('post');
  const [userData, setUserData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [userStats, setUserStats] = useState({
    followers: 0,
    following: 0,
    videos: 0,
    likes: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [videoTitles, setVideoTitles] = useState({});
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  const styles = useMemo(() => createStyles(ITEM_WIDTH), [ITEM_WIDTH]);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'playlist') {
      loadUserPlaylists();
    }
  }, [activeTab]);

  const loadUserProfile = async () => {
    try {
      setIsLoadingVideos(true);

      // Load user profile
      const profileResponse = await apiService.getUserProfile(userId);
      setUserData(profileResponse.data.user);
      setIsFollowing(profileResponse.data.user.is_following || false);

      // Load user videos
      const videosResponse = await apiService.getUserVideos(userId, 1);
      const videoData = videosResponse.data.data || [];
      setVideos(videoData);

      // Extract video titles from menu_data
      const titles = {};
      videoData.forEach(video => {
        if (video.menu_data) {
          try {
            const menuData = typeof video.menu_data === 'string'
              ? JSON.parse(video.menu_data)
              : video.menu_data;
            titles[video.id] = menuData.name || 'Untitled';
          } catch (e) {
            titles[video.id] = 'Untitled';
          }
        } else {
          titles[video.id] = 'Untitled';
        }
      });
      setVideoTitles(titles);

      // Calculate total likes from all videos
      const totalLikes = videoData.reduce((sum, video) => sum + (video.likes_count || 0), 0);

      // Update stats with real data
      setUserStats({
        followers: profileResponse.data.user.followers_count || 0,
        following: profileResponse.data.user.following_count || 0,
        videos: videoData.length,
        likes: totalLikes,
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Gagal memuat profil pengguna');
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const loadUserPlaylists = async () => {
    try {
      setIsLoadingPlaylists(true);
      const response = await apiService.getUserPlaylists(userId);

      if (response.data?.success) {
        const playlistsData = response.data.data.map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          videoCount: playlist.videos_count || 0,
          thumbnails: playlist.videos?.slice(0, 4).map(v => v.thumbnail_url) || [],
          isPrivate: playlist.is_private,
        }));
        setPlaylists(playlistsData);
      }
    } catch (error) {
      console.error('Error loading user playlists:', error);
      setPlaylists([]);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const handleFollow = async () => {
    // CRASH FIX: Add comprehensive null checks
    if (!userId || !currentUser?.id) {
      console.error('Follow error: Missing userId or currentUser');
      return;
    }

    // Prevent following yourself
    if (Number(userId) === Number(currentUser.id)) {
      Alert.alert('Perhatian', 'Anda tidak bisa mengikuti diri sendiri');
      return;
    }

    // Prevent multiple clicks
    if (isFollowLoading) return;

    setIsFollowLoading(true);
    const previousState = isFollowing;
    const previousFollowers = userStats?.followers || 0;

    // Optimistic update
    setIsFollowing(!isFollowing);
    setUserStats(prev => ({
      ...prev,
      followers: isFollowing
        ? Math.max(0, (prev?.followers || 0) - 1)
        : (prev?.followers || 0) + 1,
    }));

    try {
      const response = await apiService.toggleFollow(userId);

      // DEFENSIVE: Check response structure before accessing
      if (response && response.data && typeof response.data.following !== 'undefined') {
        setIsFollowing(response.data.following);

        // Update followers count from server if available
        if (typeof response.data.followers_count !== 'undefined') {
          setUserStats(prev => ({
            ...prev,
            followers: response.data.followers_count,
          }));
        }
      } else {
        // If response invalid, keep optimistic update
        console.warn('Toggle follow response missing expected data, keeping optimistic update');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);

      // Revert on error
      setIsFollowing(previousState);
      setUserStats(prev => ({
        ...prev,
        followers: previousFollowers,
      }));

      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      if (errorMessage.includes('cannot follow yourself')) {
        Alert.alert('Perhatian', 'Anda tidak bisa mengikuti diri sendiri');
      } else {
        Alert.alert('Error', 'Gagal mengikuti pengguna. Silakan coba lagi.');
      }
    } finally {
      setIsFollowLoading(false);
    }
  };

  const formatCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const renderVideoItem = ({ item, isRepost = false }) => {
    // Get menu name from menu_data
    let menuName = null;
    if (item.menu_data) {
      try {
        const menuData = typeof item.menu_data === 'string'
          ? JSON.parse(item.menu_data)
          : item.menu_data;
        menuName = menuData.name || null;
      } catch (e) {
        // If parsing fails, menuName stays null
      }
    }

    return (
      <TouchableOpacity
        style={styles.gridItem}
        activeOpacity={0.8}
        onPress={() => {
          setSelectedVideo(item);
          setShowVideoPreview(true);
        }}
      >
        {isRepost && item.original_user && (
          <View style={styles.repostBadge}>
            <Ionicons name="repeat" size={10} color="#FFFFFF" />
            <Text style={styles.repostText} numberOfLines={1}>
              @{item.original_user.name}
            </Text>
          </View>
        )}
        <Image
          source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/200' }}
          style={styles.videoThumbnail}
          resizeMode="cover"
        />
        {menuName && (
          <View style={styles.menuOverlay}>
            <Text style={styles.menuText} numberOfLines={2}>
              {menuName}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    let message = 'No reposts yet';
    let icon = 'repeat';

    if (activeTab === 'post') {
      message = 'Belum ada postingan';
      icon = 'grid-outline';
    } else if (activeTab === 'tag') {
      message = 'Belum ada tag';
      icon = 'pricetag-outline';
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name={icon} size={64} color="#CCCCCC" />
        <Text style={styles.emptyStateText}>{message}</Text>
      </View>
    );
  };

  if (isLoadingVideos && !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          @{userData?.email?.split('@')[0] || 'user'}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {userData?.avatar_url ? (
                <Image source={{ uri: userData.avatar_url }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{userData?.name?.charAt(0).toUpperCase() || 'U'}</Text>
                </View>
              )}
            </View>

            {/* Username, Badge, and Stats */}
            <View style={styles.profileInfo}>
              {/* Username and Badge - Badge di KIRI */}
              <View style={styles.nameRow}>
                {userData?.badge_status === 'approved' && userData?.show_badge && (
                  <View style={[styles.badge, styles.badgeCreator]}>
                    <Text style={styles.badgeText}>CREATOR</Text>
                  </View>
                )}
                <Text style={styles.userName}>{userData?.name || 'User'}</Text>
              </View>

              {/* Stats in One Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatCount(userStats.followers)}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatCount(userStats.following)}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatCount(userStats.videos)}</Text>
                  <Text style={styles.statLabel}>Videos</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatCount(userStats.likes)}</Text>
                  <Text style={styles.statLabel}>Likes</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bio */}
          {userData?.bio ? (
            <Text style={styles.bio} numberOfLines={3}>
              {userData.bio}
            </Text>
          ) : null}

          {/* Website Link */}
          {userData?.website && (
            <TouchableOpacity
              style={styles.websiteContainer}
              onPress={() => {
                const url = userData.website.startsWith('http') ? userData.website : `https://${userData.website}`;
                require('react-native').Linking.openURL(url).catch(err => {
                  Alert.alert('Error', 'Tidak dapat membuka link');
                });
              }}
            >
              <Ionicons name="globe-outline" size={16} color="#06402B" />
              <Text style={styles.websiteText} numberOfLines={1}>
                {userData.website.length > 30 ? `${userData.website.substring(0, 30)}...` : userData.website}
              </Text>
            </TouchableOpacity>
          )}

          {/* Action Buttons */}
          {currentUser?.id && Number(userId) !== Number(currentUser.id) && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing && styles.followButtonActive,
                  isFollowLoading && styles.followButtonDisabled,
                ]}
                onPress={handleFollow}
                disabled={isFollowLoading}
              >
                {isFollowLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? "#FFFFFF" : "#000000"} />
                ) : (
                  <Text style={[
                    styles.followButtonText,
                    isFollowing && styles.followButtonTextActive
                  ]}>
                    {isFollowing ? 'Mengikuti' : 'Ikuti'}
                  </Text>
                )}
              </TouchableOpacity>            </View>
          )}
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'post' && styles.tabActive]}
            onPress={() => setActiveTab('post')}
          >
            <Ionicons name="grid" size={24} color={activeTab === 'post' ? '#000000' : '#999999'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'repost' && styles.tabActive]}
            onPress={() => setActiveTab('repost')}
          >
            <Ionicons name="repeat" size={24} color={activeTab === 'repost' ? '#000000' : '#999999'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tag' && styles.tabActive]}
            onPress={() => setActiveTab('tag')}
          >
            <Ionicons name="pricetag" size={24} color={activeTab === 'tag' ? '#000000' : '#999999'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'playlist' && styles.tabActive]}
            onPress={() => setActiveTab('playlist')}
          >
            <Ionicons name="list" size={24} color={activeTab === 'playlist' ? '#000000' : '#999999'} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoadingVideos ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000000" />
          </View>
        ) : activeTab === 'post' && videos.length > 0 ? (
          <View style={styles.gridContainer}>
            {videos.map((item, index) => (
              <React.Fragment key={item.id || index}>
                {renderVideoItem({ item })}
              </React.Fragment>
            ))}
          </View>
        ) : activeTab === 'repost' ? (
          <View style={styles.emptyState}>
            <Ionicons name="repeat-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyStateText}>Belum ada posting ulang</Text>
            <Text style={styles.emptyStateSubtext}>
              Video yang diposting ulang akan muncul di sini
            </Text>
          </View>
        ) : activeTab === 'tag' ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyStateText}>Belum ada video tagged</Text>
            <Text style={styles.emptyStateSubtext}>
              Video di mana user di-tag akan muncul di sini
            </Text>
          </View>
        ) : activeTab === 'playlist' ? (
          isLoadingPlaylists ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#06402B" />
            </View>
          ) : playlists.length > 0 ? (
            <View style={styles.playlistContainer}>
              {playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={styles.playlistItem}
                  onPress={() => navigation.navigate('PlaylistDetail', {
                    playlistId: playlist.id,
                    playlistName: playlist.name,
                  })}
                >
                  {/* Playlist Icon */}
                  <View style={styles.playlistIcon}>
                    <Ionicons name="albums" size={24} color="#06402B" />
                  </View>

                  {/* Playlist Info */}
                  <View style={styles.playlistInfo}>
                    <View style={styles.playlistNameRow}>
                      <Text style={styles.playlistName}>{playlist.name}</Text>
                      {playlist.isPrivate && (
                        <Ionicons name="lock-closed" size={14} color="#999999" style={{ marginLeft: 6 }} />
                      )}
                    </View>
                    <Text style={styles.playlistVideoCount}>{playlist.videoCount} videos</Text>
                  </View>

                  {/* Playlist Thumbnails */}
                  {playlist.thumbnails.length > 0 && (
                    <View style={styles.playlistThumbnails}>
                      {playlist.thumbnails.slice(0, 2).map((thumbnail, index) => (
                        <Image
                          key={index}
                          source={{ uri: thumbnail }}
                          style={styles.playlistThumbnail}
                          resizeMode="cover"
                        />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="albums-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyStateText}>Belum ada playlist</Text>
              <Text style={styles.emptyStateSubtext}>
                User ini belum membuat playlist publik
              </Text>
            </View>
          )
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* Video Preview Modal */}
      {selectedVideo && (
        <VideoPreviewModal
          visible={showVideoPreview}
          video={selectedVideo}
          onClose={() => {
            setShowVideoPreview(false);
            setSelectedVideo(null);
          }}
          currentUserId={currentUser?.id}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (ITEM_WIDTH) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F1E8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  headerButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#F5F1E8',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  badge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  badgeText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#000000',
  },
  badgeCreator: {
    backgroundColor: '#FFD700', // Gold
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  bio: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 12,
  },
  websiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 6,
  },
  websiteText: {
    fontSize: 14,
    color: '#06402B',
    marginLeft: 6,
    textDecorationLine: 'underline',
    flex: 1,
  },
  actionButtonsContainer: {
    marginTop: 4,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  followButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  followButtonTextActive: {
    color: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F5F1E8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#000000',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F5F1E8',
  },
  gridItem: {
    width: ITEM_WIDTH,
    backgroundColor: '#FFFFFF',
    marginBottom: ITEM_GAP,
    marginRight: ITEM_GAP,
  },
  videoThumbnail: {
    width: '100%',
    height: ITEM_WIDTH * 1.2,
    backgroundColor: '#E0E0E0',
  },
  repostBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
    zIndex: 1,
    maxWidth: ITEM_WIDTH - 20,
  },
  repostText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  menuText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 14,
  },
  emptyState: {
    paddingVertical: 100,
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#CCCCCC',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  playlistContainer: {
    padding: 16,
    backgroundColor: '#F5F1E8',
  },
  playlistItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EDE8D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    marginRight: 8,
  },
  playlistVideoCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  playlistThumbnails: {
    flexDirection: 'row',
    gap: 4,
  },
  playlistThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#E5E5E5',
  },
});

export default OtherUserProfileScreen;
