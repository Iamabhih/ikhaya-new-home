const SITE_URL = 'https://ikhayahomeware.online';

// Get environment-based configuration
const getEnvironmentConfig = () => {
  // Use a more reliable method to determine environment
  // Set to false for production, true for testing
  const isTestMode = true; // Change this to false for production
  
  return {
    useSandbox: isTestMode,
    live: {
      merchant_id: '13644558',
      merchant_key: 'u6ksewx8j6xzx', 
      passphrase: 'Khalid123@Ozz',
      host: 'https://www.payfast.co.za/eng/process',
    },
    sandbox: {
      merchant_id: '10000100',
      merchant_key: '46f0cd694581a',
      passphrase: '',
      host: 'https://sandbox.payfast.co.za/eng/process',
    },
    siteUrl: SITE_URL,
  };
};

export const PAYFAST_CONFIG = getEnvironmentConfig();

export const getCurrentPayfastConfig = () => {
  return PAYFAST_CONFIG.useSandbox ? PAYFAST_CONFIG.sandbox : PAYFAST_CONFIG.live;
};
