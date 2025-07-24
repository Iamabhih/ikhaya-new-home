import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { sanitizeText, sanitizeEmail, sanitizeNumber } from '@/utils/security';

interface SecureInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  sanitizationType?: 'text' | 'email' | 'number' | 'none';
  maxLength?: number;
}

export const SecureInput: React.FC<SecureInputProps> = ({
  value,
  onChange,
  sanitizationType = 'text',
  maxLength = 500,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let sanitizedValue = e.target.value;
    
    // Apply sanitization based on type
    switch (sanitizationType) {
      case 'email':
        sanitizedValue = sanitizeEmail(sanitizedValue);
        break;
      case 'number':
        sanitizedValue = sanitizeNumber(sanitizedValue).toString();
        break;
      case 'text':
        sanitizedValue = sanitizeText(sanitizedValue);
        break;
      case 'none':
        // No sanitization
        break;
    }
    
    // Apply length limit
    if (maxLength && sanitizedValue.length > maxLength) {
      sanitizedValue = sanitizedValue.substring(0, maxLength);
    }
    
    onChange(sanitizedValue);
  };

  return (
    <Input
      {...props}
      value={value}
      onChange={handleChange}
      maxLength={maxLength}
    />
  );
};

interface SecureTextareaProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  allowHtml?: boolean;
  placeholder?: string;
  className?: string;
}

export const SecureTextarea: React.FC<SecureTextareaProps> = ({
  value,
  onChange,
  maxLength = 2000,
  allowHtml = false,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let sanitizedValue = e.target.value;
    
    if (!allowHtml) {
      sanitizedValue = sanitizeText(sanitizedValue);
    }
    
    if (maxLength && sanitizedValue.length > maxLength) {
      sanitizedValue = sanitizedValue.substring(0, maxLength);
    }
    
    onChange(sanitizedValue);
  };

  return (
    <Textarea
      {...props}
      value={value}
      onChange={handleChange}
      maxLength={maxLength}
    />
  );
};