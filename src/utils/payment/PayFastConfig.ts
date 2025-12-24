// PayFast configuration - Database settings with environment fallback
// Addresses AUDIT_REPORT.md CRITICAL Issue #2: Hardcoded credentials
// Addresses AUDIT_REPORT.md CRITICAL Issue #3: Order ID standardization

export interface PayFastDBSettings {
  merchantId?: string;
  merchantKey?: string;
  passphrase?: string;
  isTestMode?: boolean;
}

export const getPayFastConfig = (dbSettings?: PayFastDBSettings) => {
  // Prefer database settings, fall back to environment variables
  const merchantId = dbSettings?.merchantId || import.meta.env.VITE_PAYFAST_MERCHANT_ID || '';
  const merchantKey = dbSettings?.merchantKey || import.meta.env.VITE_PAYFAST_MERCHANT_KEY || '';
  const passphrase = dbSettings?.passphrase || '';
  
  // Determine mode: prefer DB setting, then env var, default to sandbox
  const isTestMode = dbSettings?.isTestMode ?? (import.meta.env.VITE_PAYFAST_MODE === 'sandbox' ? true : true);

  // Validate credentials are configured
  if (!merchantId || !merchantKey) {
    console.warn('⚠️ PayFast credentials not configured');
  }

  return {
    // Merchant credentials
    MERCHANT_ID: merchantId,
    MERCHANT_KEY: merchantKey,
    PASSPHRASE: passphrase,

    // URLs
    SANDBOX_URL: 'https://sandbox.payfast.co.za/eng/process',
    PRODUCTION_URL: 'https://www.payfast.co.za/eng/process',

    // Environment setting
    IS_TEST_MODE: isTestMode,

    // Return URLs - dynamically set based on current domain
    getReturnUrls: () => {
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : 'https://ikhayahomeware.online';

      return {
        return_url: `${baseUrl}/checkout-success`,
        cancel_url: `${baseUrl}/checkout?cancelled=true`,
        notify_url: `https://kauostzhxqoxggwqgtym.supabase.co/functions/v1/payfast-webhook`,
      };
    }
  };
};

// Backward compatibility - uses default config (no DB settings)
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
