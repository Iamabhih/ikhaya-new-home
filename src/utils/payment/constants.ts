/**
 * PayFast configuration constants
 */
export const PAYFAST_CONFIG = {
  useSandbox: true, // Set to false for production
};

/**
 * Get current PayFast configuration
 */
export const getCurrentPayfastConfig = () => {
  return {
    merchant_id: PAYFAST_CONFIG.useSandbox ? '10004002' : '', // Sandbox ID
    merchant_key: PAYFAST_CONFIG.useSandbox ? '4f7e6bb6c8d7c0e8f7c6b5a4d3c2b1a0' : '', // Sandbox key
    passphrase: '', // Will be set from Supabase secrets in edge function
  };
};