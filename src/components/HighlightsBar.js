import React, { useState, useEffect, useRef } from 'react';
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
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/ApiService';

const HighlightsBar = ({ userId, isOwnProfile = false, onHighlightPress }) => {
  const { colors } = useTheme();
  const [highlights, setHighlights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSelectStoriesModal, setShowSelectStoriesModal] = useState(false);
  const [highlightName, setHighlightName] = useState('');
  const [archivedStories, setArchivedStories] = useState([]);
  const [selectedStories, setSelectedStories] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [createError, setCreateError] = useState(null);
  const optimisticHighlightsRef = useRef([]);

  useEffect(() => {
    loadHighlights();
  }, [userId]);

  const extractHighlightsArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data?.highlights && Array.isArray(data.highlights)) return data.highlights;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.data?.highlights && Array.isArray(data.data.highlights)) return data.data.highlights;
    if (data?.data?.data && Array.isArray(data.data.data)) return data.data.data;
    return null;
  };

  const loadHighlights = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);

      // Try multiple endpoints to get highlights
      const endpoints = [
        `/highlights?user_id=${userId}`,
        '/highlights',
        `/users/${userId}/highlights`,
      ];

      let highlightsData = null;

      for (const endpoint of endpoints) {
        try {
          const response = await apiService.get(endpoint);
          console.log('📌 [HighlightsBar] Trying', endpoint, '→', JSON.stringify(response.data).substring(0, 300));
          const parsed = extractHighlightsArray(response.data);
          if (parsed !== null) {
            highlightsData = parsed;
            console.log('📌 [HighlightsBar] Found', highlightsData.length, 'highlights from', endpoint);
            break;
          }
        } catch (err) {
          console.log('📌 [HighlightsBar]', endpoint, 'failed:', err?.response?.status || err.message);
          continue;
        }
      }

      let finalHighlights = highlightsData || [];

      // Merge optimistic highlights that the server doesn't know about yet
      if (optimisticHighlightsRef.current.length > 0) {
        const serverIds = new Set(finalHighlights.map(h => h.id));
        const missingOptimistic = optimisticHighlightsRef.current.filter(
          oh => !serverIds.has(oh.id)
        );
        if (missingOptimistic.length > 0) {
          console.log('📌 [HighlightsBar] Preserving', missingOptimistic.length, 'optimistic highlights not yet on server');
          finalHighlights = [...finalHighlights, ...missingOptimistic];
        } else {
          // Server has all our optimistic highlights, clear the ref
          optimisticHighlightsRef.current = [];
        }
      }

      setHighlights(finalHighlights);
    } catch (error) {
      console.error('📌 [HighlightsBar] Error loading highlights:', error?.response?.status, error?.response?.data || error.message);
      // On error, preserve current state (don't wipe optimistic highlights)
      if (highlights.length === 0) {
        setHighlights([]);
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const extractStoriesArray = (resData) => {
    if (Array.isArray(resData)) return resData;
    if (resData?.stories && Array.isArray(resData.stories)) return resData.stories;
    if (resData?.data && Array.isArray(resData.data)) return resData.data;
    if (resData?.data?.stories && Array.isArray(resData.data.stories)) return resData.data.stories;
    if (resData?.data?.data && Array.isArray(resData.data.data)) return resData.data.data;
    return [];
  };

  const loadArchivedStories = async () => {
    try {
      setIsLoadingStories(true);

      // Fetch stories from MULTIPLE sources to ensure we get them
      const results = await Promise.allSettled([
        apiService.getArchivedStories(),
        apiService.getMyStories(),
        apiService.get('/stories?all=1'),
      ]);

      const archivedRes = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
      const myStoriesRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
      const allStoriesRes = results[2].status === 'fulfilled' ? results[2].value : { data: [] };

      console.log('📌 [HighlightsBar] Archived:', results[0].status, JSON.stringify(archivedRes?.data).substring(0, 200));
      console.log('📌 [HighlightsBar] MyStories:', results[1].status, JSON.stringify(myStoriesRes?.data).substring(0, 200));
      console.log('📌 [HighlightsBar] AllStories:', results[2].status);

      const archived = extractStoriesArray(archivedRes?.data);
      const myStories = extractStoriesArray(myStoriesRes?.data);

      // From the all-stories endpoint, filter to only this user's stories
      const allStories = extractStoriesArray(allStoriesRes?.data);
      const myFromAll = userId
        ? allStories.filter(s => Number(s.user_id) === Number(userId))
        : allStories;

      console.log('📌 [HighlightsBar] Counts - archived:', archived.length, 'my:', myStories.length, 'fromAll:', myFromAll.length);

      // Combine all sources and dedupe by ID
      const combined = [...archived, ...myStories, ...myFromAll];
      const seen = new Set();
      const uniqueStories = combined.filter(story => {
        const id = String(story.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      console.log('📌 [HighlightsBar] Total unique stories:', uniqueStories.length);
      setArchivedStories(uniqueStories);
    } catch (error) {
      console.error('📌 [HighlightsBar] Error loading stories:', error?.response?.status, error?.message);
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
      setCreateError(null);

      const coverStory = archivedStories.find(s => s.id === selectedStories[0]);
      const coverUrl = coverStory?.media_url || coverStory?.thumbnail_url || null;
      const trimmedName = highlightName.trim();

      console.log('📌 [HighlightsBar] Creating highlight:', {
        name: trimmedName,
        storyCount: selectedStories.length,
        storyIds: selectedStories,
        coverUrl: coverUrl?.substring(0, 50),
      });

      // Try creating with multiple payload formats for backend compatibility
      let createResponse = null;
      let lastError = null;

      // Attempt 1: story_ids as array (most common Laravel format)
      try {
        createResponse = await apiService.createHighlight({
          title: trimmedName,
          name: trimmedName,
          cover_url: coverUrl,
          cover_image_url: coverUrl,
          story_ids: selectedStories,
        });
        console.log('📌 [HighlightsBar] Create attempt 1 success:', JSON.stringify(createResponse.data).substring(0, 500));
      } catch (err) {
        lastError = err;
        console.log('📌 [HighlightsBar] Create attempt 1 failed:', err?.response?.status, JSON.stringify(err?.response?.data).substring(0, 300));
      }

      // Attempt 2: stories as array field name
      if (!createResponse) {
        try {
          createResponse = await apiService.createHighlight({
            title: trimmedName,
            name: trimmedName,
            cover_url: coverUrl,
            cover_image_url: coverUrl,
            stories: selectedStories,
          });
          console.log('📌 [HighlightsBar] Create attempt 2 success');
        } catch (err) {
          lastError = err;
          console.log('📌 [HighlightsBar] Create attempt 2 failed:', err?.response?.status);
        }
      }

      // Attempt 3: without stories in creation, add them individually after
      if (!createResponse) {
        try {
          createResponse = await apiService.createHighlight({
            title: trimmedName,
            name: trimmedName,
            cover_url: coverUrl,
            cover_image_url: coverUrl,
          });
          console.log('📌 [HighlightsBar] Create attempt 3 (no stories) success');
        } catch (err) {
          lastError = err;
          console.log('📌 [HighlightsBar] Create attempt 3 failed:', err?.response?.status);
        }
      }

      if (!createResponse) {
        throw lastError || new Error('Gagal membuat highlight');
      }

      const resData = createResponse.data;

      // Extract highlight object from various response formats
      const newHighlightObj =
        resData?.highlight ||
        resData?.data?.highlight ||
        resData?.data ||
        resData;

      // Extract highlight ID
      const highlightId =
        newHighlightObj?.id ||
        resData?.highlight?.id ||
        resData?.data?.id ||
        resData?.id ||
        (typeof resData?.data === 'number' ? resData.data : null);

      console.log('📌 [HighlightsBar] Extracted highlightId:', highlightId);

      // Add stories individually as well (some backends need this, or if created without story_ids)
      if (highlightId) {
        for (const storyId of selectedStories) {
          try {
            await apiService.addStoryToHighlight(highlightId, storyId);
            console.log('📌 [HighlightsBar] Added story', storyId, 'to highlight', highlightId);
          } catch (err) {
            // May fail if backend already added stories via story_ids - that's OK
            console.log('📌 [HighlightsBar] addStoryToHighlight:', err?.response?.status || err.message);
          }
        }
      }

      const savedName = trimmedName;

      // Optimistic update: immediately add the new highlight to local state
      const optimisticHighlight = {
        id: highlightId || Date.now(),
        title: savedName,
        name: savedName,
        cover_image_url: coverUrl,
        cover_url: coverUrl,
        items_count: selectedStories.length,
        stories: [],
        ...(typeof newHighlightObj === 'object' && newHighlightObj !== null ? newHighlightObj : {}),
      };
      optimisticHighlightsRef.current = [...optimisticHighlightsRef.current, optimisticHighlight];
      setHighlights(prev => [...prev, optimisticHighlight]);
      console.log('📌 [HighlightsBar] Optimistic update: added highlight to local state');

      setShowSelectStoriesModal(false);
      setHighlightName('');
      setSelectedStories([]);

      // Also reload from API in background to sync with server (without showing loading spinner)
      // Use longer delay to give server time to process
      setTimeout(() => {
        loadHighlights(false).catch(err => {
          console.log('📌 [HighlightsBar] Background reload failed:', err?.message);
        });
      }, 3000);

      Alert.alert('Berhasil', `Highlight "${savedName}" berhasil dibuat!`);
    } catch (error) {
      console.error('📌 [HighlightsBar] Error creating highlight:', error?.response?.status, JSON.stringify(error?.response?.data || {}).substring(0, 500), error.message);
      const msg = error?.response?.data?.message
        || (error?.response?.data?.errors ? JSON.stringify(error.response.data.errors) : null)
        || error.message
        || 'Gagal membuat highlight';
      setCreateError(msg);
      Alert.alert('Error', msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleHighlightPress = async (highlight) => {
    if (onHighlightPress) {
      // Try to pre-fetch highlight details to pass stories along
      try {
        const response = await apiService.getHighlightDetails(highlight.id);
        const data = response.data;
        // Extract stories from response
        const stories =
          data?.highlight?.stories ||
          data?.data?.highlight?.stories ||
          data?.data?.stories ||
          data?.stories ||
          data?.data?.items ||
          data?.items ||
          highlight.stories ||
          [];
        onHighlightPress({ ...highlight, stories });
      } catch (err) {
        console.log('📌 [HighlightsBar] Failed to pre-fetch highlight stories:', err?.response?.status);
        onHighlightPress(highlight);
      }
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
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // Don't show anything if not own profile and no highlights
  if (!isOwnProfile && highlights.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
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
            <View style={[styles.createIconContainer, { borderColor: colors.iconInactive, backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="add" size={28} color={colors.iconInactive} />
            </View>
            <Text style={[styles.highlightLabel, { color: colors.textSecondary }]} numberOfLines={1}>Baru</Text>
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
                handleDeleteHighlight(highlight.id, highlight.title || highlight.name);
              }
            }}
          >
            <View style={[styles.highlightCover, { borderColor: colors.iconInactive }]}>
              {(highlight.cover_image_url || highlight.cover_url) ? (
                <Image
                  source={{ uri: highlight.cover_image_url || highlight.cover_url }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.placeholderCover, { backgroundColor: colors.backgroundTertiary }]}>
                  <Ionicons name="images" size={24} color={colors.iconInactive} />
                </View>
              )}
            </View>
            <Text style={[styles.highlightLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {highlight.title || highlight.name}
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Buat Highlight Baru</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nama Highlight</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.backgroundTertiary, color: colors.textPrimary }]}
                value={highlightName}
                onChangeText={setHighlightName}
                placeholder="Masukkan nama highlight..."
                placeholderTextColor={colors.iconInactive}
                maxLength={30}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
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
          <View style={[styles.modalContent, styles.modalContentLarge, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setShowSelectStoriesModal(false);
                setShowCreateModal(true);
              }}>
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Pilih Stories</Text>
              <TouchableOpacity onPress={() => setShowSelectStoriesModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.selectedCount, { color: colors.textTertiary }]}>
              {selectedStories.length} dipilih
            </Text>

            {isLoadingStories ? (
              <View style={styles.storiesLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
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
                      selectedStories.includes(item.id) && [styles.storyItemSelected, { borderColor: colors.primary }]
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
                <Ionicons name="images-outline" size={64} color={colors.iconInactive} />
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Belum ada story</Text>
                <Text style={[styles.emptySubtext, { color: colors.iconInactive }]}>
                  Upload story terlebih dahulu untuk membuat highlight
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
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
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9CA3AF',
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
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9CA3AF',
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
