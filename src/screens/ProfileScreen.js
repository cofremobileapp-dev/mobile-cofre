import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/ApiService';
import { useNavigation } from '@react-navigation/native';
import VideoPreviewModal from '../components/VideoPreviewModal';
import HighlightsBar from '../components/HighlightsBar';
import { formatPrice } from '../utils/formatUtils';

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
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
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

  useEffect(() => {
    loadUserVideos();
  }, []);

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
    // Navigate to full-screen video feed
    const videoIndex = videos.findIndex(v => v.id === video.id);
    navigation.navigate('VideoFeed', {
      videos: videos,
      initialIndex: videoIndex >= 0 ? videoIndex : 0,
      title: 'Video Saya',
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
    <View style={styles.emptyState}>
      <Ionicons name="videocam-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyStateText}>Belum ada video</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F1E8" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{user?.username || user?.email?.split('@')[0] || 'user'}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          {/* Profile Header: Avatar + Name + Stats */}
          <View style={styles.profileHeader}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {user?.avatar_url ? (
                <Image
                  source={{
                    uri: `${user.avatar_url}?t=${Date.now()}` // Cache busting
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

            {/* Name and Stats */}
            <View style={styles.profileInfo}>
              {/* Display Name with Badge */}
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{user?.name || 'User'}</Text>
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
                  <Text style={styles.statValue}>{formatCount(userStats.followers)}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => navigation.navigate('FollowersList', {
                    userId: user?.id,
                    type: 'following',
                    userName: user?.username
                  })}
                >
                  <Text style={styles.statValue}>{formatCount(userStats.following)}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
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
          {user?.bio && (
            <View style={styles.bioContainer}>
              <Text
                style={styles.bio}
                numberOfLines={expandBio ? undefined : 3}
              >
                {user.bio}
              </Text>
              {user.bio.length > 100 && (
                <TouchableOpacity onPress={() => setExpandBio(!expandBio)}>
                  <Text style={styles.seeMoreText}>
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
              <Ionicons name="link-outline" size={14} color="#06402B" />
              <Text style={styles.websiteText} numberOfLines={1}>
                {user.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Edit Profile Button - Outlined Style */}
          <TouchableOpacity style={styles.editProfileButton} onPress={openEditProfileModal}>
            <Ionicons name="create-outline" size={18} color="#374151" />
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Badge Application Button */}
          {user?.badge_status === null && (
            <TouchableOpacity
              style={styles.badgeApplicationButton}
              onPress={() => navigation.navigate('BadgeApplication')}
            >
              <Ionicons name="ribbon-outline" size={18} color="#06402B" />
              <Text style={styles.badgeApplicationText}>Ajukan Badge Creator</Text>
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
            <TouchableOpacity style={[styles.actionButton, { marginTop: 8 }]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#000000" />
              <Text style={styles.actionButtonText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Story Highlights */}
        <HighlightsBar
          userId={user?.id}
          isOwnProfile={true}
          onHighlightPress={(highlight) => {
            navigation.navigate('HighlightViewer', { highlight });
          }}
        />

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
        ) : activeTab === 'playlist' ? (
          <View style={styles.playlistContainer}>
            {/* Create New Playlist Button */}
            <TouchableOpacity style={styles.createPlaylistButton} onPress={handleCreatePlaylist}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createPlaylistText}>Create New Playlist</Text>
            </TouchableOpacity>

            {/* Playlists List or Empty State */}
            {playlists.length > 0 ? (
              playlists.map((playlist) => (
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
                        <Ionicons name="lock-closed" size={14} color="#666666" style={{ marginLeft: 6 }} />
                      )}
                    </View>
                    <Text style={styles.playlistVideoCount}>
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
              <View style={styles.emptyPlaylistState}>
                <Ionicons name="albums-outline" size={64} color="#CCCCCC" />
                <Text style={styles.emptyStateText}>Belum ada playlist</Text>
                <Text style={styles.emptyStateSubtext}>
                  Buat playlist pertama Anda untuk mengorganisir video favorit
                </Text>
              </View>
            )}
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
          isLoadingReposts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#06402B" />
            </View>
          ) : reposts.length > 0 ? (
            <View style={styles.gridContainer}>
              {reposts.map((item, index) => (
                <React.Fragment key={item.id || index}>
                  {renderVideoItem({ item, isRepost: true })}
                </React.Fragment>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="repeat-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyStateText}>Belum ada posting ulang</Text>
              <Text style={styles.emptyStateSubtext}>
                Video yang Anda posting ulang akan muncul di sini
              </Text>
            </View>
          )
        ) : activeTab === 'tag' ? (
          isLoadingTagged ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#06402B" />
            </View>
          ) : taggedVideos.length > 0 ? (
            <View style={styles.gridContainer}>
              {taggedVideos.map((item, index) => (
                <React.Fragment key={item.id || index}>
                  {renderVideoItem({ item })}
                </React.Fragment>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="pricetag-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyStateText}>Belum ada video tagged</Text>
              <Text style={styles.emptyStateSubtext}>
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
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#000000" />
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
                <Text style={styles.avatarHintText}>Tap to change photo</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={styles.usernameInputContainer}>
                  <Text style={styles.usernamePrefix}>@</Text>
                  <TextInput
                    style={styles.usernameInput}
                    value={editUsername}
                    onChangeText={(text) => {
                      // Only allow alphanumeric, dots, and underscores
                      const cleanText = text.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase();
                      setEditUsername(cleanText);
                    }}
                    placeholder="username"
                    placeholderTextColor="#999999"
                    autoCapitalize="none"
                    maxLength={30}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Lengkap</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFullname}
                  onChangeText={setEditFullname}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor="#999999"
                  maxLength={255}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.textInput, styles.bioInput]}
                  value={editBio}
                  onChangeText={(text) => {
                    if (text.length <= 150) setEditBio(text);
                  }}
                  placeholder="Tell people about yourself..."
                  placeholderTextColor="#999999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.charCounter}>{editBio.length}/150</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Website (Opsional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editWebsite}
                  onChangeText={setEditWebsite}
                  placeholder="https://yourwebsite.com"
                  placeholderTextColor="#999999"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              {/* Account Type Badge Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Type</Text>
                <View style={styles.badgeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.badgeOption,
                      accountType === 'regular' && styles.badgeOptionActive
                    ]}
                    onPress={() => setAccountType('regular')}
                  >
                    <Text style={[
                      styles.badgeOptionText,
                      accountType === 'regular' && styles.badgeOptionTextActive
                    ]}>Regular</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.badgeOption,
                      accountType === 'creator' && styles.badgeOptionActive,
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
                      accountType === 'creator' && styles.badgeOptionTextActive
                    ]}>Creator</Text>
                  </TouchableOpacity>
                </View>
                {user?.badge_status !== 'approved' && (
                  <Text style={styles.helperText}>
                    Ajukan badge creator untuk mengaktifkan opsi ini
                  </Text>
                )}
              </View>

              {/* Badge Visibility Toggle */}
              {user?.badge_status === 'approved' && (
                <View style={styles.inputGroup}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.inputLabel}>Tampilkan Badge Creator</Text>
                      <Text style={styles.settingDescription}>
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
                      trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                      thumbColor={showBadge ? '#06402B' : '#F3F4F6'}
                    />
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEditModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
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
          <View style={styles.playlistModalContainer}>
            <View style={styles.playlistModalHeader}>
              <Text style={styles.playlistModalTitle}>Buat Playlist Baru</Text>
              <TouchableOpacity onPress={() => setShowPlaylistModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <View style={styles.playlistModalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Playlist</Text>
                <TextInput
                  style={styles.textInput}
                  value={playlistName}
                  onChangeText={setPlaylistName}
                  placeholder="Contoh: Resep Favorit"
                  placeholderTextColor="#999999"
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Deskripsi (Opsional)</Text>
                <TextInput
                  style={[styles.textInput, styles.descriptionInput]}
                  value={playlistDescription}
                  onChangeText={(text) => {
                    if (text.length <= 200) setPlaylistDescription(text);
                  }}
                  placeholder="Tambahkan deskripsi playlist..."
                  placeholderTextColor="#999999"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <Text style={styles.charCounter}>{playlistDescription.length}/200</Text>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.privacyToggleContainer}>
                  <View style={styles.privacyToggleInfo}>
                    <Text style={styles.inputLabel}>Playlist Pribadi</Text>
                    <Text style={styles.privacyToggleDescription}>
                      Hanya Anda yang bisa melihat playlist ini
                    </Text>
                  </View>
                  <Switch
                    value={isPlaylistPrivate}
                    onValueChange={setIsPlaylistPrivate}
                    trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                    thumbColor={isPlaylistPrivate ? '#06402B' : '#F3F4F6'}
                    ios_backgroundColor="#D1D5DB"
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPlaylistModal(false)}>
                  <Text style={styles.cancelButtonText}>Batal</Text>
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
