const SITE_URL = 'https://ikhayahomeware.online';

export const PAYFAST_CONFIG = {
  // Production PayFast credentials - GET THESE FROM YOUR PAYFAST ACCOUNT
  live: {
    merchant_id: '13644558', // Replace with your actual merchant ID
    merchant_key: 'u6ksewx8j6xzx', // Replace with your actual merchant key
    passphrase: 'Khalid123@Ozz', // Only used for webhook signature verification
    host: 'https://www.payfast.co.za/eng/process',
  },
  // Sandbox credentials for testing
  sandbox: {
    merchant_id: '10000100',
    merchant_key: '46f0cd694581a',
    passphrase: '', // No passphrase for sandbox
    host: 'https://sandbox.payfast.co.za/eng/process',
  },
  // Start with sandbox for testing
  useSandbox: false,
  siteUrl: SITE_URL,
};

export const getCurrentPayfastConfig = () => {
  return PAYFAST_CONFIG.useSandbox ? PAYFAST_CONFIG.sandbox : PAYFAST_CONFIG.live;
};
