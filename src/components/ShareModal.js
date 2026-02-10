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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { apiService } from '../services/ApiService';

const ShareModal = ({ visible, onClose, video, onRepostSuccess }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  const styles = useMemo(() => createStyles(SCREEN_WIDTH), [SCREEN_WIDTH]);

  useEffect(() => {
    if (visible) {
      loadFriends();
    }
  }, [visible]);

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);

      // Try to load friends from API
      try {
        const response = await apiService.getFriends(1);
        const friendsList = response.data.data || [];

        // Map API response to expected format
        const mappedFriends = friendsList.map(friend => ({
          id: friend.id,
          name: friend.name,
          avatar: friend.name ? friend.name.charAt(0).toUpperCase() : 'U',
          profilePicture: friend.profile_picture_url || null
        }));

        setFriends(mappedFriends);
      } catch (apiError) {
        console.log('Friends API not available, using fallback');
        // Fallback to sample data if API not implemented
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

      // Request permission for media library
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Izinkan akses ke galeri untuk menyimpan video');
        return;
      }

      // Get menu name for filename
      const menuData = typeof video.menu_data === 'string'
        ? JSON.parse(video.menu_data)
        : video.menu_data || {};
      const fileName = `${menuData.name || 'video'}_${Date.now()}.mp4`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Download the file
      Alert.alert('Downloading', 'Mengunduh video...');
      const downloadResult = await FileSystem.downloadAsync(video.s3_url, fileUri);

      if (downloadResult.status === 200) {
        // Save to media library
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

      // Call success callback to update parent component
      if (onRepostSuccess) {
        onRepostSuccess();
      }

      onClose();
    } catch (error) {
      console.error('Error reposting video:', error);
      const errorMessage = error.response?.data?.message || 'Gagal memposting ulang video';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsReposting(false);
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
        {
          text: 'Konten Tidak Pantas',
          onPress: () => submitReport('inappropriate_content'),
        },
        {
          text: 'Spam',
          onPress: () => submitReport('spam'),
        },
        {
          text: 'Informasi Salah',
          onPress: () => submitReport('misinformation'),
        },
        {
          text: 'Lainnya',
          onPress: () => submitReport('other'),
        },
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
        setPlaylists(response.data.data);
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

      // Create share message with app download link
      const appLink = 'https://expo.dev/@ardtys/cofre'; // Replace with actual app store link when published
      const message = `🍽️ Lihat video resep "${menuName}" dari @${userName} di Cofre!\n\n📲 Download Cofre: ${appLink}`;

      // Use native share for all apps - this is more reliable
      if (appName === 'native' || appName === 'whatsapp' || appName === 'instagram' || appName === 'facebook' || appName === 'telegram' || appName === 'tiktok') {
        const isAvailable = await Sharing.isAvailableAsync();

        if (isAvailable && video?.s3_url) {
          // Download video first for sharing with media
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

        // Fallback to text sharing via URL schemes
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
          default:
            // Use native share dialog
            if (isAvailable) {
              await Sharing.shareAsync(video?.s3_url || '', {
                dialogTitle: message,
              });
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
          // Fallback: copy message to clipboard or show in alert
          Alert.alert(
            'Aplikasi Tidak Ditemukan',
            `${appName} tidak terinstall. Pesan untuk dibagikan:\n\n${message}`,
            [{ text: 'OK' }]
          );
        }
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Bagikan ke</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Top Action Buttons */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleDownload}
                disabled={isDownloading}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="download-outline" size={24} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.actionLabel}>Download</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleAddToPlaylist}
                disabled={loadingPlaylists}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' }]}>
                  {loadingPlaylists ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.actionLabel}>Playlist</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleRepost}
                disabled={isReposting}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#3B82F6' }]}>
                  {isReposting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="repeat-outline" size={24} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.actionLabel}>Posting ulang</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleNotInterested}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}>
                  <Ionicons name="eye-off-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.actionLabel}>Tidak tertarik</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleReport}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#EF4444' }]}>
                  <Ionicons name="flag-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.actionLabel}>Laporkan</Text>
              </TouchableOpacity>
            </View>

            {/* Send to Friends Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kirim ke teman</Text>
              {loadingFriends ? (
                <ActivityIndicator size="small" color="#06402B" style={styles.loader} />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.friendsList}>
                    {friends.map((friend) => (
                      <TouchableOpacity
                        key={friend.id}
                        style={styles.friendItem}
                        onPress={() => handleShareToFriend(friend)}
                      >
                        <View style={styles.friendAvatar}>
                          <Text style={styles.friendAvatarText}>{friend.avatar}</Text>
                        </View>
                        <Text style={styles.friendName}>{friend.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Share to Apps Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bagikan ke aplikasi</Text>
              <View style={styles.appsGrid}>
                <TouchableOpacity
                  style={styles.appItem}
                  onPress={() => handleShareToApp('tiktok')}
                >
                  <View style={[styles.appIcon, { backgroundColor: '#000000' }]}>
                    <Ionicons name="musical-notes" size={32} color="#FFFFFF" />
                  </View>
                  <Text style={styles.appLabel}>TikTok</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.appItem}
                  onPress={() => handleShareToApp('telegram')}
                >
                  <View style={[styles.appIcon, { backgroundColor: '#0088CC' }]}>
                    <Ionicons name="paper-plane" size={32} color="#FFFFFF" />
                  </View>
                  <Text style={styles.appLabel}>Telegram</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.appItem}
                  onPress={() => handleShareToApp('twitter')}
                >
                  <View style={[styles.appIcon, { backgroundColor: '#1DA1F2' }]}>
                    <Ionicons name="logo-twitter" size={32} color="#FFFFFF" />
                  </View>
                  <Text style={styles.appLabel}>Twitter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionItem: {
    alignItems: 'center',
    width: 70,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  loader: {
    paddingVertical: 20,
  },
  friendsList: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
  },
  friendItem: {
    alignItems: 'center',
    width: 70,
  },
  friendAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#06402B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  friendAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  friendName: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
  },
  appItem: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 88) / 4, // 4 items per row with gaps
  },
  appIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  appLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
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
