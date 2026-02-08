import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';

export const useStories = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all active stories from followed users + current user
   */
  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/stories');

      if (response.data.success) {
        setStories(response.data.stories);
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError(err.response?.data?.message || 'Failed to fetch stories');
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

      if (response.data.success) {
        setMyStories(response.data.stories);
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

      // Create FormData
      const formData = new FormData();

      // Get file extension
      const uriParts = mediaUri.split('.');
      const fileExtension = uriParts[uriParts.length - 1];

      formData.append('media', {
        uri: mediaUri,
        type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        name: `story-${Date.now()}.${fileExtension}`
      });

      formData.append('media_type', mediaType);
      formData.append('duration', options.duration || (mediaType === 'video' ? 15 : 5));

      if (options.caption) formData.append('caption', options.caption);
      if (options.stickers) formData.append('stickers', JSON.stringify(options.stickers));
      // text_elements already JSON stringified in StoryPreviewScreen
      if (options.text_elements) formData.append('text_elements', options.text_elements);
      if (options.filter) formData.append('filter', options.filter);
      if (options.allowResharing !== undefined) {
        formData.append('allow_resharing', options.allowResharing ? '1' : '0');
      }

      const response = await apiService.post('/stories/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 180000, // 3 minutes for large uploads
      });

      if (response.data.success) {
        // Refresh stories
        await fetchStories();
        await fetchMyStories();
        return response.data.story;
      }
    } catch (err) {
      console.error('Error uploading story:', err);
      setError(err.response?.data?.message || 'Failed to upload story');
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
      await apiService.post(`/stories/${storyId}/view`);

      // Update local state
      setStories(prev => prev.map(story =>
        story.id === storyId
          ? { ...story, has_viewed: true, view_count: (story.view_count || 0) + 1 }
          : story
      ));
    } catch (err) {
      console.error('Error marking story as viewed:', err);
    }
  }, []);

  /**
   * Get story viewers
   */
  const getViewers = useCallback(async (storyId) => {
    try {
      const response = await apiService.get(`/stories/${storyId}/viewers`);

      if (response.data.success) {
        return response.data.viewers;
      }
    } catch (err) {
      console.error('Error fetching story viewers:', err);
      throw err;
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

      if (response.data.success) {
        return response.data.stories;
      }
    } catch (err) {
      console.error('Error fetching archived stories:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch stories on mount
  useEffect(() => {
    if (user) {
      fetchStories();
      fetchMyStories();
    }
  }, [user, fetchStories, fetchMyStories]);

  return {
    stories,
    myStories,
    loading,
    error,
    fetchStories,
    fetchMyStories,
    uploadStory,
    markAsViewed,
    getViewers,
    archiveStory,
    unarchiveStory,
    deleteStory,
    fetchArchivedStories,
  };
};

export default useStories;
