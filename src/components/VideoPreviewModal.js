import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { apiService } from '../services/ApiService';
import { formatPrice } from '../utils/formatUtils';

const VideoPreviewModal = ({ visible, video, onClose, currentUserId }) => {
  const [isLiked, setIsLiked] = useState(video?.is_liked || false);
  const [likesCount, setLikesCount] = useState(video?.likes_count || 0);
  const [isBookmarked, setIsBookmarked] = useState(video?.is_bookmarked || false);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);

  // Video player
  const player = useVideoPlayer(video?.s3_url, (player) => {
    player.loop = true;
    player.muted = false;
    if (visible) {
      player.play();
    }
  });

  // Parse menu data
  let menuData = {};
  try {
    if (video?.menu_data) {
      menuData = typeof video.menu_data === 'string'
        ? JSON.parse(video.menu_data)
        : video.menu_data;
    }
  } catch (error) {
    console.warn('Error parsing menu_data:', error);
  }

  const handleLike = async () => {
    if (isLiking) return;

    try {
      setIsLiking(true);
      const newLikedState = !isLiked;

      // Optimistic update
      setIsLiked(newLikedState);
      setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);

      await apiService.toggleLike(video.id);
    } catch (error) {
      // Revert on error
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Gagal update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (isBookmarking) return;

    try {
      setIsBookmarking(true);
      const newBookmarkedState = !isBookmarked;

      // Optimistic update
      setIsBookmarked(newBookmarkedState);

      await apiService.toggleBookmark(video.id);
    } catch (error) {
      // Revert on error
      setIsBookmarked(!isBookmarked);
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Gagal update bookmark');
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Hapus Video',
      'Apakah Anda yakin ingin menghapus video ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteVideo(video.id);
              Alert.alert('Sukses', 'Video berhasil dihapus');
              onClose(true); // Pass true to indicate deletion
            } catch (error) {
              console.error('Error deleting video:', error);
              Alert.alert('Error', 'Gagal menghapus video');
            }
          },
        },
      ]
    );
  };

  if (!video) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={() => onClose(false)}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => onClose(false)} style={styles.closeButton}>
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Preview Video</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Video Player */}
        <View style={styles.videoContainer}>
          {video.s3_url ? (
            <VideoView
              player={player}
              style={styles.video}
              contentFit="contain"
              nativeControls={false}
            />
          ) : (
            <View style={styles.noVideo}>
              <Ionicons name="videocam-off" size={64} color="#6B7280" />
              <Text style={styles.noVideoText}>Video tidak tersedia</Text>
            </View>
          )}
        </View>

        {/* Actions Sidebar */}
        <View style={styles.actionsSidebar}>
          {/* Like */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLike}
            disabled={isLiking}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={32}
              color={isLiked ? "#FF3B5C" : "#FFFFFF"}
            />
            <Text style={styles.actionText}>{likesCount}</Text>
          </TouchableOpacity>

          {/* Comments */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={32} color="#FFFFFF" />
            <Text style={styles.actionText}>{video.comments_count || 0}</Text>
          </TouchableOpacity>

          {/* Bookmark */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleBookmark}
            disabled={isBookmarking}
          >
            <Ionicons
              name={isBookmarked ? "bookmark" : "bookmark-outline"}
              size={32}
              color={isBookmarked ? "#FFD700" : "#FFFFFF"}
            />
          </TouchableOpacity>

          {/* Delete (if own video) */}
          {currentUserId && (Number(video.user_id) === Number(currentUserId) || Number(video.user?.id) === Number(currentUserId)) && (
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.creatorName}>@{video.user?.name || 'Unknown'}</Text>
            <Text style={styles.menuName}>{menuData.name || 'Video Kuliner'}</Text>
            {menuData.price && (
              <Text style={styles.price}>{formatPrice(menuData.price)}</Text>
            )}
            <Text style={styles.description}>
              {video.description || menuData.description || 'Tidak ada deskripsi'}
            </Text>

            {/* Tagged Users */}
            {video.tags && video.tags.length > 0 && (
              <View style={styles.taggedUsersContainer}>
                <Text style={styles.taggedUsersText}>
                  dengan{' '}
                  {video.tags.map((tag, index) => (
                    <Text key={tag.id}>
                      <Text style={styles.taggedUserLink}>
                        @{tag.tagged_user?.name || 'User'}
                      </Text>
                      {index < video.tags.length - 1 ? ', ' : ''}
                    </Text>
                  ))}
                </Text>
              </View>
            )}

            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Ionicons name="eye" size={16} color="#9CA3AF" />
                <Text style={styles.statText}>{video.views_count || 0} views</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="calendar" size={16} color="#9CA3AF" />
                <Text style={styles.statText}>
                  {new Date(video.created_at).toLocaleDateString('id-ID')}
                </Text>
              </View>
            </View>

            {/* View Menu Button - Show if there's any menu data OR video description */}
            {(menuData.name || menuData.description || menuData.ingredients || video.description) && (
              <TouchableOpacity
                style={styles.viewMenuButton}
                onPress={() => setShowMenuModal(true)}
              >
                <Ionicons name="restaurant" size={20} color="#FFFFFF" />
                <Text style={styles.viewMenuButtonText}>Lihat Detail Menu</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Menu Detail Modal */}
      <Modal
        visible={showMenuModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMenuModal(false)}
      >
        <View style={styles.menuModalContainer}>
          <View style={styles.menuModalContent}>
            {/* Header */}
            <View style={styles.menuModalHeader}>
              <Text style={styles.menuModalTitle}>Detail Menu</Text>
              <TouchableOpacity onPress={() => setShowMenuModal(false)}>
                <Ionicons name="close" size={28} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.menuModalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.menuModalName}>
                {menuData.name || video.description || 'Detail Video'}
              </Text>

              {menuData.price && (
                <Text style={styles.menuModalPrice}>
                  {formatPrice(menuData.price)}
                </Text>
              )}

              {(menuData.description || video.description) && (
                <View style={styles.menuSection}>
                  <Text style={styles.menuSectionTitle}>Deskripsi</Text>
                  <Text style={styles.menuSectionText}>
                    {menuData.description || video.description}
                  </Text>
                </View>
              )}

              {menuData.ingredients && (
                <View style={styles.menuSection}>
                  <Text style={styles.menuSectionTitle}>Bahan-bahan</Text>
                  <Text style={styles.menuSectionText}>{menuData.ingredients}</Text>
                </View>
              )}

              {menuData.steps && (
                <View style={styles.menuSection}>
                  <Text style={styles.menuSectionTitle}>Cara Membuat</Text>
                  <Text style={styles.menuSectionText}>{menuData.steps}</Text>
                </View>
              )}

              {menuData.servings && (
                <View style={styles.menuSection}>
                  <Text style={styles.menuSectionTitle}>Porsi</Text>
                  <Text style={styles.menuSectionText}>{menuData.servings} porsi</Text>
                </View>
              )}

              {menuData.cooking_time && (
                <View style={styles.menuSection}>
                  <Text style={styles.menuSectionTitle}>Waktu Memasak</Text>
                  <Text style={styles.menuSectionText}>{menuData.cooking_time} menit</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  noVideo: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVideoText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 12,
  },
  actionsSidebar: {
    position: 'absolute',
    right: 12,
    top: '35%',
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    maxHeight: 200,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  menuName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
    marginBottom: 12,
  },
  taggedUsersContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  taggedUsersText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  taggedUserLink: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // View Menu Button
  viewMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  viewMenuButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Menu Modal
  menuModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  menuModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  menuModalBody: {
    padding: 20,
  },
  menuModalName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  menuModalPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 20,
  },
  menuSection: {
    marginBottom: 20,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  menuSectionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
});

export default VideoPreviewModal;
