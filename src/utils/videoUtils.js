/**
 * Video Utility Functions
 * Handles video optimization and performance
 */

class VideoUtils {
  constructor() {
    this.activeVideos = new Map(); // Track active video players
    this.videoCache = new Map(); // Simple cache for video metadata
  }

  /**
   * Register active video player
   */
  registerVideo(videoId, player) {
    this.activeVideos.set(videoId, player);
  }

  /**
   * Unregister video player
   */
  unregisterVideo(videoId) {
    this.activeVideos.delete(videoId);
  }

  /**
   * Pause all videos except the specified one
   */
  pauseAllExcept(activeVideoId) {
    this.activeVideos.forEach((player, videoId) => {
      if (videoId !== activeVideoId && player) {
        try {
          if (player.playing) {
            player.pause();
          }
        } catch (error) {
          console.error('Error pausing video:', videoId, error);
        }
      }
    });
  }

  /**
   * Pause all videos
   */
  pauseAll() {
    this.activeVideos.forEach((player, videoId) => {
      try {
        if (player && player.playing) {
          player.pause();
        }
      } catch (error) {
        console.error('Error pausing video:', videoId, error);
      }
    });
  }

  /**
   * Get video quality based on network type
   */
  getOptimalQuality(connectionType) {
    const qualityMap = {
      'wifi': '1080p',
      '4g': '720p',
      '3g': '480p',
      '2g': '360p',
      'unknown': '480p',
      'none': '360p',
    };

    return qualityMap[connectionType] || '480p';
  }

  /**
   * Cache video metadata
   */
  cacheVideoMetadata(videoId, metadata) {
    this.videoCache.set(videoId, {
      ...metadata,
      cachedAt: Date.now()
    });
  }

  /**
   * Get cached video metadata
   */
  getCachedMetadata(videoId) {
    const cached = this.videoCache.get(videoId);

    if (!cached) return null;

    // Check if cache is still valid (5 minutes)
    const isValid = (Date.now() - cached.cachedAt) < 5 * 60 * 1000;

    return isValid ? cached : null;
  }

  /**
   * Clear old cache entries
   */
  clearOldCache() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    this.videoCache.forEach((metadata, videoId) => {
      if (now - metadata.cachedAt > maxAge) {
        this.videoCache.delete(videoId);
      }
    });
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    this.pauseAll();
    this.activeVideos.clear();
    this.videoCache.clear();
  }

  /**
   * Get video URL with quality parameter
   * (If backend supports quality variants)
   */
  getVideoUrl(baseUrl, quality = null) {
    if (!quality) return baseUrl;

    // If your backend supports quality variants, modify URL here
    // Example: return `${baseUrl}?quality=${quality}`;
    return baseUrl;
  }

  /**
   * Prefetch next videos (optional, for advanced optimization)
   */
  async prefetchVideos(videoUrls, count = 2) {
    // This can be implemented if you want to prefetch upcoming videos
    // For now, it's a placeholder
    console.log(`Prefetching ${count} videos...`);
  }
}

// Export singleton instance
export const videoUtils = new VideoUtils();
