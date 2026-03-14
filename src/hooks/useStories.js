import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';

export const useStories = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Persistent set of story IDs the user has viewed locally
  // This prevents fetchStories() from overriding viewed state due to race conditions
  const locallyViewedIds = useRef(new Set());

  /**
   * Fetch all active stories from followed users + current user
   */
  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all stories (not just followed users) so any user can view any story
      const response = await apiService.get('/stories?all=1');

      // Extract stories from response - handle multiple response shapes
      const storiesData = response.data?.stories || response.data?.data?.stories || response.data?.data || [];
      if (Array.isArray(storiesData)) {
        // Merge with locally viewed IDs to prevent race conditions
        const merged = storiesData.map(story =>
          locallyViewedIds.current.has(Number(story.id))
            ? { ...story, has_viewed: true }
            : story
        );
        setStories(merged);
        return merged;
      } else {
        console.warn('Unexpected stories response format:', Object.keys(response.data || {}));
        setStories([]);
        return [];
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError(err.response?.data?.message || 'Failed to fetch stories');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch user's own stories
   */
  const fetchMyStories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/stories/my-stories');

      const storiesData = response.data?.stories || response.data?.data?.stories || response.data?.data || [];
      if (Array.isArray(storiesData)) {
        setMyStories(storiesData);
      } else {
        console.warn('Unexpected my-stories response format:', Object.keys(response.data || {}));
        setMyStories([]);
      }
    } catch (err) {
      console.error('Error fetching my stories:', err);
      setError(err.response?.data?.message || 'Failed to fetch your stories');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Helper function to get MIME type from URI
   */
  const getMimeType = (uri, mediaType) => {
    // Extract extension from URI - handle various formats
    let ext = '';

    // Try to get extension from URI
    if (uri) {
      // Remove query params and hash
      const cleanUri = uri.split('?')[0].split('#')[0];
      // Get the last part after the last dot
      const parts = cleanUri.split('.');
      if (parts.length > 1) {
        ext = parts[parts.length - 1].toLowerCase();
      }
    }

    // MIME type mapping
    const mimeMap = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
      // Videos
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      m4v: 'video/x-m4v',
      '3gp': 'video/3gpp',
      webm: 'video/webm',
    };

    // If we found an extension and it's in our map, use it
    if (ext && mimeMap[ext]) {
      return { mimeType: mimeMap[ext], extension: ext };
    }

    // Fallback based on mediaType
    if (mediaType === 'video') {
      return { mimeType: 'video/mp4', extension: 'mp4' };
    }
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  };

  /**
   * Upload and create a new story
   */
  const uploadStory = useCallback(async (mediaUri, mediaType, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📤 [useStories] Starting story upload:', {
        mediaUri: mediaUri?.substring(0, 80),
        mediaType,
        options: { ...options, text_elements: options.text_elements ? 'present' : 'none' },
      });

      // Validate mediaUri
      if (!mediaUri) {
        throw new Error('Media URI is required');
      }

      // Get MIME type and extension
      const { mimeType, extension } = getMimeType(mediaUri, mediaType);

      console.log('📤 [useStories] File info:', {
        mimeType,
        extension,
        uriPrefix: mediaUri.substring(0, 20),
      });

      // Create FormData
      const formData = new FormData();

      // CRITICAL: Append file with correct format for React Native
      // The object must have: uri, type, name
      // DO NOT strip file:// prefix - React Native needs it
      formData.append('media', {
        uri: mediaUri,
        type: mimeType,
        name: `story_${Date.now()}.${extension}`,
      });

      // Add other fields
      formData.append('media_type', mediaType);
      formData.append('duration', String(options.duration || (mediaType === 'video' ? 15 : 5)));

      if (options.caption) formData.append('caption', options.caption);

      // Handle stickers: upload image sticker files alongside the main media
      if (options.stickers && Array.isArray(options.stickers)) {
        let stickerImageIndex = 0;
        const stickersMeta = options.stickers.map((sticker) => {
          if (sticker.type === 'image' && sticker.data?.imageUri && sticker.data.imageUri.startsWith('file://')) {
            // Add the image file to FormData with indexed key
            const idx = stickerImageIndex++;
            const stickerMime = getMimeType(sticker.data.imageUri, 'image');
            formData.append(`sticker_images[${idx}]`, {
              uri: sticker.data.imageUri,
              type: stickerMime.mimeType,
              name: `sticker_${Date.now()}_${idx}.${stickerMime.extension}`,
            });
            console.log('📤 [useStories] Adding image sticker file:', idx);
            // Replace local URI with placeholder that backend will fill
            return { ...sticker, data: { ...sticker.data, imageUri: `__STICKER_IMAGE_${idx}__` } };
          }
          return sticker;
        });
        formData.append('stickers', JSON.stringify(stickersMeta));
      } else if (options.stickers) {
        formData.append('stickers', JSON.stringify(options.stickers));
      }

      if (options.text_elements) formData.append('text_elements', options.text_elements);
      if (options.filter) formData.append('filter', options.filter);
      if (options.allowResharing !== undefined) {
        formData.append('allow_resharing', options.allowResharing ? '1' : '0');
      }

      console.log('📤 [useStories] Sending upload request...');

      const response = await apiService.uploadStory(formData);

      console.log('📤 [useStories] Upload response:', {
        success: response.data?.success,
        storyId: response.data?.story?.id,
      });

      if (response.data.success) {
        // Refresh stories
        await fetchStories();
        await fetchMyStories();
        return response.data.story;
      } else {
        throw new Error(response.data?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('❌ [useStories] Error uploading story:', err);
      console.error('❌ [useStories] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        code: err.code,
      });

      const errorMessage = err.response?.data?.message || err.message || 'Failed to upload story';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStories, fetchMyStories]);

  /**
   * Mark story as viewed
   */
  const markAsViewed = useCallback(async (storyId) => {
    try {
      console.log('👁️ [useStories] Recording view for story:', storyId);
      // Track locally so fetchStories won't overwrite
      locallyViewedIds.current.add(Number(storyId));

      const response = await apiService.recordStoryView(storyId);
      console.log('👁️ [useStories] View recorded:', response?.data);

      // Update local state
      setStories(prev => prev.map(story =>
        story.id === storyId
          ? { ...story, has_viewed: true, view_count: (story.view_count || 0) + 1 }
          : story
      ));
    } catch (err) {
      console.error('❌ [useStories] Error marking story as viewed:', err?.response?.data || err.message);
    }
  }, []);

  /**
   * Get story viewers
   */
  const getViewers = useCallback(async (storyId) => {
    try {
      const response = await apiService.get(`/stories/${storyId}/viewers`);
      console.log('👁️ [useStories] Viewers raw response keys:', Object.keys(response.data || {}));

      // Return both viewers array AND full response data for interaction extraction
      const viewers = response.data?.viewers || response.data?.data?.viewers || response.data?.data || [];
      return {
        viewers: Array.isArray(viewers) ? viewers : [],
        fullResponse: response.data,
      };
    } catch (err) {
      console.error('Error fetching story viewers:', err);
      return { viewers: [], fullResponse: {} };
    }
  }, []);

  /**
   * Archive a story
   */
  const archiveStory = useCallback(async (storyId) => {
    try {
      const response = await apiService.post(`/stories/${storyId}/archive`);

      if (response.data.success) {
        // Refresh stories
        await fetchMyStories();
      }
    } catch (err) {
      console.error('Error archiving story:', err);
      throw err;
    }
  }, [fetchMyStories]);

  /**
   * Unarchive a story
   */
  const unarchiveStory = useCallback(async (storyId) => {
    try {
      const response = await apiService.post(`/stories/${storyId}/unarchive`);

      if (response.data.success) {
        // Refresh stories
        await fetchMyStories();
      }
    } catch (err) {
      console.error('Error unarchiving story:', err);
      throw err;
    }
  }, [fetchMyStories]);

  /**
   * Delete a story
   */
  const deleteStory = useCallback(async (storyId) => {
    try {
      const response = await apiService.delete(`/stories/${storyId}`);

      if (response.data.success) {
        // Remove from local state
        setStories(prev => prev.filter(story => story.id !== storyId));
        setMyStories(prev => prev.filter(story => story.id !== storyId));
      }
    } catch (err) {
      console.error('Error deleting story:', err);
      throw err;
    }
  }, []);

  /**
   * Get archived stories
   */
  const fetchArchivedStories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/stories/archived');

      return response.data?.stories || response.data?.data?.stories || response.data?.data || [];
    } catch (err) {
      console.error('Error fetching archived stories:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch stories on mount - use user?.id to avoid re-fetching on every context update
  useEffect(() => {
    if (user?.id) {
      fetchStories();
      fetchMyStories();
    }
  }, [user?.id, fetchStories, fetchMyStories]);

  // Mark multiple stories as viewed in local state (used when StoryViewer closes)
  const markStoriesAsViewed = useCallback((storyIds) => {
    if (!Array.isArray(storyIds) || storyIds.length === 0) return;
    const idSet = new Set(storyIds.map(Number));
    // Track locally so fetchStories won't overwrite
    idSet.forEach(id => locallyViewedIds.current.add(id));
    setStories(prev => prev.map(story =>
      idSet.has(Number(story.id))
        ? { ...story, has_viewed: true }
        : story
    ));
  }, []);

  return {
    stories,
    myStories,
    loading,
    error,
    fetchStories,
    fetchMyStories,
    uploadStory,
    markAsViewed,
    markStoriesAsViewed,
    getViewers,
    archiveStory,
    unarchiveStory,
    deleteStory,
    fetchArchivedStories,
  };
};

export default useStories;
