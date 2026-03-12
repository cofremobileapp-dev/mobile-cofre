/**
 * Input Validation Utilities
 * Common validation functions for form inputs
 */

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {number} minLength - Minimum password length (default: 8)
 * @returns {object} {isValid: boolean, message: string}
 */
export const validatePassword = (password, minLength = 8) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < minLength) {
    return { isValid: false, message: `Password must be at least ${minLength} characters` };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate search query
 * @param {string} query - Search query to validate
 * @param {number} maxLength - Maximum query length (default: 100)
 * @returns {object} {isValid: boolean, sanitized: string, message: string}
 */
export const validateSearchQuery = (query, maxLength = 100) => {
  if (!query || typeof query !== 'string') {
    return { isValid: false, sanitized: '', message: 'Search query is required' };
  }

  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return { isValid: false, sanitized: '', message: 'Search query cannot be empty' };
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, sanitized: '', message: `Search query too long (max ${maxLength} characters)` };
  }

  // Sanitize: remove special characters that could cause issues
  const sanitized = trimmed.replace(/[<>{}]/g, '').slice(0, maxLength);

  return { isValid: true, sanitized, message: '' };
};

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {object} {isValid: boolean, message: string}
 */
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, message: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return { isValid: false, message: 'Username must be at least 3 characters' };
  }

  if (trimmed.length > 50) {
    return { isValid: false, message: 'Username too long (max 50 characters)' };
  }

  // Only alphanumeric, underscore, hyphen
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { isValid: false, message: 'Username can only contain letters, numbers, underscore, and hyphen' };
  }

  return { isValid: true, message: '' };
};
