/**
 * PayFast configuration constants
 */
export const PAYFAST_CONFIG = {
  useSandbox: false, // Set to false for production - using live environment
};

/**
 * Get current PayFast configuration
 */
export const getCurrentPayfastConfig = () => {
  return {
    merchant_id: PAYFAST_CONFIG.useSandbox ? '10004002' : process.env.PAYFAST_MERCHANT_ID || '',
    merchant_key: PAYFAST_CONFIG.useSandbox ? '4f7e6bb6c8d7c0e8f7c6b5a4d3c2b1a0' : process.env.PAYFAST_MERCHANT_KEY || '',
    passphrase: process.env.PAYFAST_PASSPHRASE || '', // Will be set from environment
  };
};