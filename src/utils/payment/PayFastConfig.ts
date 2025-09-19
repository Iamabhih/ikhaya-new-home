import { PAYFAST_CONFIG as CONFIG } from './constants';

// Simplified PayFast configuration based on working example
const getEnvironmentConfig = () => {
  return CONFIG;
};

export const getPayFastConfig = () => {
  const config = getEnvironmentConfig();
  return {
    // Use sandbox credentials when in test mode, live when not
    MERCHANT_ID: config.useSandbox ? config.sandbox.merchant_id : config.live.merchant_id,
    MERCHANT_KEY: config.useSandbox ? config.sandbox.merchant_key : config.live.merchant_key,
    
    // URLs
    SANDBOX_URL: config.sandbox.host,
    PRODUCTION_URL: config.live.host,
    
    // Environment - set to true for sandbox testing, false for production
    IS_TEST_MODE: config.useSandbox,
    
    // Return URLs - dynamically set based on current domain
    getReturnUrls: () => {
      const baseUrl = config.siteUrl;
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