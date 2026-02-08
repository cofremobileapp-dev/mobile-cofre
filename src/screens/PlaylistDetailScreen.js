import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';
import VideoPreviewModal from '../components/VideoPreviewModal';

// Grid calculation constants
const COLUMNS = 3;
const ITEM_GAP = 1;

const PlaylistDetailScreen = ({ route, navigation }) => {
  const { playlistId, playlistName } = route.params;
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const TOTAL_MARGINS = COLUMNS * ITEM_GAP;
  const ITEM_WIDTH = Math.floor((SCREEN_WIDTH - TOTAL_MARGINS) / COLUMNS);
  const { user } = useAuth();

  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const styles = React.useMemo(() => createStyles(ITEM_WIDTH), [ITEM_WIDTH]);

  useEffect(() => {
    loadPlaylistDetails();
  }, [playlistId]);

  const loadPlaylistDetails = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getPlaylistDetails(playlistId);

      if (response.data?.success) {
        const playlistData = response.data.data;
        setPlaylist(playlistData);
        setVideos(playlistData.videos || []);
        // Update edit form values
        setEditedName(playlistData.name || '');
      }
    } catch (error) {
      console.error('Error loading playlist details:', error);
      Alert.alert('Error', 'Gagal memuat playlist. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoPress = (video) => {
    setSelectedVideo(video);
    setShowVideoPreview(true);
  };

  const handleRemoveVideo = (videoId) => {
    Alert.alert(
      'Hapus Video',
      'Apakah Anda yakin ingin menghapus video ini dari playlist?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.removeVideoFromPlaylist(playlistId, videoId);
              // Reload playlist
              await loadPlaylistDetails();
              Alert.alert('Success', 'Video berhasil dihapus dari playlist');
            } catch (error) {
              console.error('Error removing video:', error);
              Alert.alert('Error', 'Gagal menghapus video');
            }
          },
        },
      ]
    );
  };

  const handleEditPlaylist = () => {
    setEditedName(playlist?.name || playlistName || '');
    setShowEditModal(true);
  };

  const handleSubmitEdit = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Nama playlist tidak boleh kosong');
      return;
    }

    try {
      setIsUpdating(true);
      await apiService.updatePlaylist(playlistId, {
        name: editedName.trim(),
      });
      Alert.alert('Success', 'Playlist berhasil diupdate');
      setShowEditModal(false);
      await loadPlaylistDetails();
    } catch (error) {
      console.error('Error updating playlist:', error);
      Alert.alert('Error', 'Gagal mengupdate playlist');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePlaylist = () => {
    Alert.alert(
      'Hapus Playlist',
      'Apakah Anda yakin ingin menghapus playlist ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deletePlaylist(playlistId);
              Alert.alert('Success', 'Playlist berhasil dihapus');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting playlist:', error);
              Alert.alert('Error', 'Gagal menghapus playlist');
            }
          },
        },
      ]
    );
  };

  const renderVideoItem = ({ item }) => (
    <TouchableOpacity
      style={styles.gridItem}
      activeOpacity={0.8}
      onPress={() => handleVideoPress(item)}
      onLongPress={() => handleRemoveVideo(item.id)}
    >
      <Image
        source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/200' }}
        style={styles.videoThumbnail}
        resizeMode="cover"
      />
      <View style={styles.videoDuration}>
        <Text style={styles.videoDurationText}>
          {item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : '0:00'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F1E8" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06402B" />
          <Text style={styles.loadingText}>Memuat playlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F1E8" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{playlistName || playlist?.name || 'Playlist'}</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            Alert.alert('Options', 'Pilih aksi', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Edit', onPress: handleEditPlaylist },
              { text: 'Delete', style: 'destructive', onPress: handleDeletePlaylist },
            ]);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Playlist Info */}
        <View style={styles.playlistInfo}>
          <View style={styles.playlistIconLarge}>
            <Ionicons name="albums" size={48} color="#06402B" />
          </View>
          <Text style={styles.playlistTitle}>{playlist?.name || 'Playlist'}</Text>
          {playlist?.description ? (
            <Text style={styles.playlistDescription}>{playlist.description}</Text>
          ) : null}
          <Text style={styles.playlistVideoCount}>
            {videos.length} video{videos.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Videos Grid */}
        {videos.length > 0 ? (
          <View style={styles.gridContainer}>
            {videos.map((item, index) => (
              <React.Fragment key={item.id || index}>
                {renderVideoItem({ item })}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyStateText}>Belum ada video</Text>
            <Text style={styles.emptyStateSubtext}>
              Video yang Anda tambahkan ke playlist akan muncul di sini
            </Text>
          </View>
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
          currentUserId={user?.id}
        />
      )}

      {/* Edit Playlist Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nama Playlist"
              value={editedName}
              onChangeText={setEditedName}
              editable={!isUpdating}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, isUpdating && styles.modalButtonDisabled]}
                onPress={handleSubmitEdit}
                disabled={isUpdating}
              >
                <Text style={styles.modalSaveText}>
                  {isUpdating ? 'Menyimpan...' : 'Simpan'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  playlistInfo: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#F5F1E8',
  },
  playlistIconLarge: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#EDE8D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  playlistTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  playlistDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    textAlign: 'center',
  },
  playlistVideoCount: {
    fontSize: 14,
    color: '#999999',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F5F1E8',
    paddingTop: 8,
  },
  gridItem: {
    width: ITEM_WIDTH,
    backgroundColor: '#FFFFFF',
    marginBottom: ITEM_GAP,
    marginRight: ITEM_GAP,
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: ITEM_WIDTH * 1.2,
    backgroundColor: '#E0E0E0',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  videoDurationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 12,
  },
  emptyState: {
    paddingVertical: 100,
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999999',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#CCCCCC',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000000',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666666',
  },
  modalSaveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#06402B',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
});

export default PlaylistDetailScreen;
