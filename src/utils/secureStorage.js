import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Secure Storage Utility
 * Uses expo-secure-store for encrypted storage on device
 *
 * Security Features:
 * - iOS: Uses Keychain
 * - Android: Uses EncryptedSharedPreferences (API 23+) or Keystore
 * - Web: Falls back to localStorage (not secure, only for development)
 */

class SecureStorage {
  /**
   * Store a key-value pair securely
   * @param {string} key - Storage key
   * @param {string} value - Value to store (must be string)
   */
  async setItem(key, value) {
    try {
      if (Platform.OS === 'web') {
        // Fallback for web (development only)
        console.warn('SecureStore not available on web, using localStorage');
        localStorage.setItem(key, value);
        return;
      }

      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      throw new Error(`Failed to store ${key} securely`);
    }
  }

  /**
   * Retrieve a value by key
   * @param {string} key - Storage key
   * @returns {Promise<string|null>} Stored value or null
   */
  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        // Fallback for web (development only)
        return localStorage.getItem(key);
      }

      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove a key-value pair
   * @param {string} key - Storage key
   */
  async removeItem(key) {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }

      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
    }
  }

  /**
   * Store multiple items at once
   * @param {Object} items - Key-value pairs to store
   */
  async multiSet(items) {
    const promises = Object.entries(items).map(([key, value]) =>
      this.setItem(key, value)
    );
    await Promise.all(promises);
  }

  /**
   * Remove multiple items at once
   * @param {string[]} keys - Array of keys to remove
   */
  async multiRemove(keys) {
    const promises = keys.map(key => this.removeItem(key));
    await Promise.all(promises);
  }

  /**
   * Clear all secure storage (use with caution!)
   */
  async clear() {
    try {
      // SecureStore doesn't have a clear all method
      // You need to track and remove keys individually
      console.warn('SecureStorage.clear() should be called with specific keys');
    } catch (error) {
      console.error('Error clearing secure storage:', error);
    }
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

// Export keys constants to avoid typos
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
};
