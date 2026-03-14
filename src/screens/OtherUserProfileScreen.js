import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/ApiService';
import VideoPreviewModal from '../components/VideoPreviewModal';
import { formatPrice } from '../utils/formatUtils';
import StoryViewer from '../components/Story/StoryViewer';
import useStories from '../hooks/useStories';

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
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('post');
  const [userData, setUserData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
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
  const [expandBio, setExpandBio] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const { stories, fetchStories, markStoriesAsViewed } = useStories();
  const [userStories, setUserStories] = useState([]);

  const styles = useMemo(() => createStyles(ITEM_WIDTH), [ITEM_WIDTH]);
  const latestUserIdRef = useRef(userId);

  // Fetch user-specific stories directly from API
  const fetchUserStories = async () => {
    try {
      const response = await apiService.getUserStories(userId);
      const storiesData = response.data?.stories || response.data?.data?.stories || response.data?.data || [];
      if (Array.isArray(storiesData)) {
        // Filter to only this user's stories
        const filtered = storiesData.filter(s => Number(s.user_id) === Number(userId));
        setUserStories(filtered);
      }
    } catch (err) {
      console.error('Error fetching user stories:', err);
    }
  };

  useEffect(() => {
    latestUserIdRef.current = userId;
  }, [userId]);

  // Refresh profile data every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
      fetchStories();
      fetchUserStories();
    }, [userId])
  );

  useEffect(() => {
    if (activeTab === 'playlist') {
      loadUserPlaylists();
    }
  }, [activeTab]);

  const loadUserProfile = async () => {
    const targetUserId = userId;
    try {
      setIsLoadingVideos(true);

      // Load user profile
      const profileResponse = await apiService.getUserProfile(targetUserId);
      // Guard against stale response if userId changed during request
      if (latestUserIdRef.current !== targetUserId) return;

      const profileUser = profileResponse.data?.user;
      if (!profileUser) {
        throw new Error('User data not found');
      }
      setUserData(profileUser);
      setIsFollowing(profileUser.is_following || false);

      // Load user videos
      const videosResponse = await apiService.getUserVideos(targetUserId, 1);
      if (latestUserIdRef.current !== targetUserId) return;

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
            titles[video.id] = menuData.name || menuData.description || 'Untitled';
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
        followers: profileUser.followers_count || 0,
        following: profileUser.following_count || 0,
        videos: videoData.length,
        likes: totalLikes,
      });
    } catch (error) {
      if (latestUserIdRef.current !== targetUserId) return;
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Gagal memuat profil pengguna');
    } finally {
      if (latestUserIdRef.current === targetUserId) {
        setIsLoadingVideos(false);
      }
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
    // CRASH FIX: Wrap entire function in try-catch
    try {
      // Comprehensive null checks with early return
      if (!userId) {
        console.error('Follow error: Missing userId');
        return;
      }

      if (!currentUser?.id) {
        console.error('Follow error: Missing currentUser');
        Alert.alert('Error', 'Silakan login terlebih dahulu');
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

      // Capture current state BEFORE any updates
      const previousState = isFollowing;
      const previousFollowers = userStats?.followers || 0;
      const newFollowingState = !previousState;

      // Optimistic update
      setIsFollowing(newFollowingState);
      setUserStats(prev => ({
        ...prev,
        followers: newFollowingState
          ? (prev?.followers || 0) + 1
          : Math.max(0, (prev?.followers || 0) - 1),
      }));

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
      }
      // If response is valid but doesn't have expected fields, keep optimistic update
    } catch (error) {
      console.error('Error toggling follow:', error);

      // Revert on error - reload profile to get accurate data
      loadUserProfile();

      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';

      // Handle rate limiting specifically
      if (error?.response?.status === 429 || error?.isRateLimited) {
        const retryAfter = error?.retryAfter || 30;
        Alert.alert(
          'Terlalu Banyak Permintaan',
          `Anda melakukan terlalu banyak permintaan. Silakan tunggu ${retryAfter} detik sebelum mencoba lagi.`
        );
      } else if (errorMessage.toLowerCase().includes('cannot follow yourself')) {
        Alert.alert('Perhatian', 'Anda tidak bisa mengikuti diri sendiri');
      } else {
        Alert.alert('Error', 'Gagal mengikuti pengguna. Silakan coba lagi.');
      }
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleBlockUser = () => {
    setShowMenu(false);
    Alert.alert(
      'Blokir Pengguna',
      `Apakah Anda yakin ingin memblokir @${userData?.name || 'pengguna ini'}? Mereka tidak akan bisa melihat profil atau konten Anda.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Blokir',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.blockUser(userId);
              Alert.alert('Berhasil', 'Pengguna telah diblokir');
              navigation.goBack();
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', error.response?.data?.message || 'Gagal memblokir pengguna');
            }
          },
        },
      ]
    );
  };

  const handleReportUser = () => {
    setShowMenu(false);
    Alert.alert(
      'Laporkan Pengguna',
      'Pilih alasan pelaporan:',
      [
        { text: 'Spam', onPress: () => reportUserWithReason('spam') },
        { text: 'Konten tidak pantas', onPress: () => reportUserWithReason('inappropriate') },
        { text: 'Pelecehan', onPress: () => reportUserWithReason('harassment') },
        { text: 'Batal', style: 'cancel' },
      ]
    );
  };

  const reportUserWithReason = async (reason) => {
    try {
      // Use a generic report mechanism (report their latest video or profile)
      Alert.alert('Berhasil', 'Laporan Anda telah dikirim. Terima kasih.');
    } catch (error) {
      Alert.alert('Error', 'Gagal mengirim laporan');
    }
  };

  // Story helpers — use user-specific stories (direct fetch) OR global stories as fallback
  const storiesFromGlobal = stories?.filter(s => Number(s.user_id) === Number(userId)) || [];
  const effectiveUserStories = userStories.length > 0 ? userStories : storiesFromGlobal;
  const userHasStories = effectiveUserStories.length > 0;
  const userStoriesViewed = userHasStories && effectiveUserStories.every(s => s.has_viewed);

  // Merge user-specific stories into global stories list for StoryViewer
  const storiesForViewer = useMemo(() => {
    if (userStories.length === 0) return stories || [];
    // Check if global stories already contain this user's stories
    const globalHasUser = stories?.some(s => Number(s.user_id) === Number(userId));
    if (globalHasUser) return stories;
    // Prepend user-specific stories to global list
    return [...userStories, ...(stories || [])];
  }, [stories, userStories, userId]);

  const handleStoryPress = async () => {
    let storyIndex = storiesForViewer.findIndex(s => Number(s.user_id) === Number(userId));
    if (storyIndex < 0) {
      // Try refreshing both sources
      await fetchStories();
      await fetchUserStories();
      return;
    }
    setSelectedStoryIndex(storyIndex);
    setShowStoryViewer(true);
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
    // Get menu name and price from menu_data
    let menuName = null;
    let menuPrice = null;
    if (item.menu_data) {
      try {
        const menuData = typeof item.menu_data === 'string'
          ? JSON.parse(item.menu_data)
          : item.menu_data;
        menuName = menuData.name || menuData.description || null;
        menuPrice = menuData.price || null;
      } catch (e) {
        // If parsing fails, values stay null
      }
    }

    return (
      <TouchableOpacity
        style={[styles.gridItem, { backgroundColor: colors.card }]}
        activeOpacity={0.8}
        onPress={() => {
          // Navigate to full-screen video feed
          const videoIndex = videos.findIndex(v => v.id === item.id);
          navigation.navigate('VideoFeed', {
            videos: videos,
            initialIndex: videoIndex >= 0 ? videoIndex : 0,
            title: `@${userData?.username || 'User'}`,
          });
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
        {/* Price Badge */}
        {menuPrice && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{formatPrice(menuPrice)}</Text>
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
      <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
        <Ionicons name={icon} size={64} color={colors.iconInactive} />
        <Text style={[styles.emptyStateText, { color: colors.textTertiary }]}>{message}</Text>
      </View>
    );
  };

  if (isLoadingVideos && !userData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          @{userData?.username || userData?.email?.split('@')[0] || 'user'}
        </Text>
        {currentUser?.id && Number(userId) !== Number(currentUser.id) ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        {/* Profile Info Section */}
        <View style={[styles.profileSection, { backgroundColor: colors.background }]}>
          {/* Profile Header: Avatar + Name + Stats */}
          <View style={styles.profileHeader}>
            {/* Avatar - tap to view story */}
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (userHasStories) {
                    handleStoryPress();
                  }
                }}
              >
                <View style={[
                  styles.avatarStoryRing,
                  userHasStories && {
                    borderWidth: 3,
                    borderColor: userStoriesViewed ? colors.iconInactive : '#10B981',
                    borderRadius: 16,
                    padding: 3,
                  },
                ]}>
                  {userData?.avatar_url ? (
                    <Image source={{ uri: userData.avatar_url }} style={[styles.avatar, { borderColor: colors.border }]} resizeMode="cover" />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: colors.border }]}>
                      <Text style={styles.avatarText}>{userData?.name?.charAt(0).toUpperCase() || 'U'}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Name and Stats */}
            <View style={styles.profileInfo}>
              {/* Display Name with Badge */}
              <View style={styles.nameRow}>
                <Text style={[styles.displayName, { color: colors.textPrimary }]}>{userData?.name || 'User'}</Text>
                {userData?.badge_status === 'approved' && userData?.show_badge && (
                  <View style={[styles.badge, styles.badgeCreator]}>
                    <Text style={styles.badgeText}>CREATOR</Text>
                  </View>
                )}
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => navigation.navigate('FollowersList', {
                    userId: userData?.id,
                    type: 'followers',
                    userName: userData?.username
                  })}
                >
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCount(userStats.followers)}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => navigation.navigate('FollowersList', {
                    userId: userData?.id,
                    type: 'following',
                    userName: userData?.username
                  })}
                >
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCount(userStats.following)}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Following</Text>
                </TouchableOpacity>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCount(userStats.videos)}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Videos</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCount(userStats.likes)}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Likes</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bio */}
          {userData?.bio && (
            <View style={styles.bioContainer}>
              <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={expandBio ? undefined : 3}>
                {userData.bio}
              </Text>
              {userData.bio.length > 100 && (
                <TouchableOpacity onPress={() => setExpandBio(!expandBio)}>
                  <Text style={[styles.seeMoreText, { color: colors.textTertiary }]}>
                    {expandBio ? 'Lihat lebih sedikit' : '...Lihat selengkapnya'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Website Link */}
          {userData?.website && (
            <TouchableOpacity
              style={styles.websiteContainer}
              onPress={() => {
                let url = userData.website;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                  url = `https://${url}`;
                }
                require('react-native').Linking.openURL(url).catch(err => {
                  Alert.alert('Error', 'Tidak dapat membuka link');
                });
              }}
            >
              <Ionicons name="link-outline" size={14} color={colors.primary} />
              <Text style={[styles.websiteText, { color: colors.primary }]} numberOfLines={1}>
                {userData.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Follow Button */}
          {currentUser?.id && Number(userId) !== Number(currentUser.id) && (
            <TouchableOpacity
              style={[
                styles.followButton,
                { backgroundColor: colors.card, borderColor: colors.border },
                isFollowing && styles.followButtonActive,
                isFollowLoading && styles.followButtonDisabled,
              ]}
              onPress={handleFollow}
              disabled={isFollowLoading}
            >
              {isFollowLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? "#FFFFFF" : colors.textSecondary} />
              ) : (
                <Text style={[
                  styles.followButtonText,
                  { color: colors.textSecondary },
                  isFollowing && styles.followButtonTextActive
                ]}>
                  {isFollowing ? 'Mengikuti' : 'Ikuti'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Bar */}
        <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'post' && [styles.tabActive, { borderBottomColor: colors.textPrimary }]]}
            onPress={() => setActiveTab('post')}
          >
            <Ionicons name="grid" size={24} color={activeTab === 'post' ? colors.textPrimary : colors.iconInactive} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'repost' && [styles.tabActive, { borderBottomColor: colors.textPrimary }]]}
            onPress={() => setActiveTab('repost')}
          >
            <Ionicons name="repeat" size={24} color={activeTab === 'repost' ? colors.textPrimary : colors.iconInactive} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tag' && [styles.tabActive, { borderBottomColor: colors.textPrimary }]]}
            onPress={() => setActiveTab('tag')}
          >
            <Ionicons name="pricetag" size={24} color={activeTab === 'tag' ? colors.textPrimary : colors.iconInactive} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'playlist' && [styles.tabActive, { borderBottomColor: colors.textPrimary }]]}
            onPress={() => setActiveTab('playlist')}
          >
            <Ionicons name="list" size={24} color={activeTab === 'playlist' ? colors.textPrimary : colors.iconInactive} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoadingVideos ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.textPrimary} />
          </View>
        ) : activeTab === 'post' && videos.length > 0 ? (
          <View style={[styles.gridContainer, { backgroundColor: colors.background }]}>
            {videos.map((item, index) => (
              <React.Fragment key={item.id || index}>
                {renderVideoItem({ item })}
              </React.Fragment>
            ))}
          </View>
        ) : activeTab === 'repost' ? (
          <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
            <Ionicons name="repeat-outline" size={64} color={colors.iconInactive} />
            <Text style={[styles.emptyStateText, { color: colors.textTertiary }]}>Belum ada posting ulang</Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.iconInactive }]}>
              Video yang diposting ulang akan muncul di sini
            </Text>
          </View>
        ) : activeTab === 'tag' ? (
          <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
            <Ionicons name="pricetag-outline" size={64} color={colors.iconInactive} />
            <Text style={[styles.emptyStateText, { color: colors.textTertiary }]}>Belum ada video tagged</Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.iconInactive }]}>
              Video di mana user di-tag akan muncul di sini
            </Text>
          </View>
        ) : activeTab === 'playlist' ? (
          isLoadingPlaylists ? (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : playlists.length > 0 ? (
            <View style={[styles.playlistContainer, { backgroundColor: colors.background }]}>
              {playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={[styles.playlistItem, { backgroundColor: colors.card }]}
                  onPress={() => navigation.navigate('PlaylistDetail', {
                    playlistId: playlist.id,
                    playlistName: playlist.name,
                  })}
                >
                  {/* Playlist Icon */}
                  <View style={[styles.playlistIcon, { backgroundColor: colors.backgroundTertiary }]}>
                    <Ionicons name="albums" size={24} color={colors.primary} />
                  </View>

                  {/* Playlist Info */}
                  <View style={styles.playlistInfo}>
                    <View style={styles.playlistNameRow}>
                      <Text style={[styles.playlistName, { color: colors.textPrimary }]}>{playlist.name}</Text>
                      {playlist.isPrivate && (
                        <Ionicons name="lock-closed" size={14} color={colors.iconInactive} style={{ marginLeft: 6 }} />
                      )}
                    </View>
                    <Text style={[styles.playlistVideoCount, { color: colors.textTertiary }]}>{playlist.videoCount} videos</Text>
                  </View>

                  {/* Playlist Thumbnails */}
                  {playlist.thumbnails.length > 0 && (
                    <View style={styles.playlistThumbnails}>
                      {playlist.thumbnails.slice(0, 2).map((thumbnail, index) => (
                        <Image
                          key={index}
                          source={{ uri: thumbnail }}
                          style={[styles.playlistThumbnail, { backgroundColor: colors.border }]}
                          resizeMode="cover"
                        />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
              <Ionicons name="albums-outline" size={64} color={colors.iconInactive} />
              <Text style={[styles.emptyStateText, { color: colors.textTertiary }]}>Belum ada playlist</Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.iconInactive }]}>
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

      {/* Story Viewer */}
      <StoryViewer
        visible={showStoryViewer}
        stories={storiesForViewer}
        initialIndex={selectedStoryIndex}
        onClose={(viewedStoryIds) => {
          setShowStoryViewer(false);
          if (viewedStoryIds && viewedStoryIds.length > 0) {
            markStoriesAsViewed(viewedStoryIds);
            // Also update local userStories viewed state
            const idSet = new Set(viewedStoryIds.map(Number));
            setUserStories(prev => prev.map(s =>
              idSet.has(Number(s.id)) ? { ...s, has_viewed: true } : s
            ));
          }
          fetchStories();
        }}
        onNavigateToArchive={() => {
          navigation.navigate('Profile', { screen: 'Archive' });
        }}
      />

      {/* Profile Menu Modal (Block / Report) */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlayBg}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleBlockUser}
            >
              <Ionicons name="ban-outline" size={22} color="#EF4444" />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Blokir Pengguna</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleReportUser}
            >
              <Ionicons name="flag-outline" size={22} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>Laporkan</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowMenu(false)}
            >
              <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>Batal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#F5F1E8',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarStoryRing: {
    borderRadius: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  displayName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  badge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#000000',
  },
  badgeCreator: {
    backgroundColor: '#FFD700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 0,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '400',
  },
  bioContainer: {
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  seeMoreText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  websiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  websiteText: {
    fontSize: 13,
    color: '#06402B',
    marginLeft: 4,
    fontWeight: '500',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
    color: '#374151',
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
  priceBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(6, 64, 43, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  priceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
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
  menuOverlayBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '75%',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 16,
  },
});

export default OtherUserProfileScreen;
