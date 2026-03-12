import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import { apiService } from '../services/ApiService';

const ShareModal = ({ visible, onClose, video, onRepostSuccess, currentUserId, onEdit, onDelete, onArchive, navigation }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  const videoOwnerId = video?.user?.id || video?.user_id;
  const isOwnVideo = currentUserId && videoOwnerId && Number(videoOwnerId) === Number(currentUserId);

  const styles = useMemo(() => createStyles(SCREEN_WIDTH), [SCREEN_WIDTH]);

  useEffect(() => {
    if (visible) {
      loadFriends();
    }
  }, [visible]);

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
      try {
        const response = await apiService.getFriends(1);
        const friendsList = response.data.data || [];
        const mappedFriends = friendsList.map(friend => ({
          id: friend.id,
          name: friend.name,
          avatar: friend.name ? friend.name.charAt(0).toUpperCase() : 'U',
          profilePicture: friend.profile_picture_url || null
        }));
        setFriends(mappedFriends);
      } catch (apiError) {
        console.log('Friends API not available, using fallback');
        setFriends([
          { id: 1, name: 'Sarah', avatar: 'S' },
          { id: 2, name: 'John', avatar: 'J' },
          { id: 3, name: 'Emma', avatar: 'E' },
          { id: 4, name: 'Alex', avatar: 'A' },
        ]);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleDownload = async () => {
    if (!video?.s3_url) {
      Alert.alert('Error', 'Video URL tidak tersedia');
      return;
    }
    try {
      setIsDownloading(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Izinkan akses ke galeri untuk menyimpan video');
        return;
      }
      const menuData = typeof video.menu_data === 'string'
        ? JSON.parse(video.menu_data)
        : video.menu_data || {};
      const fileName = `${menuData.name || 'video'}_${Date.now()}.mp4`;
      const fileUri = FileSystem.documentDirectory + fileName;
      Alert.alert('Downloading', 'Mengunduh video...');
      const downloadResult = await FileSystem.downloadAsync(video.s3_url, fileUri);
      if (downloadResult.status === 200) {
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync('Cofre', asset, false);
        Alert.alert('Sukses', 'Video berhasil disimpan ke galeri');
        onClose();
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading video:', error);
      Alert.alert('Error', 'Gagal mengunduh video. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRepost = async () => {
    if (!video?.id) return;
    try {
      setIsReposting(true);
      await apiService.repostVideo(video.id);
      Alert.alert('Sukses', 'Video berhasil diposting ulang!');
      if (onRepostSuccess) onRepostSuccess();
      onClose();
    } catch (error) {
      console.error('Error reposting video:', error);
      const errorMessage = error.response?.data?.message || 'Gagal memposting ulang video';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsReposting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = `https://cofremobileapp.my.id/video/${video.id}`;
      if (Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(shareUrl);
      } else {
        await Clipboard.setString(shareUrl);
      }
      Alert.alert('Berhasil', 'Link berhasil disalin');
      onClose();
    } catch (error) {
      console.error('Error copying link:', error);
      Alert.alert('Error', 'Gagal menyalin link');
    }
  };

  const handleNotInterested = async () => {
    Alert.alert(
      'Tidak Tertarik',
      'Anda tidak akan melihat video seperti ini lagi',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Konfirmasi',
          onPress: async () => {
            try {
              await apiService.notInterested(video.id);
              Alert.alert('Sukses', 'Preferensi Anda telah disimpan');
              onClose();
            } catch (error) {
              console.error('Error marking not interested:', error);
              Alert.alert('Error', 'Gagal menyimpan preferensi');
            }
          },
        },
      ]
    );
  };

  const handleReport = () => {
    Alert.alert(
      'Laporkan Video',
      'Pilih alasan pelaporan:',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Konten Tidak Pantas', onPress: () => submitReport('inappropriate_content') },
        { text: 'Spam', onPress: () => submitReport('spam') },
        { text: 'Informasi Salah', onPress: () => submitReport('misinformation') },
        { text: 'Lainnya', onPress: () => submitReport('other') },
      ]
    );
  };

  const submitReport = async (reason) => {
    try {
      await apiService.reportVideo(video.id, reason);
      Alert.alert('Terima Kasih', 'Laporan Anda telah dikirim dan akan kami tinjau');
      onClose();
    } catch (error) {
      console.error('Error reporting video:', error);
      Alert.alert('Error', 'Gagal mengirim laporan');
    }
  };

  const handleAddToPlaylist = async () => {
    try {
      setLoadingPlaylists(true);
      const response = await apiService.getPlaylists();
      if (response.data?.success) {
        setPlaylists(response.data.data || []);
        setShowPlaylistModal(true);
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
      Alert.alert('Error', 'Gagal memuat playlist');
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleSelectPlaylist = async (playlistId) => {
    try {
      await apiService.addVideoToPlaylist(playlistId, video.id);
      Alert.alert('Sukses', 'Video berhasil ditambahkan ke playlist!');
      setShowPlaylistModal(false);
      onClose();
    } catch (error) {
      console.error('Error adding to playlist:', error);
      const message = error.response?.data?.message || 'Gagal menambahkan video ke playlist';
      Alert.alert('Error', message);
    }
  };

  const handleShareToFriend = async (friend) => {
    try {
      await apiService.shareToFriend(video.id, friend.id);
      Alert.alert(
        'Terkirim!',
        `Video berhasil dikirim ke ${friend.name}.\n\n${friend.name} akan menerima notifikasi dan dapat melihat video ini di halaman notifikasi mereka.`,
        [{ text: 'OK' }]
      );
      onClose();
    } catch (error) {
      console.error('Error sharing to friend:', error);
      Alert.alert('Error', 'Gagal mengirim video');
    }
  };

  const handleShareToApp = async (appName) => {
    try {
      const menuData = typeof video.menu_data === 'string'
        ? JSON.parse(video.menu_data)
        : video.menu_data || {};
      const menuName = menuData.name || 'Video Kuliner';
      const userName = video.user?.name || 'Unknown';
      const appLink = 'https://expo.dev/@ardtys/cofre';
      const message = `🍽️ Lihat video resep "${menuName}" dari @${userName} di Cofre!\n\n📲 Download Cofre: ${appLink}`;

      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable && video?.s3_url) {
        try {
          const fileName = `cofre_${Date.now()}.mp4`;
          const fileUri = FileSystem.cacheDirectory + fileName;
          Alert.alert('Mempersiapkan...', 'Mengunduh video untuk dibagikan...');
          const downloadResult = await FileSystem.downloadAsync(video.s3_url, fileUri);
          if (downloadResult.status === 200) {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: 'video/mp4',
              dialogTitle: 'Bagikan Video',
              UTI: 'public.movie',
            });
            onClose();
            return;
          }
        } catch (downloadError) {
          console.log('Video download failed, sharing text only:', downloadError);
        }
      }

      let url = '';
      switch (appName) {
        case 'whatsapp':
          url = `whatsapp://send?text=${encodeURIComponent(message)}`;
          break;
        case 'telegram':
          url = `tg://msg?text=${encodeURIComponent(message)}`;
          break;
        case 'twitter':
          url = `twitter://post?message=${encodeURIComponent(message)}`;
          break;
        case 'instagram':
          url = `instagram://sharesheet`;
          break;
        case 'facebook':
          url = `fb://share?text=${encodeURIComponent(message)}`;
          break;
        default:
          if (isAvailable) {
            await Sharing.shareAsync(video?.s3_url || '', { dialogTitle: message });
          } else {
            Alert.alert('Info', message);
          }
          onClose();
          return;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        onClose();
      } else {
        Alert.alert(
          'Aplikasi Tidak Ditemukan',
          `${appName} tidak terinstall. Pesan untuk dibagikan:\n\n${message}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error(`Error sharing to ${appName}:`, error);
      Alert.alert('Error', 'Gagal membagikan ke aplikasi');
    }
  };

  if (!video) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalContent}>
          {/* Handle bar */}
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Kirim ke</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {/* Row 1: Send to Friends */}
          <View style={styles.rowSection}>
            {loadingFriends ? (
              <ActivityIndicator size="small" color="#06402B" style={styles.loader} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
                {friends.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.circleItem}
                    onPress={() => handleShareToFriend(friend)}
                  >
                    {friend.profilePicture ? (
                      <Image source={{ uri: friend.profilePicture }} style={styles.friendAvatarImage} />
                    ) : (
                      <View style={[styles.circleIcon, styles.friendCircle]}>
                        <Text style={styles.friendAvatarText}>{friend.avatar}</Text>
                      </View>
                    )}
                    <Text style={styles.circleLabel} numberOfLines={1}>{friend.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.divider} />

          {/* Row 2: Apps - Posting ulang, Salin tautan, WhatsApp, Instagram, Facebook, TikTok, Telegram */}
          <View style={styles.rowSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
              <TouchableOpacity
                style={styles.circleItem}
                onPress={handleRepost}
                disabled={isReposting}
              >
                <View style={[styles.circleIcon, { backgroundColor: '#EE4D2D' }]}>
                  {isReposting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="repeat-outline" size={24} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.circleLabel}>Posting{'\n'}ulang</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.circleItem} onPress={handleCopyLink}>
                <View style={[styles.circleIcon, { backgroundColor: '#6B7280' }]}>
                  <Ionicons name="link-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.circleLabel}>Salin{'\n'}tautan</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.circleItem} onPress={() => handleShareToApp('whatsapp')}>
                <View style={[styles.circleIcon, { backgroundColor: '#25D366' }]}>
                  <FontAwesome6 name="whatsapp" size={26} color="#FFFFFF" iconStyle="brand" />
                </View>
                <Text style={styles.circleLabel}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.circleItem} onPress={() => handleShareToApp('instagram')}>
                <View style={[styles.circleIcon, { backgroundColor: '#E4405F' }]}>
                  <FontAwesome6 name="instagram" size={26} color="#FFFFFF" iconStyle="brand" />
                </View>
                <Text style={styles.circleLabel}>Instagram</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.circleItem} onPress={() => handleShareToApp('facebook')}>
                <View style={[styles.circleIcon, { backgroundColor: '#1877F2' }]}>
                  <FontAwesome6 name="facebook-f" size={24} color="#FFFFFF" iconStyle="brand" />
                </View>
                <Text style={styles.circleLabel}>Facebook</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.circleItem} onPress={() => handleShareToApp('tiktok')}>
                <View style={[styles.circleIcon, { backgroundColor: '#000000' }]}>
                  <FontAwesome6 name="tiktok" size={22} color="#FFFFFF" iconStyle="brand" />
                </View>
                <Text style={styles.circleLabel}>TikTok</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.circleItem} onPress={() => handleShareToApp('telegram')}>
                <View style={[styles.circleIcon, { backgroundColor: '#0088CC' }]}>
                  <FontAwesome6 name="telegram" size={26} color="#FFFFFF" iconStyle="brand" />
                </View>
                <Text style={styles.circleLabel}>Telegram</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.circleItem} onPress={() => handleShareToApp('twitter')}>
                <View style={[styles.circleIcon, { backgroundColor: '#000000' }]}>
                  <FontAwesome6 name="x-twitter" size={22} color="#FFFFFF" iconStyle="brand" />
                </View>
                <Text style={styles.circleLabel}>X</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={styles.divider} />

          {/* Row 3: More Actions */}
          <View style={styles.rowSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
              <TouchableOpacity
                style={styles.circleItem}
                onPress={handleDownload}
                disabled={isDownloading}
              >
                <View style={[styles.circleIcon, styles.actionCircle]}>
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="download-outline" size={24} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.circleLabel}>Download</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.circleItem}
                onPress={handleAddToPlaylist}
                disabled={loadingPlaylists}
              >
                <View style={[styles.circleIcon, styles.actionCircle]}>
                  {loadingPlaylists ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.circleLabel}>Playlist</Text>
              </TouchableOpacity>

              {/* Archive */}
              <TouchableOpacity style={styles.circleItem} onPress={async () => {
                try {
                  await apiService.archiveVideo(video?.id);
                  onClose?.();
                  onArchive?.(video?.id);
                  Alert.alert(
                    'Berhasil',
                    'Video berhasil diarsipkan.',
                    [
                      { text: 'OK', style: 'cancel' },
                      {
                        text: 'Lihat Arsip',
                        onPress: () => {
                          if (navigation) {
                            navigation.navigate('Profile', { screen: 'Archive' });
                          }
                        },
                      },
                    ]
                  );
                } catch (error) {
                  console.error('Error archiving video:', error);
                  Alert.alert('Error', 'Gagal mengarsipkan video');
                }
              }}>
                <View style={[styles.circleIcon, styles.actionCircle]}>
                  <Ionicons name="archive-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.circleLabel}>Arsipkan</Text>
              </TouchableOpacity>

              {/* Edit - Own videos only */}
              {isOwnVideo && onEdit && (
                <TouchableOpacity style={styles.circleItem} onPress={onEdit}>
                  <View style={[styles.circleIcon, styles.actionCircle]}>
                    <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.circleLabel}>Edit</Text>
                </TouchableOpacity>
              )}

              {/* Delete - Own videos only */}
              {isOwnVideo && onDelete && (
                <TouchableOpacity style={styles.circleItem} onPress={onDelete}>
                  <View style={[styles.circleIcon, styles.actionCircle]}>
                    <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.circleLabel}>Hapus</Text>
                </TouchableOpacity>
              )}

              {/* Not Interested - Other users' videos only */}
              {!isOwnVideo && (
                <TouchableOpacity style={styles.circleItem} onPress={handleNotInterested}>
                  <View style={[styles.circleIcon, styles.actionCircle]}>
                    <Ionicons name="eye-off-outline" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.circleLabel}>Tidak{'\n'}tertarik</Text>
                </TouchableOpacity>
              )}

              {/* Report - Other users' videos only */}
              {!isOwnVideo && (
                <TouchableOpacity style={styles.circleItem} onPress={handleReport}>
                  <View style={[styles.circleIcon, styles.actionCircle]}>
                    <Ionicons name="flag-outline" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.circleLabel}>Laporkan</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Playlist Selection Modal */}
        <Modal
          visible={showPlaylistModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPlaylistModal(false)}
        >
          <View style={styles.playlistModalOverlay}>
            <View style={styles.playlistModalContainer}>
              <View style={styles.playlistModalHeader}>
                <Text style={styles.playlistModalTitle}>Tambah ke Playlist</Text>
                <TouchableOpacity onPress={() => setShowPlaylistModal(false)}>
                  <Ionicons name="close" size={24} color="#000000" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.playlistList}>
                {playlists.length === 0 ? (
                  <View style={styles.emptyPlaylistState}>
                    <Ionicons name="folder-open-outline" size={48} color="#CCCCCC" />
                    <Text style={styles.emptyPlaylistText}>Belum ada playlist</Text>
                    <Text style={styles.emptyPlaylistSubtext}>Buat playlist di halaman Profile</Text>
                  </View>
                ) : (
                  playlists.map((playlist) => (
                    <TouchableOpacity
                      key={playlist.id}
                      style={styles.playlistItem}
                      onPress={() => handleSelectPlaylist(playlist.id)}
                    >
                      <View style={styles.playlistInfo}>
                        <Ionicons name="folder" size={24} color="#06402B" />
                        <View style={styles.playlistTextContainer}>
                          <Text style={styles.playlistName}>{playlist.name}</Text>
                          <Text style={styles.playlistVideoCount}>
                            {playlist.videos_count || 0} video
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="add-circle-outline" size={24} color="#06402B" />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const createStyles = (SCREEN_WIDTH) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  rowSection: {
    paddingVertical: 12,
  },
  rowScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  circleItem: {
    alignItems: 'center',
    width: 68,
  },
  circleIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  circleLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
  },
  friendCircle: {
    backgroundColor: '#06402B',
  },
  friendAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  friendAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 6,
  },
  actionCircle: {
    backgroundColor: '#4B5563',
  },
  loader: {
    paddingVertical: 20,
  },
  // Playlist Modal Styles
  playlistModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  playlistModalContainer: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  playlistModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  playlistModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  playlistList: {
    maxHeight: 400,
  },
  emptyPlaylistState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyPlaylistText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyPlaylistSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  playlistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playlistTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  playlistVideoCount: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
});

export default ShareModal;
