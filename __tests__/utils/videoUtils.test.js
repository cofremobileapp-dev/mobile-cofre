import { videoUtils } from '../../src/utils/videoUtils';

describe('VideoUtils', () => {
  beforeEach(() => {
    // Clear video utils state before each test
    videoUtils.cleanup();
  });

  afterEach(() => {
    videoUtils.cleanup();
  });

  describe('registerVideo', () => {
    test('registers a video player', () => {
      const mockPlayer = { playing: false, pause: jest.fn() };
      videoUtils.registerVideo('video1', mockPlayer);

      expect(videoUtils.activeVideos.has('video1')).toBe(true);
    });

    test('registers multiple videos', () => {
      const player1 = { playing: false, pause: jest.fn() };
      const player2 = { playing: false, pause: jest.fn() };

      videoUtils.registerVideo('video1', player1);
      videoUtils.registerVideo('video2', player2);

      expect(videoUtils.activeVideos.size).toBe(2);
    });
  });

  describe('unregisterVideo', () => {
    test('unregisters a video player', () => {
      const mockPlayer = { playing: false, pause: jest.fn() };
      videoUtils.registerVideo('video1', mockPlayer);

      videoUtils.unregisterVideo('video1');

      expect(videoUtils.activeVideos.has('video1')).toBe(false);
    });

    test('handles unregistering non-existent video', () => {
      expect(() => videoUtils.unregisterVideo('nonexistent')).not.toThrow();
    });
  });

  describe('pauseAllExcept', () => {
    test('pauses all videos except the active one', () => {
      const player1 = { playing: true, pause: jest.fn() };
      const player2 = { playing: true, pause: jest.fn() };
      const player3 = { playing: true, pause: jest.fn() };

      videoUtils.registerVideo('video1', player1);
      videoUtils.registerVideo('video2', player2);
      videoUtils.registerVideo('video3', player3);

      videoUtils.pauseAllExcept('video2');

      expect(player1.pause).toHaveBeenCalled();
      expect(player2.pause).not.toHaveBeenCalled();
      expect(player3.pause).toHaveBeenCalled();
    });

    test('handles errors when pausing', () => {
      const errorPlayer = {
        playing: true,
        pause: jest.fn(() => {
          throw new Error('Pause error');
        }),
      };
      const goodPlayer = { playing: true, pause: jest.fn() };

      videoUtils.registerVideo('error', errorPlayer);
      videoUtils.registerVideo('good', goodPlayer);

      // Should not throw error
      expect(() => videoUtils.pauseAllExcept('active')).not.toThrow();

      // Good player should still be paused
      expect(goodPlayer.pause).toHaveBeenCalled();
    });

    test('does not pause already paused videos', () => {
      const player1 = { playing: false, pause: jest.fn() };
      const player2 = { playing: true, pause: jest.fn() };

      videoUtils.registerVideo('video1', player1);
      videoUtils.registerVideo('video2', player2);

      videoUtils.pauseAllExcept('video3');

      expect(player1.pause).not.toHaveBeenCalled();
      expect(player2.pause).toHaveBeenCalled();
    });
  });

  describe('pauseAll', () => {
    test('pauses all playing videos', () => {
      const player1 = { playing: true, pause: jest.fn() };
      const player2 = { playing: true, pause: jest.fn() };
      const player3 = { playing: false, pause: jest.fn() };

      videoUtils.registerVideo('video1', player1);
      videoUtils.registerVideo('video2', player2);
      videoUtils.registerVideo('video3', player3);

      videoUtils.pauseAll();

      expect(player1.pause).toHaveBeenCalled();
      expect(player2.pause).toHaveBeenCalled();
      expect(player3.pause).not.toHaveBeenCalled();
    });

    test('handles errors when pausing all', () => {
      const errorPlayer = {
        playing: true,
        pause: jest.fn(() => {
          throw new Error('Pause error');
        }),
      };

      videoUtils.registerVideo('error', errorPlayer);

      expect(() => videoUtils.pauseAll()).not.toThrow();
    });
  });

  describe('getOptimalQuality', () => {
    test('returns 1080p for wifi', () => {
      expect(videoUtils.getOptimalQuality('wifi')).toBe('1080p');
    });

    test('returns 720p for 4g', () => {
      expect(videoUtils.getOptimalQuality('4g')).toBe('720p');
    });

    test('returns 480p for 3g', () => {
      expect(videoUtils.getOptimalQuality('3g')).toBe('480p');
    });

    test('returns 360p for 2g', () => {
      expect(videoUtils.getOptimalQuality('2g')).toBe('360p');
    });

    test('returns 480p for unknown connection', () => {
      expect(videoUtils.getOptimalQuality('unknown')).toBe('480p');
    });

    test('returns 360p for no connection', () => {
      expect(videoUtils.getOptimalQuality('none')).toBe('360p');
    });

    test('returns default for invalid connection type', () => {
      expect(videoUtils.getOptimalQuality('invalid')).toBe('480p');
    });
  });

  describe('cacheVideoMetadata', () => {
    test('caches video metadata', () => {
      const metadata = { title: 'Test Video', duration: 120 };
      videoUtils.cacheVideoMetadata('video1', metadata);

      const cached = videoUtils.getCachedMetadata('video1');
      expect(cached).toMatchObject(metadata);
      expect(cached.cachedAt).toBeDefined();
    });

    test('overwrites existing cache', () => {
      const metadata1 = { title: 'Video 1' };
      const metadata2 = { title: 'Video 2' };

      videoUtils.cacheVideoMetadata('video1', metadata1);
      videoUtils.cacheVideoMetadata('video1', metadata2);

      const cached = videoUtils.getCachedMetadata('video1');
      expect(cached.title).toBe('Video 2');
    });
  });

  describe('getCachedMetadata', () => {
    test('returns cached metadata if valid', () => {
      const metadata = { title: 'Test Video' };
      videoUtils.cacheVideoMetadata('video1', metadata);

      const cached = videoUtils.getCachedMetadata('video1');
      expect(cached).toMatchObject(metadata);
    });

    test('returns null for non-existent cache', () => {
      const cached = videoUtils.getCachedMetadata('nonexistent');
      expect(cached).toBeNull();
    });

    test('returns null for expired cache', () => {
      const metadata = { title: 'Test Video' };
      videoUtils.cacheVideoMetadata('video1', metadata);

      // Manually set cache time to 6 minutes ago
      const cached = videoUtils.videoCache.get('video1');
      cached.cachedAt = Date.now() - 6 * 60 * 1000;
      videoUtils.videoCache.set('video1', cached);

      const result = videoUtils.getCachedMetadata('video1');
      expect(result).toBeNull();
    });
  });

  describe('clearOldCache', () => {
    test('clears cache older than 10 minutes', () => {
      const metadata = { title: 'Old Video' };
      videoUtils.cacheVideoMetadata('video1', metadata);

      // Manually set cache time to 11 minutes ago
      const cached = videoUtils.videoCache.get('video1');
      cached.cachedAt = Date.now() - 11 * 60 * 1000;
      videoUtils.videoCache.set('video1', cached);

      videoUtils.clearOldCache();

      expect(videoUtils.videoCache.has('video1')).toBe(false);
    });

    test('keeps recent cache', () => {
      const metadata = { title: 'Recent Video' };
      videoUtils.cacheVideoMetadata('video1', metadata);

      videoUtils.clearOldCache();

      expect(videoUtils.videoCache.has('video1')).toBe(true);
    });
  });

  describe('cleanup', () => {
    test('pauses all videos', () => {
      const player = { playing: true, pause: jest.fn() };
      videoUtils.registerVideo('video1', player);

      videoUtils.cleanup();

      expect(player.pause).toHaveBeenCalled();
    });

    test('clears all active videos', () => {
      const player1 = { playing: false, pause: jest.fn() };
      const player2 = { playing: false, pause: jest.fn() };

      videoUtils.registerVideo('video1', player1);
      videoUtils.registerVideo('video2', player2);

      videoUtils.cleanup();

      expect(videoUtils.activeVideos.size).toBe(0);
    });

    test('clears all cached metadata', () => {
      videoUtils.cacheVideoMetadata('video1', { title: 'Test' });
      videoUtils.cacheVideoMetadata('video2', { title: 'Test' });

      videoUtils.cleanup();

      expect(videoUtils.videoCache.size).toBe(0);
    });
  });

  describe('getVideoUrl', () => {
    test('returns base URL when no quality specified', () => {
      const baseUrl = 'https://example.com/video.mp4';
      expect(videoUtils.getVideoUrl(baseUrl)).toBe(baseUrl);
    });

    test('returns base URL with quality (placeholder)', () => {
      const baseUrl = 'https://example.com/video.mp4';
      const result = videoUtils.getVideoUrl(baseUrl, '720p');
      // Current implementation returns base URL
      expect(result).toBe(baseUrl);
    });

    test('returns base URL when quality is null', () => {
      const baseUrl = 'https://example.com/video.mp4';
      expect(videoUtils.getVideoUrl(baseUrl, null)).toBe(baseUrl);
    });
  });

  describe('prefetchVideos', () => {
    test('logs prefetch message', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const urls = ['url1', 'url2', 'url3'];

      await videoUtils.prefetchVideos(urls, 2);

      expect(consoleSpy).toHaveBeenCalledWith('Prefetching 2 videos...');
      consoleSpy.mockRestore();
    });
  });
});
