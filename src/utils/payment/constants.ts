// Payment service constants for Ikhaya Homeware

// Define the admin email to use for all notifications
export const ADMIN_EMAIL = 'info@ikhayahomeware.online';

// Production site URL - Ikhaya Homeware domain
export const SITE_URL = 'https://ikhayahomeware.online';

// PayFast configuration for Ikhaya Homeware
export const PAYFAST_CONFIG = {
  // Live PayFast values
  live: {
    merchant_id: '13644558',
    merchant_key: 'u6ksewx8j6xzx',
    passphrase: 'Khalid123@Ozz',
  },
  // Sandbox PayFast values - Use for testing
  sandbox: {
    merchant_id: '10000100',
    merchant_key: '46f0cd694581a',
    passphrase: '', // Sandbox has no passphrase
  },
  // Set to true for testing, false for production
  useSandbox: false, // CHANGE TO true FOR TESTING
  // Email to receive payment notifications
  merchant_notification_email: 'info@ikhayahomeware.online',
  // Site URL for consistent callback URLs
  siteUrl: SITE_URL,
};

// Helper to get the current PayFast environment configuration
export const getCurrentPayfastConfig = () => {
  return PAYFAST_CONFIG.useSandbox ? PAYFAST_CONFIG.sandbox : PAYFAST_CONFIG.live;
};