// Simplified PayFast configuration based on working example
export const getPayFastConfig = () => {
  // Simple configuration without complex environment detection
  return {
    // Live credentials
    MERCHANT_ID: '13644558',
    MERCHANT_KEY: 'u6ksewx8j6xzx',
    
    // URLs
    SANDBOX_URL: 'https://sandbox.payfast.co.za/eng/process',
    PRODUCTION_URL: 'https://www.payfast.co.za/eng/process',
    
    // Environment - set to false for production, true for testing
    IS_TEST_MODE: false, // Change this to true for sandbox testing
    
    // Return URLs - dynamically set based on current domain
    getReturnUrls: () => {
      const baseUrl = window.location.origin;
      return {
        return_url: `${baseUrl}/checkout-success`,
        cancel_url: `${baseUrl}/checkout?cancelled=true`,
        notify_url: `${baseUrl}/api/payfast-webhook`,
      };
    }
  };
};

// Backward compatibility
export const PAYFAST_CONFIG = getPayFastConfig();

export const generatePaymentReference = () => {
  return `IKH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};