// PayFast configuration - Fixed version matching working setup
export const getPayFastConfig = () => {
  // Environment flag - set to false for production
  const isTestMode = false; // Change to true only for testing
  
  return {
    // Your actual live merchant credentials
    MERCHANT_ID: '13644558',
    MERCHANT_KEY: 'u6ksewx8j6xzx',
    
    // URLs
    SANDBOX_URL: 'https://sandbox.payfast.co.za/eng/process',
    PRODUCTION_URL: 'https://www.payfast.co.za/eng/process',
    
    // Environment setting
    IS_TEST_MODE: isTestMode,
    
    // Return URLs - dynamically set based on current domain
    getReturnUrls: () => {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ikhayahomeware.online';
      return {
        return_url: `${baseUrl}/checkout-success`,
        cancel_url: `${baseUrl}/checkout?cancelled=true`,
        notify_url: `https://kauostzhxqoxggwqgtym.supabase.co/functions/v1/payfast-webhook`,
      };
    }
  };
};

// Backward compatibility
export const PAYFAST_CONFIG = getPayFastConfig();

export const generatePaymentReference = () => {
  return `IKH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};
