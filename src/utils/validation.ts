
import DOMPurify from 'dompurify';

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Phone number validation (South African format)
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+27|0)[6-8][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Password validation - 8+ chars, uppercase, lowercase, number, special char
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Price validation
export const validatePrice = (price: string | number): boolean => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) && numPrice > 0 && numPrice <= 1000000;
};

// Quantity validation
export const validateQuantity = (quantity: string | number): boolean => {
  const numQuantity = typeof quantity === 'string' ? parseInt(quantity) : quantity;
  return Number.isInteger(numQuantity) && numQuantity > 0 && numQuantity <= 10000;
};

// Content sanitization
export const sanitizeContent = (content: string): string => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};

// Name validation
export const validateName = (name: string): boolean => {
  const nameRegex = /^[a-zA-Z\s'-]{1,50}$/;
  return nameRegex.test(name.trim());
};

// SKU validation
export const validateSKU = (sku: string): boolean => {
  const skuRegex = /^[A-Z0-9-_]{3,20}$/;
  return skuRegex.test(sku);
};
