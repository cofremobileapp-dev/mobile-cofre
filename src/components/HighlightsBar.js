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
import * as ImagePicker from 'expo-image-picker';
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

  // Edit highlight state
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditStoriesModal, setShowEditStoriesModal] = useState(false);
  const [showAddStoriesModal, setShowAddStoriesModal] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCurrentStories, setEditCurrentStories] = useState([]);
  const [editSelectedNewStories, setEditSelectedNewStories] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEditStories, setIsLoadingEditStories] = useState(false);
  const [createCoverImageUri, setCreateCoverImageUri] = useState(null);
  const [editCoverImageUri, setEditCoverImageUri] = useState(null);

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
    setCreateCoverImageUri(null);
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

  const pickCoverImage = async (mode = 'create') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Izin Diperlukan', 'Izinkan akses ke galeri untuk memilih cover image');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (mode === 'create') {
        setCreateCoverImageUri(result.assets[0].uri);
      } else {
        setEditCoverImageUri(result.assets[0].uri);
      }
    }
  };

  const buildCoverFormData = (imageUri, extraFields = {}) => {
    const formData = new FormData();
    const uriParts = imageUri.split('.');
    const fileType = uriParts[uriParts.length - 1].toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    formData.append('cover_image', {
      uri: imageUri,
      name: `highlight_cover_${Date.now()}.${fileType}`,
      type: mimeTypes[fileType] || 'image/jpeg',
    });
    Object.entries(extraFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    return formData;
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
      const hasCustomCover = !!createCoverImageUri;

      console.log('📌 [HighlightsBar] Creating highlight:', {
        name: trimmedName,
        storyCount: selectedStories.length,
        storyIds: selectedStories,
        coverUrl: coverUrl?.substring(0, 50),
        hasCustomCover,
      });

      // Try creating with multiple payload formats for backend compatibility
      let createResponse = null;
      let lastError = null;

      // If user picked a custom cover image, use FormData upload
      if (hasCustomCover) {
        try {
          const formData = buildCoverFormData(createCoverImageUri, { title: trimmedName });
          selectedStories.forEach((id, index) => {
            formData.append(`story_ids[${index}]`, id);
          });
          createResponse = await apiService.uploadFile('/highlights', formData);
          console.log('📌 [HighlightsBar] Create with custom cover success:', JSON.stringify(createResponse).substring(0, 500));
        } catch (err) {
          lastError = err;
          console.log('📌 [HighlightsBar] Create with custom cover failed:', err?.response?.status || err?.status, JSON.stringify(err?.response?.data || err?.data).substring(0, 300));
        }
      }

      // Attempt 1: story_ids as array (most common Laravel format)
      if (!createResponse) {
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

      // uploadFile returns { data, status } directly, apiService methods return { data: { ... } }
      const resData = createResponse.data || createResponse;

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
      const optimisticCover = hasCustomCover ? createCoverImageUri : coverUrl;
      const optimisticHighlight = {
        id: highlightId || Date.now(),
        title: savedName,
        name: savedName,
        cover_image_url: optimisticCover,
        cover_url: optimisticCover,
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
      setCreateCoverImageUri(null);

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

  // Long-press: show options (Edit / Delete) instead of directly deleting
  const handleLongPress = (highlight) => {
    setEditingHighlight(highlight);
    setShowOptionsModal(true);
  };

  // Open edit modal with current highlight data
  const handleEditHighlight = async () => {
    setShowOptionsModal(false);
    const hl = editingHighlight;
    setEditTitle(hl.title || hl.name || '');
    setEditCoverImageUri(null);
    setShowEditModal(true);

    // Load current stories in this highlight
    setIsLoadingEditStories(true);
    try {
      const response = await apiService.getHighlightDetails(hl.id);
      const data = response.data;
      const stories =
        data?.highlight?.stories ||
        data?.data?.stories ||
        data?.stories ||
        hl.stories ||
        [];
      setEditCurrentStories(stories);
    } catch (err) {
      console.log('📌 [HighlightsBar] Failed to load highlight stories for edit:', err?.response?.status);
      setEditCurrentStories(hl.stories || []);
    } finally {
      setIsLoadingEditStories(false);
    }
  };

  // Save edited title and/or cover
  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Nama highlight tidak boleh kosong');
      return;
    }
    try {
      setIsSaving(true);

      let newCoverUrl = null;

      // If user picked a custom cover image, upload via FormData
      if (editCoverImageUri) {
        const uploadRes = await apiService.updateHighlightWithCover(editingHighlight.id, editCoverImageUri, { title: editTitle.trim() });
        const resData = uploadRes?.data || uploadRes;
        newCoverUrl = resData?.highlight?.cover_image_url || resData?.cover_image_url || editCoverImageUri;
        console.log('📌 [HighlightsBar] Cover image uploaded, new URL:', newCoverUrl);
      } else {
        // No custom cover - send regular JSON update
        const updateData = { title: editTitle.trim() };

        // If there are current stories, use the first one as cover
        if (editCurrentStories.length > 0) {
          const coverUrl = editCurrentStories[0].media_url || editCurrentStories[0].thumbnail_url;
          if (coverUrl) {
            updateData.cover_image_url = coverUrl;
          }
        }

        await apiService.updateHighlight(editingHighlight.id, updateData);
        newCoverUrl = updateData.cover_image_url;
      }

      // Update local state
      setHighlights(prev =>
        prev.map(h =>
          h.id === editingHighlight.id
            ? { ...h, title: editTitle.trim(), name: editTitle.trim(), cover_image_url: newCoverUrl || h.cover_image_url, cover_url: newCoverUrl || h.cover_url }
            : h
        )
      );

      setShowEditModal(false);
      setEditCoverImageUri(null);
      Alert.alert('Berhasil', 'Highlight berhasil diperbarui!');
      loadHighlights(false);
    } catch (error) {
      console.error('📌 [HighlightsBar] Error updating highlight:', error?.response?.status, error?.response?.data);
      Alert.alert('Error', error?.response?.data?.message || 'Gagal memperbarui highlight');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove a story from the highlight
  const handleRemoveStoryFromHighlight = async (storyId) => {
    Alert.alert(
      'Hapus Story',
      'Hapus story ini dari highlight?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.removeStoryFromHighlight(editingHighlight.id, storyId);
              setEditCurrentStories(prev => prev.filter(s => s.id !== storyId));
              Alert.alert('Berhasil', 'Story dihapus dari highlight');
            } catch (error) {
              console.error('📌 [HighlightsBar] Error removing story:', error?.response?.status);
              Alert.alert('Error', 'Gagal menghapus story dari highlight');
            }
          },
        },
      ]
    );
  };

  // Set a story as cover image
  const handleSetCover = (story) => {
    const coverUrl = story.media_url || story.thumbnail_url;
    if (coverUrl) {
      // Update local state immediately for feedback
      setHighlights(prev =>
        prev.map(h =>
          h.id === editingHighlight.id
            ? { ...h, cover_image_url: coverUrl, cover_url: coverUrl }
            : h
        )
      );
      setEditingHighlight(prev => ({ ...prev, cover_image_url: coverUrl, cover_url: coverUrl }));
      Alert.alert('Cover Diperbarui', 'Cover highlight akan disimpan saat Anda menekan Simpan');
    }
  };

  // Open add stories modal
  const handleOpenAddStories = () => {
    setEditSelectedNewStories([]);
    loadArchivedStories();
    setShowAddStoriesModal(true);
  };

  // Toggle selection for adding stories
  const toggleEditStorySelection = (storyId) => {
    setEditSelectedNewStories(prev => {
      if (prev.includes(storyId)) {
        return prev.filter(id => id !== storyId);
      } else {
        return [...prev, storyId];
      }
    });
  };

  // Submit adding new stories to existing highlight
  const handleAddStoriesToHighlight = async () => {
    if (editSelectedNewStories.length === 0) {
      Alert.alert('Error', 'Pilih minimal 1 story');
      return;
    }

    try {
      setIsSaving(true);
      let addedCount = 0;

      for (const storyId of editSelectedNewStories) {
        try {
          await apiService.addStoryToHighlight(editingHighlight.id, storyId);
          addedCount++;
        } catch (err) {
          console.log('📌 [HighlightsBar] addStoryToHighlight failed for', storyId, ':', err?.response?.status, err?.response?.data?.message);
        }
      }

      if (addedCount > 0) {
        // Reload stories for edit modal
        try {
          const response = await apiService.getHighlightDetails(editingHighlight.id);
          const data = response.data;
          const stories =
            data?.highlight?.stories ||
            data?.data?.stories ||
            data?.stories ||
            [];
          setEditCurrentStories(stories);
        } catch (err) {
          console.log('📌 [HighlightsBar] reload after add failed');
        }

        Alert.alert('Berhasil', `${addedCount} story ditambahkan ke highlight`);
      } else {
        Alert.alert('Error', 'Gagal menambahkan story. Mungkin sudah ada di highlight ini.');
      }

      setShowAddStoriesModal(false);
      setEditSelectedNewStories([]);
      loadHighlights(false);
    } catch (error) {
      console.error('📌 [HighlightsBar] Error adding stories:', error);
      Alert.alert('Error', 'Gagal menambahkan story');
    } finally {
      setIsSaving(false);
    }
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
                handleLongPress(highlight);
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

            {/* Cover Image Picker */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cover Image (opsional)</Text>
              <TouchableOpacity
                style={[styles.coverPickerButton, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}
                onPress={() => pickCoverImage('create')}
              >
                {createCoverImageUri ? (
                  <Image source={{ uri: createCoverImageUri }} style={styles.coverPickerPreview} resizeMode="cover" />
                ) : (
                  <View style={styles.coverPickerPlaceholder}>
                    <Ionicons name="camera" size={28} color={colors.iconInactive} />
                    <Text style={[styles.coverPickerText, { color: colors.iconInactive }]}>Pilih cover</Text>
                  </View>
                )}
                {createCoverImageUri && (
                  <TouchableOpacity
                    style={styles.coverPickerRemove}
                    onPress={() => setCreateCoverImageUri(null)}
                  >
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
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
      {/* Options Modal (Edit / Delete) */}
      <Modal
        visible={showOptionsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={[styles.optionsModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary, textAlign: 'center', marginBottom: 16 }]}>
              {editingHighlight?.title || editingHighlight?.name}
            </Text>

            <TouchableOpacity
              style={[styles.optionButton, { borderBottomColor: colors.border }]}
              onPress={handleEditHighlight}
            >
              <Ionicons name="pencil" size={22} color={colors.primary} />
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>Edit Highlight</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setShowOptionsModal(false);
                if (editingHighlight) {
                  handleDeleteHighlight(editingHighlight.id, editingHighlight.title || editingHighlight.name);
                }
              }}
            >
              <Ionicons name="trash" size={22} color="#EF4444" />
              <Text style={[styles.optionText, { color: '#EF4444' }]}>Hapus Highlight</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.backgroundTertiary, marginTop: 12 }]}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={[styles.submitButtonText, { color: colors.textPrimary }]}>Batal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Highlight Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentLarge, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Highlight</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nama Highlight</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.backgroundTertiary, color: colors.textPrimary }]}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Masukkan nama highlight..."
                placeholderTextColor={colors.iconInactive}
                maxLength={30}
              />
            </View>

            {/* Cover Image Picker */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cover Image</Text>
              <TouchableOpacity
                style={[styles.coverPickerButton, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}
                onPress={() => pickCoverImage('edit')}
              >
                {editCoverImageUri ? (
                  <Image source={{ uri: editCoverImageUri }} style={styles.coverPickerPreview} resizeMode="cover" />
                ) : (editingHighlight?.cover_image_url || editingHighlight?.cover_url) ? (
                  <Image source={{ uri: editingHighlight.cover_image_url || editingHighlight.cover_url }} style={styles.coverPickerPreview} resizeMode="cover" />
                ) : (
                  <View style={styles.coverPickerPlaceholder}>
                    <Ionicons name="camera" size={28} color={colors.iconInactive} />
                    <Text style={[styles.coverPickerText, { color: colors.iconInactive }]}>Pilih cover</Text>
                  </View>
                )}
                <View style={styles.coverPickerOverlayButton}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
                {editCoverImageUri && (
                  <TouchableOpacity
                    style={styles.coverPickerRemove}
                    onPress={() => setEditCoverImageUri(null)}
                  >
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* Current Stories */}
            <View style={styles.inputContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Stories ({editCurrentStories.length})
                </Text>
                <TouchableOpacity onPress={handleOpenAddStories}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="add-circle" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '500' }}>Tambah</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {isLoadingEditStories ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
              ) : editCurrentStories.length > 0 ? (
                <FlatList
                  data={editCurrentStories}
                  horizontal
                  keyExtractor={(item) => item.id.toString()}
                  style={{ marginTop: 8 }}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={styles.editStoryItem}>
                      <Image
                        source={{ uri: item.media_url || item.thumbnail_url }}
                        style={styles.editStoryThumb}
                        resizeMode="cover"
                      />
                      {/* Set as cover button */}
                      <TouchableOpacity
                        style={styles.setCoverButton}
                        onPress={() => handleSetCover(item)}
                      >
                        <Ionicons name="image" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                      {/* Remove button */}
                      <TouchableOpacity
                        style={styles.removeStoryButton}
                        onPress={() => handleRemoveStoryFromHighlight(item.id)}
                      >
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                />
              ) : (
                <Text style={[{ color: colors.textTertiary, fontSize: 13, marginTop: 8 }]}>
                  Belum ada story di highlight ini
                </Text>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                (!editTitle.trim() || isSaving) && styles.submitButtonDisabled,
              ]}
              onPress={handleSaveEdit}
              disabled={!editTitle.trim() || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Simpan</Text>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Stories to Existing Highlight Modal */}
      <Modal
        visible={showAddStoriesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddStoriesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentLarge, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddStoriesModal(false)}>
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Tambah Stories</Text>
              <TouchableOpacity onPress={() => setShowAddStoriesModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.selectedCount, { color: colors.textTertiary }]}>
              {editSelectedNewStories.length} dipilih
            </Text>

            {isLoadingStories ? (
              <View style={styles.storiesLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : archivedStories.length > 0 ? (
              <FlatList
                data={archivedStories.filter(s => !editCurrentStories.some(cs => cs.id === s.id))}
                numColumns={3}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.storiesGrid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.storyItem,
                      editSelectedNewStories.includes(item.id) && [styles.storyItemSelected, { borderColor: colors.primary }],
                    ]}
                    onPress={() => toggleEditStorySelection(item.id)}
                  >
                    <Image
                      source={{ uri: item.media_url || item.thumbnail_url }}
                      style={styles.storyThumbnail}
                      resizeMode="cover"
                    />
                    {editSelectedNewStories.includes(item.id) && (
                      <View style={styles.selectedOverlay}>
                        <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyStories}>
                    <Ionicons name="images-outline" size={48} color={colors.iconInactive} />
                    <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Semua story sudah ada di highlight ini</Text>
                  </View>
                }
              />
            ) : (
              <View style={styles.emptyStories}>
                <Ionicons name="images-outline" size={64} color={colors.iconInactive} />
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Belum ada story</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                (editSelectedNewStories.length === 0 || isSaving) && styles.submitButtonDisabled,
              ]}
              onPress={handleAddStoriesToHighlight}
              disabled={editSelectedNewStories.length === 0 || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Tambahkan</Text>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
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
  optionsModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  editStoryItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
  },
  editStoryThumb: {
    width: '100%',
    height: '100%',
  },
  removeStoryButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },
  setCoverButton: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 3,
  },
  coverPickerButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginTop: 8,
  },
  coverPickerPreview: {
    width: '100%',
    height: '100%',
  },
  coverPickerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  coverPickerText: {
    fontSize: 11,
    textAlign: 'center',
  },
  coverPickerRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
  },
  coverPickerOverlayButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 4,
  },
});

export default HighlightsBar;
