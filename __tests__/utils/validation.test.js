import {
  validateEmail,
  validatePassword,
  validateSearchQuery,
  validateUsername,
} from '../../src/utils/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    test('returns true for valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('test123@test-domain.com')).toBe(true);
    });

    test('returns false for invalid email', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test @example.com')).toBe(false);
      expect(validateEmail('test@example')).toBe(false);
    });

    test('returns false for null or undefined', () => {
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });

    test('returns false for non-string input', () => {
      expect(validateEmail(123)).toBe(false);
      expect(validateEmail({})).toBe(false);
      expect(validateEmail([])).toBe(false);
    });

    test('trims whitespace before validation', () => {
      expect(validateEmail('  test@example.com  ')).toBe(true);
    });

    test('returns false for empty string', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('   ')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('returns valid for password meeting minimum length', () => {
      const result = validatePassword('password123');
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('');
    });

    test('returns invalid for short password', () => {
      const result = validatePassword('short');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least 8 characters');
    });

    test('respects custom minimum length', () => {
      const result = validatePassword('12345', 6);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least 6 characters');
    });

    test('returns invalid for null or undefined password', () => {
      const result1 = validatePassword(null);
      expect(result1.isValid).toBe(false);
      expect(result1.message).toBe('Password is required');

      const result2 = validatePassword(undefined);
      expect(result2.isValid).toBe(false);
      expect(result2.message).toBe('Password is required');
    });

    test('returns invalid for non-string password', () => {
      const result = validatePassword(12345678);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password is required');
    });

    test('accepts password exactly at minimum length', () => {
      const result = validatePassword('12345678', 8);
      expect(result.isValid).toBe(true);
    });

    test('accepts long passwords', () => {
      const longPassword = 'a'.repeat(100);
      const result = validatePassword(longPassword);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateSearchQuery', () => {
    test('returns valid for normal search query', () => {
      const result = validateSearchQuery('nasi goreng');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('nasi goreng');
      expect(result.message).toBe('');
    });

    test('returns invalid for empty query', () => {
      const result = validateSearchQuery('');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('required');
    });

    test('returns invalid for whitespace-only query', () => {
      const result = validateSearchQuery('   ');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('cannot be empty');
    });

    test('trims whitespace', () => {
      const result = validateSearchQuery('  search term  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('search term');
    });

    test('sanitizes special characters', () => {
      const result = validateSearchQuery('search<>{}term');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('searchterm');
    });

    test('returns invalid for query exceeding max length', () => {
      const longQuery = 'a'.repeat(101);
      const result = validateSearchQuery(longQuery, 100);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('too long');
    });

    test('truncates sanitized query to max length', () => {
      const longQuery = 'a'.repeat(105);
      const result = validateSearchQuery(longQuery, 100);
      expect(result.sanitized.length).toBeLessThanOrEqual(100);
    });

    test('returns invalid for null or undefined', () => {
      const result1 = validateSearchQuery(null);
      expect(result1.isValid).toBe(false);

      const result2 = validateSearchQuery(undefined);
      expect(result2.isValid).toBe(false);
    });

    test('respects custom max length', () => {
      const result = validateSearchQuery('short', 3);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('too long');
    });
  });

  describe('validateUsername', () => {
    test('returns valid for valid username', () => {
      const result = validateUsername('john_doe');
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('');
    });

    test('accepts alphanumeric characters', () => {
      const result = validateUsername('user123');
      expect(result.isValid).toBe(true);
    });

    test('accepts underscore and hyphen', () => {
      const result1 = validateUsername('user_name');
      expect(result1.isValid).toBe(true);

      const result2 = validateUsername('user-name');
      expect(result2.isValid).toBe(true);
    });

    test('returns invalid for username too short', () => {
      const result = validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least 3 characters');
    });

    test('returns invalid for username too long', () => {
      const longUsername = 'a'.repeat(51);
      const result = validateUsername(longUsername);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('too long');
    });

    test('returns invalid for username with spaces', () => {
      const result = validateUsername('user name');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('only contain');
    });

    test('returns invalid for username with special characters', () => {
      const result = validateUsername('user@name');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('only contain');
    });

    test('trims whitespace before validation', () => {
      const result = validateUsername('  username  ');
      expect(result.isValid).toBe(true);
    });

    test('returns invalid for null or undefined', () => {
      const result1 = validateUsername(null);
      expect(result1.isValid).toBe(false);
      expect(result1.message).toBe('Username is required');

      const result2 = validateUsername(undefined);
      expect(result2.isValid).toBe(false);
      expect(result2.message).toBe('Username is required');
    });

    test('accepts username exactly at minimum length', () => {
      const result = validateUsername('abc');
      expect(result.isValid).toBe(true);
    });

    test('accepts username exactly at maximum length', () => {
      const username = 'a'.repeat(50);
      const result = validateUsername(username);
      expect(result.isValid).toBe(true);
    });
  });
});
