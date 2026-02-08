import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Image,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/ApiService';
import CommentModal from './CommentModal';

const VideoItem = ({ item, isActive, currentUserId, currentUser, navigation, currentIndex, totalVideos, onVideoError, isScreenFocused }) => {
  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = useWindowDimensions();

  const videoUrl = item.s3_url || '';

  const player = useVideoPlayer(item.s3_url, (player) => {
    player.loop = true;
    player.muted = false;
    player.play();
  });
  const [isLiked, setIsLiked] = useState(item.is_liked || false);
  const [likesCount, setLikesCount] = useState(item.likes_count || 0);
  const [isBookmarked, setIsBookmarked] = useState(item.is_bookmarked || false);
  const [isReposted, setIsReposted] = useState(item.is_reposted || false);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [commentsCount, setCommentsCount] = useState(item.comments_count || 0);
  const [isFollowing, setIsFollowing] = useState(item.is_following || false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const hasRecordedView = useRef(false);

  const videoItemStyles = useMemo(() => createVideoItemStyles(SCREEN_HEIGHT, SCREEN_WIDTH), [SCREEN_HEIGHT, SCREEN_WIDTH]);

  // Control playback with proper error handling
  useEffect(() => {
    if (!player) return;

    const controlPlayback = async () => {
      try {
        const shouldPlay = isScreenFocused && isActive && !isManuallyPaused;
        if (shouldPlay) {
          await player.play();
        } else {
          await player.pause();
        }
      } catch (error) {
        // Silently handle playback errors
      }
    };

    controlPlayback();

    // Record view when video becomes active (only once)
    if (isActive && !hasRecordedView.current) {
      recordView();
      hasRecordedView.current = true;
    }

    // Auto-reset manual pause when user scrolls away
    if (!isActive && isManuallyPaused) {
      setIsManuallyPaused(false);
    }
  }, [isActive, isManuallyPaused, isScreenFocused, player, item.id]);

  const recordView = async () => {
    try {
      await apiService.recordView(item.id);
    } catch (error) {
      // Silently fail - view tracking shouldn't interrupt user experience
    }
  };

  // Manual play/pause control with smooth animation
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const pauseIconOpacity = useRef(new Animated.Value(0)).current;

  const handlePlayPause = useCallback(async () => {
    if (!player || !isActive) return;

    const newPausedState = !isManuallyPaused;
    setIsManuallyPaused(newPausedState);

    // Immediately control playback
    try {
      if (newPausedState) {
        await player.pause();

        // Show pause icon with fade in
        Animated.timing(pauseIconOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else {
        await player.play();

        // Hide pause icon with fade out
        Animated.timing(pauseIconOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      // Silently handle errors
    }
  }, [isManuallyPaused, player, isActive, item.id, pauseIconOpacity]);

  // Reset animation when video becomes inactive (scrolled away)
  useEffect(() => {
    if (!isActive) {
      pauseIconOpacity.setValue(0);
    }
  }, [isActive, pauseIconOpacity]);

  const handleLike = async () => {
    if (isLiking) return; // Prevent multiple rapid clicks

    setIsLiking(true);
    const previousState = isLiked;
    const previousCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(!isLiked ? likesCount + 1 : likesCount - 1);

    try {
      const response = await apiService.toggleLike(item.id);
      // Update with actual values from server
      setIsLiked(response.data.liked);
      setLikesCount(response.data.likes_count);
    } catch (error) {
      // Revert on error
      setIsLiked(previousState);
      setLikesCount(previousCount);
      Alert.alert('Error', 'Gagal menyukai video. Silakan coba lagi.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleRepost = async () => {
    const previousState = isReposted;

    // Optimistic update
    setIsReposted(!isReposted);

    try {
      let response;
      if (isReposted) {
        // Undo repost
        response = await apiService.undoRepost(item.id);
      } else {
        // Create repost
        response = await apiService.repostVideo(item.id);
      }
      // Update with actual value from server if provided
      if (response.data?.reposted !== undefined) {
        setIsReposted(response.data.reposted);
      }
    } catch (error) {
      // Revert on error
      setIsReposted(previousState);
      const errorMessage = error.response?.data?.message || 'Gagal memposting ulang video';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleBookmark = async () => {
    if (isBookmarking) return;

    setIsBookmarking(true);
    const previousState = isBookmarked;

    // Optimistic update
    setIsBookmarked(!isBookmarked);

    try {
      const response = await apiService.toggleBookmark(item.id);
      setIsBookmarked(response.data.bookmarked);
    } catch (error) {
      // Revert on error
      setIsBookmarked(previousState);
      Alert.alert('Error', 'Gagal menyimpan bookmark');
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleFollow = async () => {
    const targetUserId = item.user?.id;

    // Prevent crash if user data is missing
    if (!targetUserId) {
      console.error('Follow error: Missing target user ID');
      return;
    }

    // Prevent following yourself
    if (Number(targetUserId) === Number(currentUserId)) {
      Alert.alert('Perhatian', 'Anda tidak bisa mengikuti diri sendiri');
      return;
    }

    if (isFollowLoading) return;

    setIsFollowLoading(true);
    const previousState = isFollowing;

    // Optimistic update
    setIsFollowing(!isFollowing);

    try {
      const response = await apiService.toggleFollow(targetUserId);
      setIsFollowing(response.data.following);
    } catch (error) {
      // Revert on error
      setIsFollowing(previousState);

      // Handle specific error messages
      const errorMessage = error.response?.data?.message || error.message;
      if (errorMessage === 'You cannot follow yourself') {
        Alert.alert('Perhatian', 'Anda tidak bisa mengikuti diri sendiri');
      } else {
        Alert.alert('Error', 'Gagal mengikuti pengguna. Silakan coba lagi.');
      }
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Parse menu_data if it's a string
  let menuData = {};
  try {
    if (item.menu_data) {
      menuData = typeof item.menu_data === 'string'
        ? JSON.parse(item.menu_data)
        : item.menu_data;
    }
  } catch (error) {
    menuData = {};
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  // Function to render description with highlighted hashtags
  const renderDescriptionWithHashtags = (text) => {
    if (!text) return null;

    // Split text by hashtags while keeping them
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);

    return (
      <Text style={videoItemComponentStyles.videoDescription} numberOfLines={3}>
        {parts.map((part, index) => {
          if (part.startsWith('#')) {
            return (
              <Text key={index} style={videoItemComponentStyles.hashtag}>
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <View style={videoItemStyles.videoContainer}>
      {/* Video Player */}
      <VideoView
        player={player}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: '#000000',
        }}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />

      {/* Video Counter */}
      <View style={videoItemStyles.videoCounter}>
        <Text style={videoItemStyles.videoCounterText}>
          {currentIndex + 1} / {totalVideos}
        </Text>
      </View>

      {/* Tap to Play/Pause with Smooth Animation */}
      <TouchableOpacity
        style={videoItemStyles.videoTouchable}
        activeOpacity={1}
        onPress={handlePlayPause}
      >
        {isManuallyPaused && (
          <Animated.View
            style={[
              videoItemStyles.pauseIconContainer,
              { opacity: pauseIconOpacity }
            ]}
          >
            <Ionicons name="play-circle" size={80} color="rgba(255,255,255,0.9)" />
            <Text style={videoItemStyles.pauseText}>Tap to Play</Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Right Side Actions */}
      <View style={videoItemStyles.rightActions}>
        {/* Creator Avatar with Follow Button */}
        <View style={videoItemStyles.avatarContainer}>
          <TouchableOpacity
            onPress={() => {
              if (item.user?.id) {
                if (item.user.id === currentUserId) {
                  // Navigate to own profile (Profile tab)
                  navigation.navigate('Profile');
                } else {
                  // Navigate to other user's profile
                  navigation.navigate('OtherUserProfile', { userId: item.user.id });
                }
              }
            }}
          >
            {(() => {
              // Use current user's avatar if this is their video (always fresh from AuthContext)
              const avatarUrl = item.user?.id === currentUserId && currentUser?.avatar_url
                ? currentUser.avatar_url
                : item.user?.avatar_url;
              const userName = item.user?.id === currentUserId && currentUser?.name
                ? currentUser.name
                : item.user?.name;

              return avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={videoItemStyles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={[videoItemStyles.avatar, videoItemStyles.avatarPlaceholder]}>
                  <Text style={videoItemStyles.avatarText}>
                    {userName?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              );
            })()}
          </TouchableOpacity>
          {item.user?.id && Number(item.user.id) !== Number(currentUserId) && !isFollowing && (
            <TouchableOpacity
              style={videoItemStyles.followPlusButton}
              onPress={handleFollow}
              disabled={isFollowLoading}
            >
              <Ionicons name="add" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Like Button */}
        <TouchableOpacity
          style={videoItemStyles.actionButton}
          onPress={handleLike}
          disabled={isLiking}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={30}
            color={isLiked ? "#FF3B5C" : "#FFFFFF"}
          />
          <Text style={videoItemStyles.actionText}>
            {likesCount > 0 ? (likesCount >= 1000 ? `${(likesCount / 1000).toFixed(1)}K` : likesCount) : '0'}
          </Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity
          style={videoItemStyles.actionButton}
          onPress={() => setShowComments(true)}
        >
          <Ionicons name="chatbubble-outline" size={28} color="#FFFFFF" />
          <Text style={videoItemStyles.actionText}>
            {commentsCount > 0 ? (commentsCount >= 1000 ? `${(commentsCount / 1000).toFixed(1)}K` : commentsCount) : '0'}
          </Text>
        </TouchableOpacity>

        {/* Recipe/Menu Info Button */}
        <TouchableOpacity
          style={videoItemStyles.menuActionButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <View style={videoItemStyles.menuIconContainer}>
            <Ionicons name="restaurant" size={22} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Bookmark Button */}
        <TouchableOpacity
          style={videoItemStyles.actionButton}
          onPress={handleBookmark}
          disabled={isBookmarking}
        >
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={28}
            color={isBookmarked ? "#FFD700" : "#FFFFFF"}
          />
        </TouchableOpacity>

        {/* Repost Button */}
        <TouchableOpacity
          style={videoItemStyles.actionButton}
          onPress={handleRepost}
        >
          <Ionicons
            name={isReposted ? "repeat" : "repeat-outline"}
            size={28}
            color={isReposted ? "#3B82F6" : "#FFFFFF"}
          />
          {isReposted && (
            <Text style={videoItemStyles.repostedLabel}>Diposting ulang</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Info */}
      <View style={videoItemStyles.bottomInfo}>
        {/* Creator Name with Badge */}
        <View style={videoItemComponentStyles.creatorNameRow}>
          <Text style={videoItemComponentStyles.creatorName}>{item.user?.name || 'Unknown'}</Text>
          {item.user?.badge_status === 'approved' && item.user?.show_badge && (
            <View style={videoItemComponentStyles.umkmBadge}>
              <Text style={videoItemComponentStyles.umkmText}>CREATOR</Text>
            </View>
          )}
        </View>

        {/* Video Description with Hashtags */}
        <View style={videoItemComponentStyles.descriptionContainer}>
          {renderDescriptionWithHashtags(item.description || menuData.name || 'Video kuliner menarik!')}
        </View>

        {/* Tagged Users */}
        {item.tags && item.tags.length > 0 && (
          <View style={videoItemComponentStyles.taggedUsersContainer}>
            <Text style={videoItemComponentStyles.taggedUsersText}>
              dengan{' '}
              {item.tags.map((tag, index) => (
                <Text key={tag.id}>
                  <Text style={videoItemComponentStyles.taggedUserLink}>
                    @{tag.tagged_user?.name || 'User'}
                  </Text>
                  {index < item.tags.length - 1 ? ', ' : ''}
                </Text>
              ))}
            </Text>
          </View>
        )}

        {/* Continue Watching Button */}
        <TouchableOpacity style={videoItemComponentStyles.continueButton}>
          <Text style={videoItemComponentStyles.continueButtonText}>Tetap lanjut videonya</Text>
          <Ionicons name="chevron-up" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Recipe Modal */}
      <Modal
        visible={showMenu}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMenu(false)}
      >
        <View style={videoItemComponentStyles.recipeModalOverlay}>
          <View style={videoItemStyles.recipeModalContainer}>
            {/* Modal Header */}
            <View style={videoItemComponentStyles.recipeModalHeader}>
              <View style={videoItemComponentStyles.recipeModalHeaderContent}>
                <Text style={videoItemComponentStyles.recipeModalTitle}>{menuData.name || 'Detail Resep'}</Text>
                {/* Creator Info with Badge */}
                <View style={videoItemComponentStyles.recipeCreatorInfoHeader}>
                  <Text style={videoItemComponentStyles.recipeCreatorNameHeader}>@{item.user?.name || 'Unknown'}</Text>
                  {item.user?.badge_status === 'approved' && item.user?.show_badge && (
                    <View style={videoItemComponentStyles.umkmBadgeModal}>
                      <Text style={videoItemComponentStyles.umkmTextModal}>CREATOR</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowMenu(false)} style={videoItemComponentStyles.closeButton}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={videoItemComponentStyles.recipeModalContent}>
              {/* Price Range */}
              {menuData.price && (
                <Text style={videoItemComponentStyles.recipePriceRange}>Kisaran Harga: {menuData.price}</Text>
              )}

              {/* Ingredients Section with Compact List */}
              <View style={videoItemComponentStyles.recipeSection}>
                <Text style={videoItemComponentStyles.recipeSectionTitle}>Alat dan Bahan</Text>
                <View style={videoItemComponentStyles.recipeListContainer}>
                  {menuData.ingredients ? (
                    menuData.ingredients.split('\n').filter(item => item.trim()).map((ingredient, index) => (
                      <View key={index} style={videoItemComponentStyles.recipeListItem}>
                        <Text style={videoItemComponentStyles.recipeBullet}>•</Text>
                        <Text style={videoItemComponentStyles.recipeListText}>{ingredient.trim()}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={videoItemComponentStyles.recipeListText}>Informasi bahan belum tersedia</Text>
                  )}
                </View>
              </View>

              {/* Steps Section */}
              {menuData.steps && (
                <View style={videoItemComponentStyles.recipeSection}>
                  <Text style={videoItemComponentStyles.recipeSectionTitle}>Cara Pembuatan</Text>
                  <View style={videoItemComponentStyles.recipeListContainer}>
                    {menuData.steps.split('\n').filter(step => step.trim()).map((step, index) => {
                      // Remove existing number if present (e.g., "1. Mix" becomes "Mix")
                      const cleanStep = step.trim().replace(/^\d+\.\s*/, '');
                      return (
                        <View key={index} style={videoItemComponentStyles.recipeListItem}>
                          <Text style={videoItemComponentStyles.recipeNumbering}>{index + 1}.</Text>
                          <Text style={videoItemComponentStyles.recipeListText}>{cleanStep}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Servings Info */}
              {menuData.servings && (
                <View style={videoItemComponentStyles.recipeServingsInfo}>
                  <Ionicons name="people-outline" size={16} color="#666666" />
                  <Text style={videoItemComponentStyles.recipeServingsText}>Untuk {menuData.servings}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Comment Modal */}
      <CommentModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        videoId={item.id}
        initialCommentsCount={commentsCount}
      />
    </View>
  );
};

const createVideoItemStyles = (SCREEN_HEIGHT, SCREEN_WIDTH) => StyleSheet.create({
  videoContainer: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIconContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  videoCounter: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  videoCounterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  rightActions: {
    position: 'absolute',
    right: 14,
    bottom: 180,
    alignItems: 'center',
    gap: 22,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 0,
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#EDE8D0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    backgroundColor: '#10B981',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  followPlusButton: {
    position: 'absolute',
    bottom: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF3B5C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  repostedLabel: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  menuActionButton: {
    alignItems: 'center',
    gap: 0,
    paddingVertical: 2,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#06402B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 100,
    left: 14,
    right: 90,
    maxHeight: 140,
  },
  recipeModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.75,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10000,
  },
});

const videoItemComponentStyles = StyleSheet.create({
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  creatorName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  umkmBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  umkmText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  videoDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hashtag: {
    color: '#4FC3F7',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  taggedUsersContainer: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  taggedUsersText: {
    color: '#E5E7EB',
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  taggedUserLink: {
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  recipeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  recipeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  recipeModalHeaderContent: {
    flex: 1,
    paddingRight: 8,
  },
  recipeModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
  },
  recipeCreatorInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipeCreatorNameHeader: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  closeButton: {
    padding: 4,
  },
  recipeModalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  umkmBadgeModal: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  umkmTextModal: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '700',
  },
  recipePriceRange: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 16,
    fontWeight: '500',
  },
  recipeSection: {
    marginBottom: 20,
  },
  recipeSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  recipeListContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  recipeListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  recipeBullet: {
    fontSize: 14,
    color: '#333333',
    marginRight: 8,
    marginTop: 1,
  },
  recipeNumbering: {
    fontSize: 14,
    color: '#333333',
    marginRight: 8,
    marginTop: 1,
    fontWeight: '600',
    minWidth: 20,
  },
  recipeListText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  recipeServingsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  recipeServingsText: {
    fontSize: 13,
    color: '#666666',
  },
});

export default VideoItem;
