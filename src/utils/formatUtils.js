/**
 * Format Utilities
 * Centralized formatting functions for consistent display across the app
 */

/**
 * Format price in Indonesian Rupiah format
 * @param {number} price - The price to format
 * @param {boolean} showCurrency - Whether to show "Rp" prefix (default: true)
 * @returns {string} Formatted price (e.g., "Rp 50.000" or "50.000")
 *
 * Examples:
 * formatPrice(50000) => "Rp 50.000"
 * formatPrice(1500000) => "Rp 1.500.000"
 * formatPrice(50000, false) => "50.000"
 */
export const formatPrice = (price, showCurrency = true) => {
  // Handle invalid inputs
  if (price === null || price === undefined || isNaN(price)) {
    return showCurrency ? 'Rp 0' : '0';
  }

  // Convert to number if string
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  // Format using Indonesian locale
  const formatted = numPrice.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return showCurrency ? `Rp ${formatted}` : formatted;
};

/**
 * Format price range in Indonesian Rupiah format
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price
 * @returns {string} Formatted price range (e.g., "Rp 50.000 - Rp 100.000")
 */
export const formatPriceRange = (minPrice, maxPrice) => {
  if (!minPrice && !maxPrice) {
    return 'Harga tidak tersedia';
  }

  if (minPrice === maxPrice || !maxPrice) {
    return formatPrice(minPrice);
  }

  return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
};

/**
 * Format number with thousand separators (Indonesian format)
 * @param {number} num - The number to format
 * @returns {string} Formatted number (e.g., "1.000", "50.000")
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }

  const numValue = typeof num === 'string' ? parseFloat(num) : num;

  return numValue.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

/**
 * Format decimal number (for ratings, etc.)
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted number (e.g., "4,5")
 */
export const formatDecimal = (num, decimals = 1) => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }

  const numValue = typeof num === 'string' ? parseFloat(num) : num;

  return numValue.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Parse formatted price string back to number
 * @param {string} priceString - Formatted price string (e.g., "Rp 50.000")
 * @returns {number} Price as number
 */
export const parsePrice = (priceString) => {
  if (!priceString) return 0;

  // Remove "Rp", spaces, and dots, then convert to number
  const cleanedString = priceString
    .replace(/Rp/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '');

  return parseFloat(cleanedString) || 0;
};

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size (e.g., "1,5 MB")
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)).toLocaleString('id-ID') + ' ' + sizes[i];
};

export default {
  formatPrice,
  formatPriceRange,
  formatNumber,
  formatDecimal,
  parsePrice,
  formatFileSize,
};
