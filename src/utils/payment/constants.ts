// Payment service constants for Ikhaya Homeware

export const ADMIN_EMAIL = 'info@ikhayahomeware.online';
export const SITE_URL = 'https://ikhayahomeware.online';

export const PAYFAST_CONFIG = {
  // Live PayFast values - YOUR ACTUAL CREDENTIALS
  live: {
    merchant_id: '13644558',
    merchant_key: 'u6ksewx8j6xzx',
    passphrase: 'Khalid123@Ozz',
    host: 'https://www.payfast.co.za/eng/process',
  },
  // Sandbox PayFast values for testing
  sandbox: {
    merchant_id: '10000100',
    merchant_key: '46f0cd694581a',
    passphrase: '', // IMPORTANT: Empty for sandbox
    host: 'https://sandbox.payfast.co.za/eng/process',
  },
  useSandbox: false, // SET TO false FOR PRODUCTION
  merchant_notification_email: 'info@ikhayahomeware.online',
  siteUrl: SITE_URL,
};

export const getCurrentPayfastConfig = () => {
  return PAYFAST_CONFIG.useSandbox ? PAYFAST_CONFIG.sandbox : PAYFAST_CONFIG.live;
};