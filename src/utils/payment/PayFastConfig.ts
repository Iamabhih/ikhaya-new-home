// PayFast configuration - Environment-based (SECURITY FIX)
// Addresses AUDIT_REPORT.md CRITICAL Issue #2: Hardcoded credentials
// Addresses AUDIT_REPORT.md CRITICAL Issue #3: Order ID standardization
export const getPayFastConfig = () => {
  // Determine mode from environment variable
  const isTestMode = import.meta.env.VITE_PAYFAST_MODE === 'sandbox';

  // Get credentials from environment (with fallback warnings)
  const merchantId = import.meta.env.VITE_PAYFAST_MERCHANT_ID;
  const merchantKey = import.meta.env.VITE_PAYFAST_MERCHANT_KEY;

  // Validate credentials are configured
  if (!merchantId || !merchantKey) {
    console.error('⚠️ PayFast credentials not configured in environment variables');
    console.error('Please set VITE_PAYFAST_MERCHANT_ID and VITE_PAYFAST_MERCHANT_KEY');
  }

  return {
    // Merchant credentials from environment
    MERCHANT_ID: merchantId || '',
    MERCHANT_KEY: merchantKey || '',

    // URLs
    SANDBOX_URL: 'https://sandbox.payfast.co.za/eng/process',
    PRODUCTION_URL: 'https://www.payfast.co.za/eng/process',

    // Environment setting
    IS_TEST_MODE: isTestMode,

    // Return URLs - dynamically set based on current domain
    getReturnUrls: () => {
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : (import.meta.env.VITE_SITE_URL || 'https://ikhayahomeware.online');

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

/**
 * Generates a cryptographically secure order ID
 * Format: IKH-{timestamp}-{random8}
 * Example: IKH-1735040123456-A7B3C8D2
 *
 * This is the SINGLE source of truth for order ID generation
 * Addresses AUDIT_REPORT.md CRITICAL Issue #3
 */
export const generateOrderId = (): string => {
  const timestamp = Date.now();
  const randomPart = crypto.randomUUID().split('-')[0].toUpperCase();
  return `IKH-${timestamp}-${randomPart}`;
};

// Backward compatibility - re-export as old name
export const generatePaymentReference = generateOrderId;
