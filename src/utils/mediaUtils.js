import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';

/**
 * Media Utility Functions
 * Handles media compression, validation, and optimization
 */

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1920;
const IMAGE_QUALITY = 0.8; // 80% quality

class MediaUtils {
  /**
   * Get file size from URI
   */
  async getFileSize(uri) {
    try {
      const file = new File(uri);
      const size = await file.size;
      return size || 0;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }

  /**
   * Format file size to human readable
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Validate image file
   */
  async validateImage(uri) {
    const size = await this.getFileSize(uri);

    if (size === 0) {
      return {
        valid: false,
        error: 'Tidak dapat membaca file gambar'
      };
    }

    if (size > MAX_IMAGE_SIZE) {
      return {
        valid: false,
        error: `Ukuran gambar terlalu besar. Maksimal ${this.formatFileSize(MAX_IMAGE_SIZE)}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate video file
   */
  async validateVideo(uri) {
    const size = await this.getFileSize(uri);

    if (size === 0) {
      return {
        valid: false,
        error: 'Tidak dapat membaca file video'
      };
    }

    if (size > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        error: `Ukuran video terlalu besar. Maksimal ${this.formatFileSize(MAX_VIDEO_SIZE)}`
      };
    }

    return { valid: true };
  }

  /**
   * Compress image
   */
  async compressImage(uri, options = {}) {
    try {
      const {
        maxWidth = MAX_IMAGE_WIDTH,
        maxHeight = MAX_IMAGE_HEIGHT,
        quality = IMAGE_QUALITY
      } = options;

      console.log('Compressing image:', uri);

      // Get image info first
      const originalSize = await this.getFileSize(uri);
      console.log('Original image size:', this.formatFileSize(originalSize));

      // Resize image if needed
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: maxWidth,
              height: maxHeight,
            },
          },
        ],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      const compressedSize = await this.getFileSize(manipResult.uri);
      console.log('Compressed image size:', this.formatFileSize(compressedSize));
      console.log('Compression ratio:', Math.round((compressedSize / originalSize) * 100) + '%');

      return {
        uri: manipResult.uri,
        width: manipResult.width,
        height: manipResult.height,
        originalSize,
        compressedSize,
        compressionRatio: (compressedSize / originalSize) * 100
      };
    } catch (error) {
      console.error('Error compressing image:', error);
      throw new Error('Gagal mengkompresi gambar');
    }
  }

  /**
   * Generate thumbnail from image
   */
  async generateImageThumbnail(uri) {
    try {
      const thumbnail = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: 400,
              height: 400,
            },
          },
        ],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return thumbnail.uri;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return uri; // Return original if failed
    }
  }

  /**
   * Validate media based on type
   */
  async validateMedia(uri, type) {
    if (type === 'image') {
      return await this.validateImage(uri);
    } else if (type === 'video') {
      return await this.validateVideo(uri);
    }
    return { valid: false, error: 'Tipe media tidak valid' };
  }

  /**
   * Get media dimensions (for images)
   */
  async getImageDimensions(uri) {
    try {
      const info = await ImageManipulator.manipulateAsync(uri, [], {});
      return {
        width: info.width,
        height: info.height
      };
    } catch (error) {
      console.error('Error getting image dimensions:', error);
      return null;
    }
  }

  /**
   * Check if image needs compression
   */
  async shouldCompressImage(uri) {
    const size = await this.getFileSize(uri);
    const dimensions = await this.getImageDimensions(uri);

    // Compress if file is larger than 2MB or dimensions exceed max
    if (size > 2 * 1024 * 1024) return true;
    if (dimensions && (dimensions.width > MAX_IMAGE_WIDTH || dimensions.height > MAX_IMAGE_HEIGHT)) {
      return true;
    }

    return false;
  }

  /**
   * Prepare media for upload (compress if needed)
   */
  async prepareMediaForUpload(uri, type) {
    const validation = await this.validateMedia(uri, type);

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (type === 'image') {
      const shouldCompress = await this.shouldCompressImage(uri);

      if (shouldCompress) {
        console.log('Image needs compression, compressing...');
        const compressed = await this.compressImage(uri);
        return {
          uri: compressed.uri,
          compressed: true,
          originalSize: compressed.originalSize,
          finalSize: compressed.compressedSize
        };
      }
    }

    const size = await this.getFileSize(uri);
    return {
      uri,
      compressed: false,
      originalSize: size,
      finalSize: size
    };
  }
}

// Export singleton instance
export const mediaUtils = new MediaUtils();
