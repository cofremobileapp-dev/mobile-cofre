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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/ApiService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import VideoPreviewModal from '../components/VideoPreviewModal';

import { formatPrice } from '../utils/formatUtils';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import StoryViewer from '../components/Story/StoryViewer';
import useStories from '../hooks/useStories';
import HighlightsBar from '../components/HighlightsBar';

// Grid calculation constants
const COLUMNS = 3;
const ITEM_GAP = 1;

const ProfileScreen = () => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  // Calculate item width: account for margins (each item has marginRight except last in row)
  // We need to subtract total margins from available width
  const TOTAL_MARGINS = COLUMNS * ITEM_GAP; // Each item has marginRight and marginBottom
  const ITEM_WIDTH = Math.floor((SCREEN_WIDTH - TOTAL_MARGINS) / COLUMNS);
  const { user, logout, isAdmin, refreshUser } = useAuth();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('post');
  const [videos, setVideos] = useState([]);
  const [reposts, setReposts] = useState([]);
  const [taggedVideos, setTaggedVideos] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [isLoadingReposts, setIsLoadingReposts] = useState(false);
  const [isLoadingTagged, setIsLoadingTagged] = useState(false);
  const [userStats, setUserStats] = useState({
    followers: 0,
    following: 0,
    videos: 0,
    likes: 0,
  });

  const styles = useMemo(() => createStyles(ITEM_WIDTH), [ITEM_WIDTH]);

  // Playlists state
  const [playlists, setPlaylists] = useState([]);

  // Edit Profile Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFullname, setEditFullname] = useState(user?.name || '');
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editWebsite, setEditWebsite] = useState(user?.website || '');
  const [accountType, setAccountType] = useState(user?.account_type || 'regular');
  const [showBadge, setShowBadge] = useState(user?.show_badge ?? true);
  const [avatarUri, setAvatarUri] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandBio, setExpandBio] = useState(false);

  // Video Preview Modal States
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Playlist Modal States
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [isPlaylistPrivate, setIsPlaylistPrivate] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stories integration
  const { stories, loading: storiesLoading, fetchStories, markStoriesAsViewed } = useStories();
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  useEffect(() => {
    loadUserVideos();
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserVideos();
      if (refreshUser) refreshUser();
      if (activeTab === 'playlist') loadPlaylists();
    }, [])
  );

  // Sync follower/following counts when user data updates (e.g. after refreshUser)
  useEffect(() => {
    if (user?.followers_count !== undefined || user?.following_count !== undefined) {
      setUserStats(prev => ({
        ...prev,
        followers: user?.followers_count || 0,
        following: user?.following_count || 0,
      }));
    }
  }, [user?.followers_count, user?.following_count]);

  useEffect(() => {
    if (activeTab === 'repost') {
      loadReposts();
    } else if (activeTab === 'tag') {
      loadTaggedVideos();
    } else if (activeTab === 'playlist') {
      loadPlaylists();
    }
  }, [activeTab]);

  const loadUserVideos = async () => {
    try {
      setIsLoadingVideos(true);
      const response = await apiService.getMyVideos(1);
      const videoData = response.data.data || [];
      setVideos(videoData);

      const totalLikes = videoData.reduce((sum, video) => sum + (video.likes_count || 0), 0);

      setUserStats({
        followers: user?.followers_count || 0,
        following: user?.following_count || 0,
        videos: videoData.length,
        likes: totalLikes,
      });
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const loadReposts = async () => {
    try {
      setIsLoadingReposts(true);
      const response = await apiService.getMyReposts(1);
      const repostData = response.data.data || [];
      setReposts(repostData);
    } catch (error) {
      console.error('Error loading reposts:', error);
      setReposts([]);
    } finally {
      setIsLoadingReposts(false);
    }
  };

  const loadTaggedVideos = async () => {
    if (!user?.id) return;
    try {
      setIsLoadingTagged(true);
      const response = await apiService.getTaggedVideos(user.id);
      const taggedData = response.data.data || [];
      setTaggedVideos(taggedData);
    } catch (error) {
      console.error('Error loading tagged videos:', error);
      setTaggedVideos([]);
    } finally {
      setIsLoadingTagged(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              console.log('✅ Logout successful');
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', 'Gagal logout. Silakan coba lagi.');
            }
          }
        }
      ]
    );
  };

  const handlePickAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'You need to allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsUpdating(true);

      // Upload avatar first if there's a new one
      if (avatarUri) {
        try {
          console.log('📸 Uploading new avatar...');
          const uploadResult = await apiService.uploadAvatar(avatarUri);
          console.log('✅ Avatar uploaded:', uploadResult.data);

          // ✨ FIX: Immediately update user state with new avatar URL
          if (uploadResult.data.avatar_url) {
            const updatedUser = {
              ...user,
              avatar_url: uploadResult.data.avatar_url
            };
            // Update local state immediately for instant UI update
            await refreshUser();
            console.log('✅ User state updated with new avatar');
          }
        } catch (avatarError) {
          console.error('❌ Error uploading avatar:', avatarError);
          Alert.alert(
            'Upload Error',
            'Gagal upload photo profile. Pastikan:\n- File adalah gambar (JPG/PNG)\n- Ukuran max 5MB\n- Koneksi internet stabil',
            [
              { text: 'Coba Lagi', style: 'cancel', onPress: () => setIsUpdating(false) },
              { text: 'Skip Photo', onPress: async () => {
                // Continue without photo
                await updateProfileData();
              }}
            ]
          );
          return;
        }
      }

      // Update profile data
      await updateProfileData();

    } catch (error) {
      console.error('❌ Error updating profile:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Gagal memperbarui profile';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateProfileData = async () => {
    const updateData = {
      name: editFullname,
      username: editUsername,
      bio: editBio,
      account_type: accountType,
      website: editWebsite,
    };

    console.log('📝 Updating profile data...', updateData);
    await apiService.updateProfile(updateData);

    // Refresh user data to update UI immediately
    const refreshResult = await refreshUser();

    if (refreshResult.success) {
      Alert.alert('Success', 'Profile berhasil diperbarui!');
      setShowEditModal(false);
      setAvatarUri(null);

      // Reload videos to update any cached user data
      await loadUserVideos();
    } else {
      Alert.alert('Warning', 'Profile updated but failed to refresh data. Please restart the app.');
      setShowEditModal(false);
    }
  };

  const loadPlaylists = async () => {
    try {
      const response = await apiService.getPlaylists();
      console.log('📚 [ProfileScreen] Playlists response:', response.data);

      // Backend returns: { success: true, data: [...] }
      // So we need to access response.data.data
      const playlistsArray = response.data?.data || [];

      const playlistsData = Array.isArray(playlistsArray)
        ? playlistsArray.map(playlist => ({
            id: playlist.id,
            name: playlist.name,
            videoCount: playlist.videos_count || 0,
            thumbnails: playlist.videos?.slice(0, 4).map(v => v.thumbnail_url) || [],
            isPrivate: playlist.is_private || false,
          }))
        : [];

      console.log('📚 [ProfileScreen] Mapped playlists:', playlistsData);
      setPlaylists(playlistsData);
    } catch (error) {
      console.error('❌ [ProfileScreen] Error loading playlists:', error);
      Alert.alert('Error', 'Gagal memuat playlist');
    }
  };

  const handleCreatePlaylist = () => {
    setPlaylistName('');
    setPlaylistDescription('');
    setIsPlaylistPrivate(false);
    setIsPrivate(false);
    setShowPlaylistModal(true);
  };

  const handleSubmitPlaylist = async () => {
    if (!playlistName.trim()) {
      Alert.alert('Error', 'Nama playlist tidak boleh kosong');
      return;
    }

    try {
      setIsCreatingPlaylist(true);
      const response = await apiService.createPlaylist({
        name: playlistName.trim(),
        description: playlistDescription.trim(),
        is_private: isPlaylistPrivate,
      });

      if (response.data?.success) {
        Alert.alert('Success', `Playlist "${playlistName}" berhasil dibuat!`);
        setShowPlaylistModal(false);
        setPlaylistName('');
        setPlaylistDescription('');
        setIsPlaylistPrivate(false);
        // Reload playlists from API
        await loadPlaylists();
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', error.response?.data?.message || 'Gagal membuat playlist. Silakan coba lagi.');
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const openEditProfileModal = () => {
    setEditFullname(user?.name || '');
    setEditUsername(user?.username || '');
    setEditBio(user?.bio || '');
    setEditWebsite(user?.website || '');
    setAccountType(user?.account_type || 'regular');
    setShowBadge(user?.show_badge ?? true);
    setAvatarUri(null);
    setShowEditModal(true);
  };

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleVideoPress = (video) => {
    // Use the correct video list based on active tab
    let videoList;
    let title;
    if (activeTab === 'repost') {
      videoList = reposts;
      title = 'Repost Saya';
    } else if (activeTab === 'tag') {
      videoList = taggedVideos;
      title = 'Video Ditandai';
    } else {
      videoList = videos;
      title = 'Video Saya';
    }

    const videoIndex = videoList.findIndex(v => v.id === video.id);
    navigation.navigate('VideoFeed', {
      videos: videoList,
      initialIndex: videoIndex >= 0 ? videoIndex : 0,
      title,
    });
  };

  const handleVideoPreviewClose = (shouldReload) => {
    setShowVideoPreview(false);
    setSelectedVideo(null);

    // Reload videos if video was deleted
    if (shouldReload) {
      loadUserVideos();
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadUserVideos(),
        refreshUser(),
        fetchStories(),
        activeTab === 'playlist' ? loadPlaylists() : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setIsRefreshing(false);
    }
  };


  // Story handlers
  const handleStoryPress = async (storyIndex, userId) => {
    if (storyIndex < 0 || !stories?.[storyIndex]) {
      // Refresh stories - use returned data (closure stories is stale after await)
      const freshStories = await fetchStories() || [];
      const newIndex = freshStories?.findIndex(s => Number(s.user_id) === Number(userId));
      if (newIndex >= 0 && freshStories?.[newIndex]) {
        setSelectedStoryIndex(newIndex);
        setShowStoryViewer(true);
      }
      return;
    }
    setSelectedStoryIndex(storyIndex);
    setShowStoryViewer(true);
  };

  const handleAddStory = () => {
    navigation.navigate('StoryCamera');
  };

  const renderVideoItem = ({ item, isRepost = false }) => {
    // Parse menu_data if it's a string
    let menuData = null;
    try {
      menuData = typeof item.menu_data === 'string' ? JSON.parse(item.menu_data) : item.menu_data;
    } catch (e) {
      menuData = null;
    }

    return (
      <TouchableOpacity
        style={styles.gridItem}
        activeOpacity={0.8}
        onPress={() => handleVideoPress(item)}
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
        {/* Price Badge */}
        {menuData?.price && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{formatPrice(menuData.price)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
      <Ionicons name="videocam-outline" size={64} color={colors.iconInactive} />
      <Text style={[styles.emptyStateText, { color: colors.iconInactive }]}>Belum ada video</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>@{user?.username || user?.email?.split('@')[0] || 'user'}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {/* Profile Info Section */}
        <View style={[styles.profileSection, { backgroundColor: colors.background }]}>
          {/* Profile Header: Avatar + Name + Stats */}
          <View style={styles.profileHeader}>
            {/* Avatar - tap to view own story */}
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  const userHasStories = stories?.some(s => Number(s.user_id) === user?.id);
                  if (userHasStories) {
                    const storyIndex = stories.findIndex(s => Number(s.user_id) === user?.id);
                    handleStoryPress(storyIndex, user.id);
                  } else {
                    handleAddStory();
                  }
                }}
              >
                <View style={[
                  styles.avatarStoryRing,
                  stories?.some(s => Number(s.user_id) === user?.id) && {
                    borderWidth: 3,
                    borderColor: colors.iconInactive,
                    borderRadius: 16,
                    padding: 3,
                  },
                ]}>
                  {user?.avatar_url ? (
                    <Image
                      source={{
                        uri: `${user.avatar_url}?t=${Date.now()}`
                      }}
                      style={styles.avatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              {/* Add Story "+" badge */}
              <TouchableOpacity
                style={styles.avatarAddBadge}
                activeOpacity={0.7}
                onPress={handleAddStory}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Name and Stats */}
            <View style={styles.profileInfo}>
              {/* Display Name with Badge */}
              <View style={styles.nameRow}>
                <Text style={[styles.displayName, { color: colors.textPrimary }]}>{user?.name || 'User'}</Text>
                {user?.badge_status === 'approved' && user?.show_badge && (
                  <View style={[styles.badge, styles.badgeCreator]}>
                    <Text style={styles.badgeText}>CREATOR</Text>
                  </View>
                )}
                {user?.badge_status === 'pending' && (
                  <View style={[styles.badge, styles.badgePending]}>
                    <Text style={styles.badgeText}>REVIEW</Text>
                  </View>
                )}
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => navigation.navigate('FollowersList', {
                    userId: user?.id,
                    type: 'followers',
                    userName: user?.username
                  })}
                >
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCount(userStats.followers)}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => navigation.navigate('FollowersList', {
                    userId: user?.id,
                    type: 'following',
                    userName: user?.username
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
          {user?.bio && (
            <View style={styles.bioContainer}>
              <Text
                style={[styles.bio, { color: colors.textSecondary }]}
                numberOfLines={expandBio ? undefined : 3}
              >
                {user.bio}
              </Text>
              {user.bio.length > 100 && (
                <TouchableOpacity onPress={() => setExpandBio(!expandBio)}>
                  <Text style={[styles.seeMoreText, { color: colors.textTertiary }]}>
                    {expandBio ? 'Lihat lebih sedikit' : '...Lihat selengkapnya'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Website Link */}
          {user?.website && (
            <TouchableOpacity
              style={styles.websiteContainer}
              onPress={() => {
                let url = user.website;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                  url = `https://${url}`;
                }
                Linking.openURL(url).catch(err => {
                  Alert.alert('Error', 'Tidak dapat membuka link');
                });
              }}
            >
              <Ionicons name="link-outline" size={14} color={colors.primary} />
              <Text style={[styles.websiteText, { color: colors.primary }]} numberOfLines={1}>
                {user.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Edit Profile Button - Outlined Style */}
          <TouchableOpacity style={[styles.editProfileButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={openEditProfileModal}>
            <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.editProfileButtonText, { color: colors.textSecondary }]}>{t('editProfile')}</Text>
          </TouchableOpacity>

          {/* Badge Application Button */}
          {user?.badge_status === null && (
            <TouchableOpacity
              style={[styles.badgeApplicationButton, { borderColor: colors.primary }]}
              onPress={() => navigation.navigate('BadgeApplication')}
            >
              <Ionicons name="ribbon-outline" size={18} color={colors.primary} />
              <Text style={[styles.badgeApplicationText, { color: colors.primary }]}>Ajukan Badge Creator</Text>
            </TouchableOpacity>
          )}

          {user?.badge_status === 'rejected' && (
            <TouchableOpacity
              style={styles.badgeReapplyButton}
              onPress={() => {
                Alert.alert(
                  'Ajukan Ulang Badge',
                  `Alasan penolakan: ${user.badge_rejection_reason || 'Tidak ada alasan'}\n\nApakah Anda ingin mengajukan ulang?`,
                  [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'Ajukan Ulang', onPress: () => navigation.navigate('BadgeApplication') }
                  ]
                );
              }}
            >
              <Ionicons name="refresh-outline" size={18} color="#EF4444" />
              <Text style={styles.badgeReapplyText}>Ajukan Ulang Badge</Text>
            </TouchableOpacity>
          )}

          {/* Logout Button (for testing) */}
          {isAdmin && (
            <TouchableOpacity style={[styles.actionButton, { marginTop: 8, borderColor: colors.border }]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color={colors.textPrimary} />
              <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>{t('logout')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Highlights */}
        <HighlightsBar
          userId={user?.id}
          isOwnProfile={true}
          onHighlightPress={(highlight) => {
            navigation.navigate('HighlightViewer', { highlight });
          }}
        />

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
        ) : activeTab === 'playlist' ? (
          <View style={[styles.playlistContainer, { backgroundColor: colors.background }]}>
            {/* Create New Playlist Button */}
            <TouchableOpacity style={[styles.createPlaylistButton, { backgroundColor: colors.primary }]} onPress={handleCreatePlaylist}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createPlaylistText}>Create New Playlist</Text>
            </TouchableOpacity>

            {/* Playlists List or Empty State */}
            {playlists.length > 0 ? (
              playlists.map((playlist) => (
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
                        <Ionicons name="lock-closed" size={14} color={colors.textTertiary} style={{ marginLeft: 6 }} />
                      )}
                    </View>
                    <Text style={[styles.playlistVideoCount, { color: colors.textTertiary }]}>
                      {playlist.videoCount} video{playlist.videoCount !== 1 ? 's' : ''}
                    </Text>
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
              ))
            ) : (
              <View style={[styles.emptyPlaylistState, { backgroundColor: colors.background }]}>
                <Ionicons name="albums-outline" size={64} color={colors.iconInactive} />
                <Text style={[styles.emptyStateText, { color: colors.iconInactive }]}>Belum ada playlist</Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.iconInactive }]}>
                  Buat playlist pertama Anda untuk mengorganisir video favorit
                </Text>
              </View>
            )}
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
          isLoadingReposts ? (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : reposts.length > 0 ? (
            <View style={[styles.gridContainer, { backgroundColor: colors.background }]}>
              {reposts.map((item, index) => (
                <React.Fragment key={item.id || index}>
                  {renderVideoItem({ item, isRepost: true })}
                </React.Fragment>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
              <Ionicons name="repeat-outline" size={64} color={colors.iconInactive} />
              <Text style={[styles.emptyStateText, { color: colors.iconInactive }]}>Belum ada posting ulang</Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.iconInactive }]}>
                Video yang Anda posting ulang akan muncul di sini
              </Text>
            </View>
          )
        ) : activeTab === 'tag' ? (
          isLoadingTagged ? (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : taggedVideos.length > 0 ? (
            <View style={[styles.gridContainer, { backgroundColor: colors.background }]}>
              {taggedVideos.map((item, index) => (
                <React.Fragment key={item.id || index}>
                  {renderVideoItem({ item })}
                </React.Fragment>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
              <Ionicons name="pricetag-outline" size={64} color={colors.iconInactive} />
              <Text style={[styles.emptyStateText, { color: colors.iconInactive }]}>Belum ada video tagged</Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.iconInactive }]}>
                Video di mana Anda di-tag akan muncul di sini
              </Text>
            </View>
          )
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent={true} onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.editModalContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.editModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.editModalTitle, { color: colors.textPrimary }]}>{t('editProfile')}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.avatarSection}>
                <TouchableOpacity style={styles.avatarEditContainer} onPress={handlePickAvatar}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  ) : user?.avatar_url ? (
                    <Image
                      source={{ uri: `${user.avatar_url}?t=${Date.now()}` }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>{editFullname?.charAt(0).toUpperCase() || 'U'}</Text>
                    </View>
                  )}
                  <View style={styles.avatarUploadIcon}>
                    <Ionicons name="camera" size={20} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <Text style={[styles.avatarHintText, { color: colors.textTertiary }]}>Tap to change photo</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Username</Text>
                <View style={[styles.usernameInputContainer, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
                  <Text style={[styles.usernamePrefix, { color: colors.textTertiary }]}>@</Text>
                  <TextInput
                    style={[styles.usernameInput, { color: colors.textPrimary }]}
                    value={editUsername}
                    onChangeText={(text) => {
                      // Only allow alphanumeric, dots, and underscores
                      const cleanText = text.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase();
                      setEditUsername(cleanText);
                    }}
                    placeholder="username"
                    placeholderTextColor={colors.iconInactive}
                    autoCapitalize="none"
                    maxLength={30}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Nama Lengkap</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border, color: colors.textPrimary }]}
                  value={editFullname}
                  onChangeText={setEditFullname}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor={colors.iconInactive}
                  maxLength={255}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Bio</Text>
                <TextInput
                  style={[styles.textInput, styles.bioInput, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border, color: colors.textPrimary }]}
                  value={editBio}
                  onChangeText={(text) => {
                    if (text.length <= 150) setEditBio(text);
                  }}
                  placeholder="Tell people about yourself..."
                  placeholderTextColor={colors.iconInactive}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={[styles.charCounter, { color: colors.iconInactive }]}>{editBio.length}/150</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Website (Opsional)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border, color: colors.textPrimary }]}
                  value={editWebsite}
                  onChangeText={setEditWebsite}
                  placeholder="https://yourwebsite.com"
                  placeholderTextColor={colors.iconInactive}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              {/* Account Type Badge Selector */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Account Type</Text>
                <View style={styles.badgeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.badgeOption,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      accountType === 'regular' && [styles.badgeOptionActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                    ]}
                    onPress={() => setAccountType('regular')}
                  >
                    <Text style={[
                      styles.badgeOptionText,
                      { color: colors.textTertiary },
                      accountType === 'regular' && styles.badgeOptionTextActive
                    ]}>Regular</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.badgeOption,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      accountType === 'creator' && [styles.badgeOptionActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                      user?.badge_status !== 'approved' && styles.badgeOptionDisabled
                    ]}
                    onPress={() => {
                      if (user?.badge_status === 'approved') {
                        setAccountType('creator');
                      }
                    }}
                    disabled={user?.badge_status !== 'approved'}
                  >
                    <Text style={[
                      styles.badgeOptionText,
                      { color: colors.textTertiary },
                      accountType === 'creator' && styles.badgeOptionTextActive
                    ]}>Creator</Text>
                  </TouchableOpacity>
                </View>
                {user?.badge_status !== 'approved' && (
                  <Text style={[styles.helperText, { color: colors.iconInactive }]}>
                    Ajukan badge creator untuk mengaktifkan opsi ini
                  </Text>
                )}
              </View>

              {/* Badge Visibility Toggle */}
              {user?.badge_status === 'approved' && (
                <View style={styles.inputGroup}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Tampilkan Badge Creator</Text>
                      <Text style={[styles.settingDescription, { color: colors.textTertiary }]}>
                        Tampilkan badge creator di profil Anda
                      </Text>
                    </View>
                    <Switch
                      value={showBadge}
                      onValueChange={async (value) => {
                        setShowBadge(value);
                        try {
                          await apiService.toggleBadgeVisibility(value);
                          await refreshUser();
                        } catch (error) {
                          console.error('Failed to toggle badge visibility:', error);
                          Alert.alert('Error', 'Gagal mengubah visibilitas badge');
                          setShowBadge(!value); // Revert on error
                        }
                      }}
                      trackColor={{ false: colors.border, true: '#86EFAC' }}
                      thumbColor={showBadge ? colors.primary : colors.backgroundTertiary}
                    />
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowEditModal(false)}>
                  <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Playlist Modal */}
      <Modal visible={showPlaylistModal} animationType="slide" transparent={true} onRequestClose={() => setShowPlaylistModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.playlistModalContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.playlistModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.playlistModalTitle, { color: colors.textPrimary }]}>Buat Playlist Baru</Text>
              <TouchableOpacity onPress={() => setShowPlaylistModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.playlistModalContent}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Nama Playlist</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border, color: colors.textPrimary }]}
                  value={playlistName}
                  onChangeText={setPlaylistName}
                  placeholder="Contoh: Resep Favorit"
                  placeholderTextColor={colors.iconInactive}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Deskripsi (Opsional)</Text>
                <TextInput
                  style={[styles.textInput, styles.descriptionInput, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border, color: colors.textPrimary }]}
                  value={playlistDescription}
                  onChangeText={(text) => {
                    if (text.length <= 200) setPlaylistDescription(text);
                  }}
                  placeholder="Tambahkan deskripsi playlist..."
                  placeholderTextColor={colors.iconInactive}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <Text style={[styles.charCounter, { color: colors.iconInactive }]}>{playlistDescription.length}/200</Text>
              </View>

              <View style={styles.inputGroup}>
                <View style={[styles.privacyToggleContainer, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
                  <View style={styles.privacyToggleInfo}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Playlist Pribadi</Text>
                    <Text style={[styles.privacyToggleDescription, { color: colors.textTertiary }]}>
                      Hanya Anda yang bisa melihat playlist ini
                    </Text>
                  </View>
                  <Switch
                    value={isPlaylistPrivate}
                    onValueChange={setIsPlaylistPrivate}
                    trackColor={{ false: colors.border, true: '#86EFAC' }}
                    thumbColor={isPlaylistPrivate ? colors.primary : colors.backgroundTertiary}
                    ios_backgroundColor={colors.border}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowPlaylistModal(false)}>
                  <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, isCreatingPlaylist && styles.saveButtonDisabled]}
                  onPress={handleSubmitPlaylist}
                  disabled={isCreatingPlaylist}
                >
                  {isCreatingPlaylist ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Buat</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Video Preview Modal */}
      <VideoPreviewModal
        visible={showVideoPreview}
        video={selectedVideo}
        onClose={handleVideoPreviewClose}
        currentUserId={user?.id}
      />

      {/* Story Viewer Modal */}
      <StoryViewer
        visible={showStoryViewer}
        stories={stories}
        initialIndex={selectedStoryIndex}
        onClose={(viewedStoryIds) => {
          setShowStoryViewer(false);
          if (viewedStoryIds && viewedStoryIds.length > 0) {
            markStoriesAsViewed(viewedStoryIds);
          }
          fetchStories();
        }}
        onStoryChange={(index) => setSelectedStoryIndex(index)}
        onNavigateToArchive={() => {
          navigation.navigate('Archive');
        }}
      />

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
    position: 'relative',
  },
  avatarAddBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10B981',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
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
  badgeCreator: {
    backgroundColor: '#FFD700',
  },
  badgePending: {
    backgroundColor: '#FFA500',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#000000',
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
    borderRightWidth: 0,
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
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 0,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 4,
    paddingVertical: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  editProfileButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  badgeApplicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F7EF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#06402B',
  },
  badgeApplicationText: {
    color: '#06402B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  badgeReapplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  badgeReapplyText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F5F1E8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  priceBadge: {
    position: 'absolute',
    bottom: 4,
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
  repostText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  editModalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarEditContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarUploadIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarHintText: {
    fontSize: 12,
    color: '#666666',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
  },
  usernamePrefix: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000000',
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  charCounter: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
    marginTop: 4,
  },
  badgeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  badgeOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  badgeOptionActive: {
    backgroundColor: '#06402B',
    borderColor: '#06402B',
  },
  badgeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  badgeOptionTextActive: {
    color: '#FFFFFF',
  },
  badgeOptionDisabled: {
    opacity: 0.5,
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Playlist Styles
  playlistContainer: {
    padding: 16,
    backgroundColor: '#F5F1E8',
  },
  createPlaylistButton: {
    backgroundColor: '#06402B',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  createPlaylistText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 4,
  },
  playlistName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  playlistVideoCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyPlaylistState: {
    paddingVertical: 80,
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
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
  // Playlist Modal Styles
  playlistModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  playlistModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  playlistModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  playlistModalContent: {
    padding: 20,
  },
  descriptionInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  privacyToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  privacyToggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  privacyToggleDescription: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
});

export default ProfileScreen;
