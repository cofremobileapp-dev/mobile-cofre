import axios from 'axios';
import { secureStorage, STORAGE_KEYS } from '../utils/secureStorage';
import { API_CONFIG } from '../config/api.config';

const API_BASE_URL = API_CONFIG.BASE_URL;

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: API_CONFIG.TIMEOUT.DEFAULT,
    });

    this.authToken = null;

    // Request Interceptor - Add auth token to all requests
    this.api.interceptors.request.use(
      async (config) => {
        console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`);
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
          console.log('📤 [API] Auth token attached');
        } else {
          console.log('📤 [API] No auth token');
        }
        return config;
      },
      (error) => {
        console.error('📤 [API] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    // Response Interceptor - SIMPLIFIED FOR DEADLINE (No Refresh Token)
    this.api.interceptors.response.use(
      (response) => {
        console.log(`📥 [API] ${response.config?.method?.toUpperCase()} ${response.config?.url} - ${response.status}`);
        return response;
      },
      async (error) => {
        console.error(`📥 [API] Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || error.code}`);
        const originalRequest = error.config;

        // Handle 401 Unauthorized - Token invalid/expired
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // DON'T auto-clear auth data - let AuthContext handle logout
          // Just reject with error and let UI handle it gracefully
          return Promise.reject(new Error('Unauthorized. Please check your session.'));
        }

        // Handle 429 Too Many Requests - Rate limiting
        if (error.response?.status === 429) {
          console.warn('⚠️ [API] Rate limit exceeded (429)');
          // Don't show alert for rate limiting on background requests
          if (originalRequest._skipRetry) {
            return Promise.reject(error);
          }
          // Create a more user-friendly error message
          error.userMessage = 'Terlalu banyak permintaan. Silakan tunggu 30 detik sebelum mencoba lagi.';
          error.isRateLimited = true;
          error.retryAfter = error.response?.headers?.['retry-after'] || 30;
          return Promise.reject(error);
        }

        if (error.response) {
          // Server responded with error status
        } else if (error.request) {
          // Request was made but no response received (timeout or network error)

          // Retry logic for network errors
          if (!originalRequest._retry) {
            originalRequest._retry = 0;
          }

          // Skip retry if _skipRetry flag is set (for non-critical requests like view tracking)
          if (!originalRequest._skipRetry && API_CONFIG.FEATURES.AUTO_RETRY && originalRequest._retry < API_CONFIG.RETRY.MAX_ATTEMPTS) {
            originalRequest._retry++;

            // Calculate delay with exponential backoff
            let delay = API_CONFIG.RETRY.DELAY;
            if (API_CONFIG.RETRY.EXPONENTIAL_BACKOFF) {
              // Exponential backoff: delay * 2^(retry - 1)
              // Attempt 1: 2s, Attempt 2: 4s, Attempt 3: 8s
              delay = API_CONFIG.RETRY.DELAY * Math.pow(2, originalRequest._retry - 1);
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay));

            // Increase timeout for retry
            originalRequest.timeout = API_CONFIG.TIMEOUT.RETRY;

            return this.api(originalRequest);
          }

          // Provide user-friendly error message
          const baseURL = API_CONFIG.BASE_URL.replace('/api', '');
          const errorMessage = error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK'
            ? `⏱️ Koneksi timeout.\n\n` +
              `Backend server di ${baseURL} tidak merespon.\n\n` +
              `Pastikan:\n` +
              `✅ Backend server berjalan (php artisan serve)\n` +
              `✅ IP address benar di mobile/src/config/api.config.js\n` +
              `✅ Firewall tidak memblokir\n` +
              `✅ Perangkat di jaringan yang sama`
            : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';

          error.userMessage = errorMessage;
        } else {
          // Something else happened
        }
        return Promise.reject(error);
      }
    );
  }

  // Clear auth data - SIMPLIFIED (No refresh token)
  async clearAuthData() {
    this.authToken = null;
    await secureStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_DATA,
    ]);
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  // HTTP Methods
  async get(url, config = {}) {
    return this.api.get(url, config);
  }

  async post(url, data = {}, config = {}) {
    return this.api.post(url, data, config);
  }

  async put(url, data = {}, config = {}) {
    return this.api.put(url, data, config);
  }

  async patch(url, data = {}, config = {}) {
    return this.api.patch(url, data, config);
  }

  async delete(url, config = {}) {
    return this.api.delete(url, config);
  }

  // Special method for file uploads - uses fresh axios instance to avoid header conflicts
  async uploadFile(url, formData, onUploadProgress = null) {
    // Create a fresh axios instance specifically for file uploads
    // This avoids the default 'application/json' Content-Type header issue
    const uploadInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_CONFIG.TIMEOUT.UPLOAD, // 3 minutes for uploads
      headers: {
        'Accept': 'application/json',
        // DO NOT set Content-Type here - let axios auto-detect for FormData
      },
    });

    // Add auth token if available
    if (this.authToken) {
      uploadInstance.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`;
    }

    const config = {};

    if (onUploadProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`📤 [Upload] Progress: ${percentCompleted}%`);
        onUploadProgress(progressEvent);
      };
    }

    console.log('📤 [API] Uploading file to:', url);
    console.log('📤 [API] Using fresh axios instance for multipart/form-data');

    // Log FormData contents for debugging
    if (formData._parts) {
      formData._parts.forEach((part, index) => {
        const [key, value] = part;
        if (typeof value === 'object' && value.uri) {
          console.log(`📤 [API] FormData[${index}]: ${key} = file(${value.name}, ${value.type})`);
        } else {
          console.log(`📤 [API] FormData[${index}]: ${key} = ${typeof value === 'string' ? value.substring(0, 50) + '...' : typeof value}`);
        }
      });
    }

    try {
      const response = await uploadInstance.post(url, formData, config);
      console.log('📥 [API] Upload success:', response.status);
      return response;
    } catch (error) {
      console.error('📥 [API] Upload error:', error.message);
      if (error.response) {
        console.error('📥 [API] Server response:', error.response.status, error.response.data);
      }
      throw error;
    }
  }

  // Health check method to verify backend connectivity
  async checkHealth() {
    try {
      const response = await this.api.get('/health', {
        timeout: 15000, // 15 seconds for health check
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.userMessage || error.message,
        code: error.code
      };
    }
  }

  // API Methods

  // Videos
  async getVideos(page = 1) {
    return await this.get(`/videos?page=${page}`);
  }

  async getFollowingVideos(page = 1) {
    return await this.get(`/videos/following?page=${page}`);
  }

  async uploadVideo(formData, onUploadProgress = null) {
    return this.uploadFile('/videos/upload', formData, onUploadProgress);
  }

  async scanFood(formData) {
    // AI Food Scanner - Hackathon Feature
    return this.uploadFile('/ai/scan', formData, null);
  }

  async searchVideos(query, page = 1) {
    return this.get(`/videos/search?q=${encodeURIComponent(query)}&page=${page}`);
  }

  async searchContent(query) {
    // Search for both users and videos
    return this.get(`/search?q=${encodeURIComponent(query)}`);
  }

  async getTrendingSearches(days = 7, limit = 10) {
    // Get trending search queries
    return this.get(`/search/trending?days=${days}&limit=${limit}`);
  }

  async logSearch(query, type = 'general') {
    // Log search query (non-blocking, silent fail)
    try {
      return await this.post('/search/log', { query, type }, {
        timeout: 5000, // 5 seconds timeout
        _skipRetry: true, // Skip retry for logging and rate limit alerts
      });
    } catch (error) {
      // Silent fail - logging shouldn't block user experience
      return { data: { success: false } };
    }
  }

  async getRecentSearches(limit = 10) {
    // Get user's recent searches
    return this.get(`/search/recent?limit=${limit}`);
  }

  async clearSearchHistory() {
    // Clear user's search history
    return this.delete('/search/history');
  }

  async getProfile() {
    return this.get('/user');
  }

  async getMyVideos(page = 1) {
    return this.get(`/videos/my-videos?page=${page}`);
  }

  async getMyReposts(page = 1) {
    return this.get(`/videos/my-reposts?page=${page}`);
  }

  async recordView(videoId) {
    // View recording is not critical - use shorter timeout and no retry
    try {
      return await this.post(`/videos/${videoId}/view`, {}, {
        timeout: 15000, // 15 seconds for view recording
        _skipRetry: true, // Custom flag to skip retry logic and rate limit alerts
      });
    } catch (error) {
      // Silently fail - view tracking shouldn't block user experience
      return { data: { success: false } };
    }
  }

  async deleteVideo(videoId) {
    return this.delete(`/videos/${videoId}`);
  }

  // Stories
  async getStories() {
    return this.get('/stories');
  }

  async getMyStories() {
    return this.get('/stories/my-stories');
  }

  async uploadStory(formData, onUploadProgress = null) {
    return this.uploadFile('/stories/upload', formData, onUploadProgress);
  }

  async deleteStory(storyId) {
    return this.delete(`/stories/${storyId}`);
  }

  async recordStoryView(storyId) {
    // View recording is not critical - use shorter timeout and no retry
    try {
      return await this.post(`/stories/${storyId}/view`, {}, {
        timeout: 15000, // 15 seconds for view recording
        _skipRetry: true, // Custom flag to skip retry logic and rate limit alerts
      });
    } catch (error) {
      // Silently fail - view tracking shouldn't block user experience
      return { data: { success: false } };
    }
  }

  // Likes
  async toggleLike(videoId) {
    return this.post(`/videos/${videoId}/like`);
  }

  // Update video details
  async updateVideo(videoId, data) {
    return this.put(`/videos/${videoId}`, data);
  }

  // Comments
  async getComments(videoId, page = 1) {
    return this.get(`/videos/${videoId}/comments?page=${page}`);
  }

  async addComment(videoId, content) {
    return this.post(`/videos/${videoId}/comments`, { content });
  }

  async deleteComment(commentId) {
    return this.delete(`/comments/${commentId}`);
  }

  // Bookmarks
  async getBookmarks(page = 1) {
    return await this.get(`/bookmarks?page=${page}`);
  }

  async toggleBookmark(videoId) {
    return this.post(`/videos/${videoId}/bookmark`);
  }

  // Follows
  async toggleFollow(userId) {
    return this.post(`/users/${userId}/follow`);
  }

  async getFollowers(userId, page = 1) {
    return this.get(`/users/${userId}/followers?page=${page}`);
  }

  async getFollowing(userId, page = 1) {
    return this.get(`/users/${userId}/following?page=${page}`);
  }

  // User Profiles
  async getUserProfile(userId) {
    return this.get(`/users/${userId}/profile`);
  }

  async getUserVideos(userId, page = 1) {
    return this.get(`/users/${userId}/videos?page=${page}`);
  }

  async getRecommendedAccounts() {
    return this.get('/users/recommended');
  }

  async updateProfile(data) {
    return this.put('/user/profile', data);
  }

  async uploadAvatar(imageUri) {
    try {
      const formData = new FormData();

      // Get file extension and prepare proper MIME type
      const uriParts = imageUri.split('.');
      const fileType = uriParts[uriParts.length - 1].toLowerCase();

      // Map file extensions to proper MIME types
      const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };

      const mimeType = mimeTypes[fileType] || 'image/jpeg';

      // For React Native, the file object needs to be properly formatted
      formData.append('avatar', {
        uri: imageUri,
        name: `avatar_${Date.now()}.${fileType}`,
        type: mimeType,
      });

      const response = await this.uploadFile('/user/avatar', formData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getFriends(page = 1) {
    try {
      return await this.get(`/friends?page=${page}`);
    } catch (error) {
      throw error;
    }
  }

  async getAdminStats() {
    try {
      return await this.get('/admin/stats');
    } catch (error) {
      throw error;
    }
  }

  async changePassword(data) {
    return this.post('/user/change-password', data);
  }

  async deleteAccount(password) {
    return this.delete('/user/account', {
      data: { password }
    });
  }

  // Notifications
  async getNotifications(page = 1) {
    return this.get(`/notifications?page=${page}`);
  }

  async markNotificationAsRead(notificationId) {
    return this.post(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead() {
    return this.post('/notifications/read-all');
  }

  // Share & Social Actions
  async repostVideo(videoId) {
    return this.post(`/videos/${videoId}/repost`);
  }

  async undoRepost(videoId) {
    return this.delete(`/videos/${videoId}/repost`);
  }

  async notInterested(videoId) {
    return this.post(`/videos/${videoId}/not-interested`);
  }

  async reportVideo(videoId, reason) {
    return this.post(`/videos/${videoId}/report`, { reason });
  }

  async shareToFriend(videoId, friendId) {
    return this.post(`/videos/${videoId}/share`, { friend_id: friendId });
  }

  // Device Tokens for Push Notifications
  async registerDeviceToken(data) {
    return this.post('/device-tokens/register', data);
  }

  async removeDeviceToken(data) {
    return this.post('/device-tokens/remove', data);
  }

  async getDeviceTokens() {
    return this.get('/device-tokens');
  }

  async deactivateDeviceToken(data) {
    return this.post('/device-tokens/deactivate', data);
  }

  // Settings API
  async getSettings() {
    return this.get('/settings');
  }

  async updatePrivacy(accountPrivate) {
    return this.post('/settings/privacy', { account_private: accountPrivate });
  }

  async updateNotificationSettings(settings) {
    return this.post('/settings/notifications', settings);
  }

  async updateLanguage(language) {
    return this.post('/settings/language', { language });
  }

  async blockUser(userId) {
    return this.post(`/users/${userId}/block`);
  }

  async unblockUser(userId) {
    return this.delete(`/users/${userId}/unblock`);
  }

  async getBlockedUsers() {
    return this.get('/users/blocked');
  }

  async clearCache() {
    return this.post('/settings/cache/clear');
  }

  async getStorageInfo() {
    return this.get('/settings/storage');
  }

  async getAppInfo() {
    return this.get('/settings/about');
  }

  // User Tagging
  async tagUsersInVideo(videoId, userIds) {
    return this.post(`/videos/${videoId}/tag`, { user_ids: userIds });
  }

  async tagUserInComment(commentId, userId) {
    return this.post(`/comments/${commentId}/tag`, { user_id: userId });
  }

  async getPendingTags() {
    return this.get('/tags/pending');
  }

  async approveTag(tagId) {
    return this.post(`/tags/${tagId}/approve`);
  }

  async rejectTag(tagId) {
    return this.post(`/tags/${tagId}/reject`);
  }

  async removeTag(tagId) {
    return this.delete(`/tags/${tagId}`);
  }

  async getTaggedVideos(userId) {
    return this.get(`/users/${userId}/tagged-videos`);
  }

  async searchUsersForTagging(query) {
    return this.get(`/users/search-for-tagging?query=${encodeURIComponent(query)}`);
  }

  // ==================== Playlist Methods ====================

  async getPlaylists() {
    return this.get('/playlists');
  }

  async createPlaylist(data) {
    return this.post('/playlists', data);
  }

  async getPlaylistDetails(playlistId) {
    return this.get(`/playlists/${playlistId}`);
  }

  async updatePlaylist(playlistId, data) {
    return this.put(`/playlists/${playlistId}`, data);
  }

  async deletePlaylist(playlistId) {
    return this.delete(`/playlists/${playlistId}`);
  }

  async addVideoToPlaylist(playlistId, videoId) {
    return this.post(`/playlists/${playlistId}/videos`, { video_id: videoId });
  }

  async removeVideoFromPlaylist(playlistId, videoId) {
    return this.delete(`/playlists/${playlistId}/videos/${videoId}`);
  }

  async getUserPlaylists(userId) {
    return this.get(`/users/${userId}/playlists`);
  }

  // ==================== Badge Application Methods ====================

  async applyForBadge(data) {
    return this.post('/badge/apply', data);
  }

  async getBadgeStatus() {
    return this.get('/badge/status');
  }

  async reapplyForBadge(data) {
    return this.post('/badge/reapply', data);
  }

  async toggleBadgeVisibility(showBadge) {
    return this.patch('/profile/badge-visibility', { show_badge: showBadge });
  }

  // ==================== Story Reporting ====================

  async reportStory(storyId, data) {
    return this.post(`/stories/${storyId}/report`, data);
  }

  // ==================== Story Additional Methods ====================

  async getArchivedStories() {
    return this.get('/stories/archived');
  }

  async archiveStory(storyId) {
    return this.post(`/stories/${storyId}/archive`);
  }

  async unarchiveStory(storyId) {
    return this.post(`/stories/${storyId}/unarchive`);
  }

  async getStoryViewers(storyId) {
    return this.get(`/stories/${storyId}/viewers`);
  }

  async replyToStory(storyId, message) {
    return this.post(`/stories/${storyId}/reply`, { message });
  }

  async reactToStory(storyId, emoji) {
    return this.post(`/stories/${storyId}/react`, { emoji });
  }

  async shareStory(storyId) {
    return this.post(`/stories/${storyId}/share`);
  }

  // ==================== Highlights Methods ====================

  async getHighlights() {
    return this.get('/highlights');
  }

  async getHighlightDetails(highlightId) {
    return this.get(`/highlights/${highlightId}`);
  }

  async createHighlight(data) {
    return this.post('/highlights', data);
  }

  async updateHighlight(highlightId, data) {
    return this.put(`/highlights/${highlightId}`, data);
  }

  async deleteHighlight(highlightId) {
    return this.delete(`/highlights/${highlightId}`);
  }

  async addStoryToHighlight(highlightId, storyId) {
    return this.post(`/highlights/${highlightId}/stories`, { story_id: storyId });
  }

  async removeStoryFromHighlight(highlightId, storyId) {
    return this.delete(`/highlights/${highlightId}/stories/${storyId}`);
  }

  async reorderHighlights(highlightIds) {
    return this.post('/highlights/reorder', { highlight_ids: highlightIds });
  }

  // ==================== Email Verification & Password Reset ====================

  async resendVerificationEmail() {
    return this.post('/email/verification-notification');
  }

  async forgotPassword(email) {
    return this.post('/forgot-password', { email });
  }

  async resetPassword(data) {
    return this.post('/reset-password', data);
  }
}

// Export a singleton instance
export const apiService = new ApiService();
