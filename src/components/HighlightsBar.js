import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/ApiService';

const HighlightsBar = ({ userId, isOwnProfile = false, onHighlightPress }) => {
  const [highlights, setHighlights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSelectStoriesModal, setShowSelectStoriesModal] = useState(false);
  const [highlightName, setHighlightName] = useState('');
  const [archivedStories, setArchivedStories] = useState([]);
  const [selectedStories, setSelectedStories] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingStories, setIsLoadingStories] = useState(false);

  useEffect(() => {
    loadHighlights();
  }, [userId]);

  const loadHighlights = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getHighlights();
      const highlightsData = response.data?.data || response.data || [];
      setHighlights(Array.isArray(highlightsData) ? highlightsData : []);
    } catch (error) {
      console.error('Error loading highlights:', error);
      setHighlights([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadArchivedStories = async () => {
    try {
      setIsLoadingStories(true);
      const [archivedRes, myStoriesRes] = await Promise.all([
        apiService.getArchivedStories(),
        apiService.getMyStories(),
      ]);

      const archived = archivedRes.data?.stories || [];
      const myStories = myStoriesRes.data?.stories || [];

      // Combine and dedupe stories
      const allStories = [...archived, ...myStories];
      const uniqueStories = allStories.filter((story, index, self) =>
        index === self.findIndex(s => s.id === story.id)
      );

      setArchivedStories(uniqueStories);
    } catch (error) {
      console.error('Error loading stories for highlights:', error);
      setArchivedStories([]);
    } finally {
      setIsLoadingStories(false);
    }
  };

  const handleCreateHighlight = () => {
    setHighlightName('');
    setSelectedStories([]);
    setShowCreateModal(true);
  };

  const handleProceedToSelectStories = () => {
    if (!highlightName.trim()) {
      Alert.alert('Error', 'Nama highlight tidak boleh kosong');
      return;
    }
    setShowCreateModal(false);
    loadArchivedStories();
    setShowSelectStoriesModal(true);
  };

  const toggleStorySelection = (storyId) => {
    setSelectedStories(prev => {
      if (prev.includes(storyId)) {
        return prev.filter(id => id !== storyId);
      } else {
        return [...prev, storyId];
      }
    });
  };

  const handleSubmitHighlight = async () => {
    if (selectedStories.length === 0) {
      Alert.alert('Error', 'Pilih minimal 1 story');
      return;
    }

    try {
      setIsCreating(true);

      // Create highlight
      const createResponse = await apiService.createHighlight({
        name: highlightName.trim(),
        cover_url: archivedStories.find(s => s.id === selectedStories[0])?.media_url || null,
      });

      if (createResponse.data?.success || createResponse.data?.data) {
        const highlightId = createResponse.data?.data?.id || createResponse.data?.id;

        // Add stories to highlight
        for (const storyId of selectedStories) {
          try {
            await apiService.addStoryToHighlight(highlightId, storyId);
          } catch (error) {
            console.error('Error adding story to highlight:', error);
          }
        }

        Alert.alert('Success', `Highlight "${highlightName}" berhasil dibuat!`);
        setShowSelectStoriesModal(false);
        setHighlightName('');
        setSelectedStories([]);
        loadHighlights();
      }
    } catch (error) {
      console.error('Error creating highlight:', error);
      Alert.alert('Error', error.response?.data?.message || 'Gagal membuat highlight');
    } finally {
      setIsCreating(false);
    }
  };

  const handleHighlightPress = (highlight) => {
    if (onHighlightPress) {
      onHighlightPress(highlight);
    }
  };

  const handleDeleteHighlight = async (highlightId, highlightName) => {
    Alert.alert(
      'Hapus Highlight',
      `Apakah Anda yakin ingin menghapus highlight "${highlightName}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteHighlight(highlightId);
              Alert.alert('Success', 'Highlight berhasil dihapus');
              loadHighlights();
            } catch (error) {
              console.error('Error deleting highlight:', error);
              Alert.alert('Error', 'Gagal menghapus highlight');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#06402B" />
      </View>
    );
  }

  // Don't show anything if not own profile and no highlights
  if (!isOwnProfile && highlights.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Create New Highlight Button (only for own profile) */}
        {isOwnProfile && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateHighlight}
          >
            <View style={styles.createIconContainer}>
              <Ionicons name="add" size={28} color="#06402B" />
            </View>
            <Text style={styles.highlightLabel} numberOfLines={1}>Baru</Text>
          </TouchableOpacity>
        )}

        {/* Highlight Items */}
        {highlights.map((highlight) => (
          <TouchableOpacity
            key={highlight.id}
            style={styles.highlightItem}
            onPress={() => handleHighlightPress(highlight)}
            onLongPress={() => {
              if (isOwnProfile) {
                handleDeleteHighlight(highlight.id, highlight.name);
              }
            }}
          >
            <View style={styles.highlightCover}>
              {highlight.cover_url ? (
                <Image
                  source={{ uri: highlight.cover_url }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholderCover}>
                  <Ionicons name="images" size={24} color="#CCCCCC" />
                </View>
              )}
            </View>
            <Text style={styles.highlightLabel} numberOfLines={1}>
              {highlight.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Create Highlight Modal - Name Input */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buat Highlight Baru</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nama Highlight</Text>
              <TextInput
                style={styles.textInput}
                value={highlightName}
                onChangeText={setHighlightName}
                placeholder="Masukkan nama highlight..."
                placeholderTextColor="#9CA3AF"
                maxLength={30}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                !highlightName.trim() && styles.submitButtonDisabled
              ]}
              onPress={handleProceedToSelectStories}
              disabled={!highlightName.trim()}
            >
              <Text style={styles.submitButtonText}>Pilih Stories</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Select Stories Modal */}
      <Modal
        visible={showSelectStoriesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSelectStoriesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentLarge]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setShowSelectStoriesModal(false);
                setShowCreateModal(true);
              }}>
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Pilih Stories</Text>
              <TouchableOpacity onPress={() => setShowSelectStoriesModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <Text style={styles.selectedCount}>
              {selectedStories.length} dipilih
            </Text>

            {isLoadingStories ? (
              <View style={styles.storiesLoading}>
                <ActivityIndicator size="large" color="#06402B" />
              </View>
            ) : archivedStories.length > 0 ? (
              <FlatList
                data={archivedStories}
                numColumns={3}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.storiesGrid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.storyItem,
                      selectedStories.includes(item.id) && styles.storyItemSelected
                    ]}
                    onPress={() => toggleStorySelection(item.id)}
                  >
                    <Image
                      source={{ uri: item.media_url || item.thumbnail_url }}
                      style={styles.storyThumbnail}
                      resizeMode="cover"
                    />
                    {selectedStories.includes(item.id) && (
                      <View style={styles.selectedOverlay}>
                        <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.emptyStories}>
                <Ionicons name="images-outline" size={64} color="#CCCCCC" />
                <Text style={styles.emptyText}>Belum ada story</Text>
                <Text style={styles.emptySubtext}>
                  Upload story terlebih dahulu untuk membuat highlight
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (selectedStories.length === 0 || isCreating) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmitHighlight}
              disabled={selectedStories.length === 0 || isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Buat Highlight</Text>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  loadingContainer: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  createButton: {
    alignItems: 'center',
    width: 64,
  },
  createIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#06402B',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  highlightItem: {
    alignItems: 'center',
    width: 64,
  },
  highlightCover: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#06402B',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightLabel: {
    fontSize: 12,
    color: '#374151',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 64,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalContentLarge: {
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#06402B',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  storiesLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storiesGrid: {
    paddingBottom: 20,
  },
  storyItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  storyItemSelected: {
    borderWidth: 3,
    borderColor: '#06402B',
  },
  storyThumbnail: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 64, 43, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStories: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default HighlightsBar;
