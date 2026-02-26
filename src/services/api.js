import { apiService } from './ApiService';

/**
 * API Wrapper
 * Direct passthrough to apiService (offline features removed)
 */
class ApiWrapper {
  // Proxy all methods to apiService
  async getVideos(page) {
    return apiService.getVideos(page);
  }

  async getFollowingVideos(page) {
    return apiService.getFollowingVideos(page);
  }

  async uploadVideo(formData, onUploadProgress) {
    return apiService.uploadVideo(formData, onUploadProgress);
  }

  async scanFood(formData) {
    return apiService.scanFood(formData);
  }

  async searchVideos(query, page) {
    return apiService.searchVideos(query, page);
  }

  async searchContent(query) {
    return apiService.searchContent(query);
  }

  async getProfile() {
    return apiService.getProfile();
  }

  async getMyVideos(page) {
    return apiService.getMyVideos(page);
  }

  async getMyReposts(page) {
    return apiService.getMyReposts(page);
  }

  async recordView(videoId) {
    return apiService.recordView(videoId);
  }

  async deleteVideo(videoId) {
    return apiService.deleteVideo(videoId);
  }

  async getStories() {
    return apiService.getStories();
  }

  async getMyStories() {
    return apiService.getMyStories();
  }

  async uploadStory(formData, onUploadProgress) {
    return apiService.uploadStory(formData, onUploadProgress);
  }

  async deleteStory(storyId) {
    return apiService.deleteStory(storyId);
  }

  async recordStoryView(storyId) {
    return apiService.recordStoryView(storyId);
  }

  async toggleLike(videoId) {
    return apiService.toggleLike(videoId);
  }

  async getComments(videoId, page) {
    return apiService.getComments(videoId, page);
  }

  async addComment(videoId, content) {
    return apiService.addComment(videoId, content);
  }

  async deleteComment(commentId) {
    return apiService.deleteComment(commentId);
  }

  async getBookmarks(page) {
    return apiService.getBookmarks(page);
  }

  async toggleBookmark(videoId) {
    return apiService.toggleBookmark(videoId);
  }

  async toggleFollow(userId) {
    return apiService.toggleFollow(userId);
  }

  async getUserProfile(userId) {
    return apiService.getUserProfile(userId);
  }

  async getUserVideos(userId, page) {
    return apiService.getUserVideos(userId, page);
  }

  async getRecommendedAccounts() {
    return apiService.getRecommendedAccounts();
  }

  async updateProfile(data) {
    return apiService.updateProfile(data);
  }

  async uploadAvatar(imageUri) {
    return apiService.uploadAvatar(imageUri);
  }

  async getFriends(page) {
    return apiService.getFriends(page);
  }

  async getAdminStats() {
    return apiService.getAdminStats();
  }

  async changePassword(data) {
    return apiService.changePassword(data);
  }

  async deleteAccount(password) {
    return apiService.deleteAccount(password);
  }

  async getNotifications(page) {
    return apiService.getNotifications(page);
  }

  async markNotificationAsRead(notificationId) {
    return apiService.markNotificationAsRead(notificationId);
  }

  async markAllNotificationsAsRead() {
    return apiService.markAllNotificationsAsRead();
  }

  async repostVideo(videoId) {
    return apiService.repostVideo(videoId);
  }

  async notInterested(videoId) {
    return apiService.notInterested(videoId);
  }

  async reportVideo(videoId, reason) {
    return apiService.reportVideo(videoId, reason);
  }

  async shareToFriend(videoId, friendId) {
    return apiService.shareToFriend(videoId, friendId);
  }

  async registerDeviceToken(data) {
    return apiService.registerDeviceToken(data);
  }

  async removeDeviceToken(data) {
    return apiService.removeDeviceToken(data);
  }

  async getDeviceTokens() {
    return apiService.getDeviceTokens();
  }

  async deactivateDeviceToken(data) {
    return apiService.deactivateDeviceToken(data);
  }

  async getSettings() {
    return apiService.getSettings();
  }

  async updatePrivacy(accountPrivate) {
    return apiService.updatePrivacy(accountPrivate);
  }

  async updateNotificationSettings(settings) {
    return apiService.updateNotificationSettings(settings);
  }

  async updateLanguage(language) {
    return apiService.updateLanguage(language);
  }

  async blockUser(userId) {
    return apiService.blockUser(userId);
  }

  async unblockUser(userId) {
    return apiService.unblockUser(userId);
  }

  async getBlockedUsers() {
    return apiService.getBlockedUsers();
  }

  async clearCache() {
    return apiService.clearCache();
  }

  async getStorageInfo() {
    return apiService.getStorageInfo();
  }

  async getAppInfo() {
    return apiService.getAppInfo();
  }

  async tagUsersInVideo(videoId, userIds) {
    return apiService.tagUsersInVideo(videoId, userIds);
  }

  async tagUserInComment(commentId, userId) {
    return apiService.tagUserInComment(commentId, userId);
  }

  async getPendingTags() {
    return apiService.getPendingTags();
  }

  async approveTag(tagId) {
    return apiService.approveTag(tagId);
  }

  async rejectTag(tagId) {
    return apiService.rejectTag(tagId);
  }

  async removeTag(tagId) {
    return apiService.removeTag(tagId);
  }

  async getTaggedVideos(userId) {
    return apiService.getTaggedVideos(userId);
  }

  async searchUsersForTagging(query) {
    return apiService.searchUsersForTagging(query);
  }

  async getPlaylists() {
    return apiService.getPlaylists();
  }

  async createPlaylist(data) {
    return apiService.createPlaylist(data);
  }

  async getPlaylistDetails(playlistId) {
    return apiService.getPlaylistDetails(playlistId);
  }

  async updatePlaylist(playlistId, data) {
    return apiService.updatePlaylist(playlistId, data);
  }

  async deletePlaylist(playlistId) {
    return apiService.deletePlaylist(playlistId);
  }

  async addVideoToPlaylist(playlistId, videoId) {
    return apiService.addVideoToPlaylist(playlistId, videoId);
  }

  async removeVideoFromPlaylist(playlistId, videoId) {
    return apiService.removeVideoFromPlaylist(playlistId, videoId);
  }

  async getUserPlaylists(userId) {
    return apiService.getUserPlaylists(userId);
  }

  async checkHealth() {
    return apiService.checkHealth();
  }

  async logout() {
    return apiService.logout();
  }

  // Story Additional Methods
  async getArchivedStories() {
    return apiService.getArchivedStories();
  }

  async archiveStory(storyId) {
    return apiService.archiveStory(storyId);
  }

  async unarchiveStory(storyId) {
    return apiService.unarchiveStory(storyId);
  }

  async getStoryViewers(storyId) {
    return apiService.getStoryViewers(storyId);
  }

  async replyToStory(storyId, message) {
    return apiService.replyToStory(storyId, message);
  }

  async reactToStory(storyId, emoji) {
    return apiService.reactToStory(storyId, emoji);
  }

  async shareStory(storyId) {
    return apiService.shareStory(storyId);
  }

  // Highlights Methods
  async getHighlights() {
    return apiService.getHighlights();
  }

  async getHighlightDetails(highlightId) {
    return apiService.getHighlightDetails(highlightId);
  }

  async createHighlight(data) {
    return apiService.createHighlight(data);
  }

  async updateHighlight(highlightId, data) {
    return apiService.updateHighlight(highlightId, data);
  }

  async deleteHighlight(highlightId) {
    return apiService.deleteHighlight(highlightId);
  }

  async addStoryToHighlight(highlightId, storyId) {
    return apiService.addStoryToHighlight(highlightId, storyId);
  }

  async removeStoryFromHighlight(highlightId, storyId) {
    return apiService.removeStoryFromHighlight(highlightId, storyId);
  }

  async reorderHighlights(highlightIds) {
    return apiService.reorderHighlights(highlightIds);
  }

  // Email Verification & Password Reset
  async resendVerificationEmail() {
    return apiService.resendVerificationEmail();
  }

  async forgotPassword(email) {
    return apiService.forgotPassword(email);
  }

  async resetPassword(data) {
    return apiService.resetPassword(data);
  }

  // Utility methods
  setAuthToken(token) {
    apiService.setAuthToken(token);
  }

  clearAuthData() {
    return apiService.clearAuthData();
  }
}

// Export singleton instance
export const api = new ApiWrapper();
