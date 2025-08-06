// src/utils/payment/constants.ts

export const ADMIN_EMAIL = 'info@ikhayahomeware.online';

// PRIMARY DOMAIN - Used everywhere
const SITE_URL = 'https://ikhayahomeware.online';

export const PAYFAST_CONFIG = {
  // Live PayFast values
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
    passphrase: 'jt7NOE43FZPn',
    host: 'https://sandbox.payfast.co.za/eng/process',
  },
  useSandbox: true, // Set to true for testing
  merchant_notification_email: 'info@ikhayahomeware.online',
  siteUrl: https://ikhayahomeware.online,
};

export const getCurrentPayfastConfig = () => {
  return PAYFAST_CONFIG.useSandbox ? PAYFAST_CONFIG.sandbox : PAYFAST_CONFIG.live;
};