/**
 * API Configuration
 * Centralized API settings for easy management
 */

// SECURITY: IP addresses should be configured via environment variables in production
// For development, create a file: mobile/.env.local with your local IP
// Example .env.local content:
// LOCAL_API_URL=http://192.168.1.5:8000/api
//
// To get your current IP address:
// Windows: ipconfig (look for IPv4 Address)
// Mac/Linux: ifconfig or ip addr show

// Get environment variables (will be undefined if not set)
const ENV_LOCAL_API_URL = process.env.LOCAL_API_URL;
const ENV_PRODUCTION_API_URL = process.env.PRODUCTION_API_URL;

const API_CONFIGS = {
  // LOCAL DEVELOPMENT - Multiple options for different scenarios
  // Your Computer IP: 192.168.1.7 (from Metro - Updated 7 Dec 2025)
  // IMPORTANT: Update this IP when your network changes, or use .env.local file

  // Try localhost first (fastest for emulators/simulators)
  LOCALHOST: 'http://localhost:8000/api',

  // Local IP for physical devices on same network
  LOCAL_PHYSICAL_DEVICE: ENV_LOCAL_API_URL || 'http://192.168.1.7:8000/api',

  // Android Emulator specific
  LOCAL_ANDROID_EMULATOR: 'http://10.0.2.2:8000/api',

  // iOS Simulator specific
  LOCAL_IOS_SIMULATOR: 'http://localhost:8000/api',

  // PRODUCTION - cofremobileapp.my.id
  PRODUCTION: ENV_PRODUCTION_API_URL || 'https://cofremobileapp.my.id/api',
};

// Auto-detect environment based on __DEV__ flag and platform
// In production builds, this will automatically use PRODUCTION config
// For development, use LOCAL_PHYSICAL_DEVICE to access backend from any device on the network
const ACTIVE_CONFIG = 'PRODUCTION'; // Always use production backend (cofremobileapp.my.id)

export const API_CONFIG = {
  BASE_URL: API_CONFIGS[ACTIVE_CONFIG],

  // Timeout settings (waktu yang cukup untuk backend memproses request)
  TIMEOUT: {
    DEFAULT: 60000,      // 60 seconds untuk request biasa (ditingkatkan dari 30s)
    UPLOAD: 180000,      // 180 seconds (3 menit) untuk upload file (ditingkatkan dari 120s)
    RETRY: 90000,        // 90 seconds untuk retry attempt (ditingkatkan dari 45s)
  },

  // Retry settings
  RETRY: {
    MAX_ATTEMPTS: 3,     // 3 retry attempts (total 4 percobaan)
    DELAY: 2000,         // 2 seconds delay antara retry (ditingkatkan dari 1s)
    EXPONENTIAL_BACKOFF: true, // Gunakan exponential backoff untuk retry
  },

  // Feature flags
  FEATURES: {
    OFFLINE_MODE: true, // Enable offline mode for demo
    AUTO_RETRY: true,    // Enable automatic retry
    NETWORK_CHECK: true, // Check network sebelum request
  },
};

// Helper function untuk get full URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper untuk check if using local server
export const isLocalServer = () => {
  return API_CONFIG.BASE_URL.includes('localhost') ||
         API_CONFIG.BASE_URL.includes('10.0.2.2') ||
         API_CONFIG.BASE_URL.includes('192.168');
};

// Export current environment
export const getCurrentEnvironment = () => ACTIVE_CONFIG;

// Only log in development mode
if (__DEV__) {
  console.log('🌐 API Config:', ACTIVE_CONFIG, '-', API_CONFIG.BASE_URL);
}
