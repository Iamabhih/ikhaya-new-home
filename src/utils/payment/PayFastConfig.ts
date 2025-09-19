// Simplified PayFast configuration - no external dependencies
export const getPayFastConfig = () => {
  // Environment flag - change this for production vs testing
  const useSandbox = false; // Set to false for production
  
  return {
    // Use appropriate credentials based on environment
    MERCHANT_ID: useSandbox ? '10000100' : '13644558',
    MERCHANT_KEY: useSandbox ? '46f0cd694581a' : 'u6ksewx8j6xzx',
    
    // URLs
    SANDBOX_URL: 'https://sandbox.payfast.co.za/eng/process',
    PRODUCTION_URL: 'https://www.payfast.co.za/eng/process',
    
    // Environment setting
    IS_TEST_MODE: useSandbox,
    
    // Return URLs - dynamically set based on current domain
    getReturnUrls: () => {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
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