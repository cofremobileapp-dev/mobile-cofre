import React, { createContext, useState, useContext, useCallback, useRef, useEffect } from 'react';
import { apiService } from '../services/ApiService';
import { useAuth } from './AuthContext';

const StoriesContext = createContext({});

export const StoriesProvider = ({ children }) => {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Persistent set of story IDs the user has viewed locally
  // This prevents fetchStories() from overriding viewed state due to race conditions
  const locallyViewedIds = useRef(new Set());

  /**
   * Helper function to get MIME type from URI
   */
  const getMimeType = (uri, mediaType) => {
    let ext = '';
    if (uri) {
      const cleanUri = uri.split('?')[0].split('#')[0];
      const parts = cleanUri.split('.');
      if (parts.length > 1) {
        ext = parts[parts.length - 1].toLowerCase();
      }
    }

    const mimeMap = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
      mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
      m4v: 'video/x-m4v', '3gp': 'video/3gpp', webm: 'video/webm',
    };

    if (ext && mimeMap[ext]) {
      return { mimeType: mimeMap[ext], extension: ext };
    }
    if (mediaType === 'video') {
      return { mimeType: 'video/mp4', extension: 'mp4' };
    }
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  };

  /**
   * Fetch all active stories from followed users + current user
   */
  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/stories');

      const storiesData = response.data?.stories || response.data?.data?.stories || response.data?.data || [];
      if (Array.isArray(storiesData)) {
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
   * Upload and create a new story
   */
  const uploadStory = useCallback(async (mediaUri, mediaType, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📤 [Stories] Starting story upload:', {
        mediaUri: mediaUri?.substring(0, 80),
        mediaType,
        options: { ...options, text_elements: options.text_elements ? 'present' : 'none' },
      });

      if (!mediaUri) {
        throw new Error('Media URI is required');
      }

      const { mimeType, extension } = getMimeType(mediaUri, mediaType);

      console.log('📤 [Stories] File info:', { mimeType, extension, uriPrefix: mediaUri.substring(0, 20) });

      const formData = new FormData();
      formData.append('media', {
        uri: mediaUri,
        type: mimeType,
        name: `story_${Date.now()}.${extension}`,
      });
      formData.append('media_type', mediaType);
      formData.append('duration', String(options.duration || (mediaType === 'video' ? 15 : 5)));

      if (options.caption) formData.append('caption', options.caption);

      // Handle stickers: upload image sticker files alongside the main media
      if (options.stickers && Array.isArray(options.stickers)) {
        let stickerImageIndex = 0;
        const stickersMeta = options.stickers.map((sticker) => {
          if (sticker.type === 'image' && sticker.data?.imageUri && sticker.data.imageUri.startsWith('file://')) {
            const idx = stickerImageIndex++;
            const stickerMime = getMimeType(sticker.data.imageUri, 'image');
            formData.append(`sticker_images[${idx}]`, {
              uri: sticker.data.imageUri,
              type: stickerMime.mimeType,
              name: `sticker_${Date.now()}_${idx}.${stickerMime.extension}`,
            });
            console.log('📤 [Stories] Adding image sticker file:', idx);
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

      console.log('📤 [Stories] Sending upload request...');

      const response = await apiService.uploadStory(formData);

      console.log('📤 [Stories] Upload response:', {
        success: response.data?.success,
        storyId: response.data?.story?.id,
      });

      if (response.data.success) {
        // Refresh stories - this updates the shared context state
        await fetchStories();
        await fetchMyStories();
        return response.data.story;
      } else {
        throw new Error(response.data?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('❌ [Stories] Error uploading story:', err);
      console.error('❌ [Stories] Error details:', {
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
      console.log('👁️ [Stories] Recording view for story:', storyId);
      locallyViewedIds.current.add(Number(storyId));

      const response = await apiService.recordStoryView(storyId);
      console.log('👁️ [Stories] View recorded:', response?.data);

      setStories(prev => prev.map(story =>
        story.id === storyId
          ? { ...story, has_viewed: true, view_count: (story.view_count || 0) + 1 }
          : story
      ));
    } catch (err) {
      console.error('❌ [Stories] Error marking story as viewed:', err?.response?.data || err.message);
    }
  }, []);

  /**
   * Get story viewers
   */
  const getViewers = useCallback(async (storyId) => {
    try {
      const response = await apiService.get(`/stories/${storyId}/viewers`);
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

  // Fetch stories on mount when user is authenticated
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
    idSet.forEach(id => locallyViewedIds.current.add(id));
    setStories(prev => prev.map(story =>
      idSet.has(Number(story.id))
        ? { ...story, has_viewed: true }
        : story
    ));
  }, []);

  const value = {
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

  return (
    <StoriesContext.Provider value={value}>
      {children}
    </StoriesContext.Provider>
  );
};

export const useStories = () => {
  const context = useContext(StoriesContext);
  if (!context) {
    throw new Error('useStories must be used within a StoriesProvider');
  }
  return context;
};

export default useStories;
