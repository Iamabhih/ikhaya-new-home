import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validatePassword,
  validatePrice,
  validateQuantity,
  sanitizeContent,
  validateName,
  validateSKU,
} from '@/utils/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.za')).toBe(true);
      expect(validateEmail('test+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@invalid.com')).toBe(false);
      expect(validateEmail('invalid@.com')).toBe(false);
      expect(validateEmail('invalid @example.com')).toBe(false);
    });

    it('should reject emails longer than 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      expect(validateEmail(longEmail)).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate correct South African phone numbers', () => {
      expect(validatePhone('+27821234567')).toBe(true);
      expect(validatePhone('0821234567')).toBe(true);
      expect(validatePhone('0731234567')).toBe(true);
      expect(validatePhone('0841234567')).toBe(true);
    });

    it('should validate phone numbers with spaces', () => {
      expect(validatePhone('082 123 4567')).toBe(true);
      expect(validatePhone('+27 82 123 4567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('1234567890')).toBe(false);
      expect(validatePhone('082123456')).toBe(false); // too short
      expect(validatePhone('08212345678')).toBe(false); // too long
      expect(validatePhone('0521234567')).toBe(false); // invalid prefix
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongP@ss123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePassword('NoNumbers!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePassword('NoSpecial123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return multiple errors for weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validatePrice', () => {
    it('should validate correct prices', () => {
      expect(validatePrice(10.99)).toBe(true);
      expect(validatePrice('99.99')).toBe(true);
      expect(validatePrice(1)).toBe(true);
      expect(validatePrice(999999)).toBe(true);
    });

    it('should reject invalid prices', () => {
      expect(validatePrice(0)).toBe(false);
      expect(validatePrice(-10)).toBe(false);
      expect(validatePrice('invalid')).toBe(false);
      expect(validatePrice(1000001)).toBe(false);
    });
  });

  describe('validateQuantity', () => {
    it('should validate correct quantities', () => {
      expect(validateQuantity(1)).toBe(true);
      expect(validateQuantity('5')).toBe(true);
      expect(validateQuantity(100)).toBe(true);
      expect(validateQuantity(9999)).toBe(true);
    });

    it('should reject invalid quantities', () => {
      expect(validateQuantity(0)).toBe(false);
      expect(validateQuantity(-5)).toBe(false);
      expect(validateQuantity(10001)).toBe(false);
      expect(validateQuantity('invalid')).toBe(false);
      expect(validateQuantity(1.5)).toBe(false); // not an integer
    });
  });

  describe('sanitizeContent', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const output = sanitizeContent(input);
      expect(output).toContain('Hello');
      expect(output).toContain('strong');
    });

    it('should remove dangerous HTML tags', () => {
      const input = '<script>alert("xss")</script><p>Safe content</p>';
      const output = sanitizeContent(input);
      expect(output).not.toContain('script');
      expect(output).toContain('Safe content');
    });

    it('should remove dangerous attributes', () => {
      const input = '<p onclick="alert(1)">Click me</p>';
      const output = sanitizeContent(input);
      expect(output).not.toContain('onclick');
      expect(output).toContain('Click me');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="malicious.com"></iframe>';
      const output = sanitizeContent(input);
      expect(output).not.toContain('iframe');
    });
  });

  describe('validateName', () => {
    it('should validate correct names', () => {
      expect(validateName('John Doe')).toBe(true);
      expect(validateName("O'Brien")).toBe(true);
      expect(validateName('Mary-Jane')).toBe(true);
      expect(validateName('Jean-Claude')).toBe(true);
    });

    it('should reject invalid names', () => {
      expect(validateName('123')).toBe(false);
      expect(validateName('John@Doe')).toBe(false);
      expect(validateName('')).toBe(false);
      expect(validateName('a'.repeat(51))).toBe(false); // too long
    });

    it('should trim whitespace before validation', () => {
      expect(validateName('  John Doe  ')).toBe(true);
    });
  });

  describe('validateSKU', () => {
    it('should validate correct SKUs', () => {
      expect(validateSKU('ABC123')).toBe(true);
      expect(validateSKU('PROD-001')).toBe(true);
      expect(validateSKU('SKU_123')).toBe(true);
    });

    it('should reject invalid SKUs', () => {
      expect(validateSKU('ab')).toBe(false); // too short
      expect(validateSKU('a'.repeat(21))).toBe(false); // too long
      expect(validateSKU('lowercase')).toBe(false); // must be uppercase
      expect(validateSKU('ABC 123')).toBe(false); // no spaces allowed
      expect(validateSKU('ABC@123')).toBe(false); // invalid character
    });
  });
});
