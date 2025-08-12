// Production site URL - your actual domain
const SITE_URL = 'https://ikhayahomeware.online';

// PayFast configuration
export const PAYFAST_CONFIG = {
  // Live PayFast values - REPLACE THESE WITH YOUR ACTUAL CREDENTIALS
  live: {
    merchant_id: '13644558', // Get from PayFast dashboard
    merchant_key: 'u6ksewx8j6xzx', // Get from PayFast dashboard  
    passphrase: 'Khalid123@Ozz', // Get from PayFast dashboard (Settings > Integration)
    host: 'https://www.payfast.co.za/eng/process',
  },
  // Sandbox PayFast values for testing
  sandbox: {
    merchant_id: '10000100',
    merchant_key: '46f0cd694581a',
    passphrase: '', // Sandbox doesn't use passphrase - leave empty
    host: 'https://sandbox.payfast.co.za/eng/process',
  },
  // START WITH TRUE FOR TESTING, then set to false for production
  useSandbox: false,
  // Your site URL for callbacks
  siteUrl: SITE_URL,
};

// Helper to get current PayFast config
export const getCurrentPayfastConfig = () => {
  return PAYFAST_CONFIG.useSandbox ? PAYFAST_CONFIG.sandbox : PAYFAST_CONFIG.live;
};
