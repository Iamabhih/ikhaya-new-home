# Environment Variables Configuration

**CRITICAL**: This guide addresses the hardcoded credentials security issue (AUDIT_REPORT.md #2)

---

## ⚠️ SECURITY WARNING

**NEVER commit `.env` files to version control!**

The following credentials are currently **HARDCODED** in source code and must be moved to environment variables **IMMEDIATELY**:

- ❌ PayFast passphrase in `/src/utils/payment/constants.ts:14`
- ❌ PayFast merchant ID and key in source files
- ❌ Supabase keys (if hardcoded anywhere)

---

## Required Environment Variables

### Frontend (Lovable.dev / Vite)

Create a `.env` file in the project root:

```bash
# PayFast Configuration
VITE_PAYFAST_MODE=sandbox                    # 'sandbox' or 'live'
VITE_PAYFAST_MERCHANT_ID=13644558            # Your merchant ID
VITE_PAYFAST_MERCHANT_KEY=u6ksewx8j6xzx     # Your merchant key
# Note: Passphrase NOT needed in frontend (webhook only)

# Supabase Configuration
VITE_SUPABASE_URL=https://kauostzhxqoxggwqgtym.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Application
VITE_SITE_URL=https://ikhayahomeware.online
VITE_APP_ENV=production                      # 'development' or 'production'
```

### Backend (Supabase Edge Functions / Deno)

These are configured in Supabase dashboard or via CLI:

```bash
# PayFast Configuration (for webhook signature verification)
PAYFAST_MODE=live                            # 'sandbox' or 'live'
PAYFAST_PASSPHRASE=Khalid123@Ozz            # CRITICAL: Keep secret!
PAYFAST_MERCHANT_ID=13644558
PAYFAST_MERCHANT_KEY=u6ksewx8j6xzx

# Supabase (automatically provided)
SUPABASE_URL=https://kauostzhxqoxggwqgtym.supabase.co
SUPABASE_ANON_KEY=auto_provided
SUPABASE_SERVICE_ROLE_KEY=auto_provided

# Email (if using custom email service)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@ikhayahomeware.online
SMTP_PASS=your_smtp_password
```

---

## Setup Instructions

### 1. Local Development

```bash
# Navigate to project root
cd /path/to/ikhaya-new-home

# Copy example file
cp .env.example .env

# Edit .env with your actual values
nano .env

# Verify .env is in .gitignore
grep "\.env$" .gitignore
# Should output: .env

# Never commit .env!
git status
# Should NOT show .env as modified/untracked
```

### 2. Lovable.dev Configuration

1. Go to your Lovable.dev project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each `VITE_*` variable:
   - Key: `VITE_PAYFAST_MODE`
   - Value: `sandbox` (or `live` for production)
4. Click **Save** after each variable
5. **Rebuild** the project to apply changes

### 3. Supabase Configuration

**Option A: Via Dashboard (Recommended)**

1. Go to Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add each secret:
   ```
   PAYFAST_MODE = live
   PAYFAST_PASSPHRASE = Khalid123@Ozz
   PAYFAST_MERCHANT_ID = 13644558
   PAYFAST_MERCHANT_KEY = u6ksewx8j6xzx
   ```
4. Click **Save**
5. Redeploy edge functions:
   ```bash
   supabase functions deploy --project-ref YOUR_PROJECT_REF
   ```

**Option B: Via Supabase CLI**

```bash
# Set secrets
supabase secrets set PAYFAST_MODE=live
supabase secrets set PAYFAST_PASSPHRASE="Khalid123@Ozz"
supabase secrets set PAYFAST_MERCHANT_ID="13644558"
supabase secrets set PAYFAST_MERCHANT_KEY="u6ksewx8j6xzx"

# List secrets (values hidden)
supabase secrets list

# Verify in edge function
cat supabase/functions/payfast-webhook/index.ts | grep "Deno.env"
```

---

## Code Changes Required

### ❌ Remove Hardcoded Credentials

**File:** `/src/utils/payment/constants.ts`

```typescript
// DELETE THIS ENTIRE FILE
// It contains hardcoded credentials and conflicts with PayFastConfig.ts
```

**File:** `/src/utils/payment/PayFastConfig.ts`

**Before:**
```typescript
const isTestMode = false; // Change to true only for testing
```

**After:**
```typescript
const isTestMode = import.meta.env.VITE_PAYFAST_MODE === 'sandbox';

// Get credentials from environment
const MERCHANT_ID = import.meta.env.VITE_PAYFAST_MERCHANT_ID || '13644558';
const MERCHANT_KEY = import.meta.env.VITE_PAYFAST_MERCHANT_KEY || 'u6ksewx8j6xzx';
```

**Full Updated File:**
```typescript
// PayFast configuration - Environment-based
export const getPayFastConfig = () => {
  // Determine mode from environment variable
  const isTestMode = import.meta.env.VITE_PAYFAST_MODE === 'sandbox';

  // Get credentials from environment (with fallbacks for development only)
  const merchantId = import.meta.env.VITE_PAYFAST_MERCHANT_ID;
  const merchantKey = import.meta.env.VITE_PAYFAST_MERCHANT_KEY;

  if (!merchantId || !merchantKey) {
    console.error('⚠️ PayFast credentials not configured in environment variables');
  }

  return {
    // Merchant credentials from environment
    MERCHANT_ID: merchantId,
    MERCHANT_KEY: merchantKey,

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

export const PAYFAST_CONFIG = getPayFastConfig();

export const generatePaymentReference = () => {
  const timestamp = Date.now();
  const randomPart = crypto.randomUUID().split('-')[0].toUpperCase();
  return `IKH-${timestamp}-${randomPart}`;
};
```

---

### Update Webhook Handler

**File:** `/supabase/functions/payfast-webhook/index.ts`

**Before:**
```typescript
const isTestMode = Deno.env.get('PAYFAST_MODE') !== 'live';
const passPhrase = Deno.env.get('PAYFAST_PASSPHRASE') || '';
```

**After (already correct):** ✅
```typescript
const isTestMode = Deno.env.get('PAYFAST_MODE') !== 'live';
const passPhrase = Deno.env.get('PAYFAST_PASSPHRASE') || '';

// Validate environment
if (!isTestMode && !passPhrase) {
  console.error('⚠️ PAYFAST_PASSPHRASE not set in production mode!');
}
```

---

## Update `.env.example`

**File:** `.env.example`

```bash
# PayFast Payment Gateway
# Get these from https://www.payfast.co.za/merchant/settings
VITE_PAYFAST_MODE=sandbox
VITE_PAYFAST_MERCHANT_ID=your_merchant_id_here
VITE_PAYFAST_MERCHANT_KEY=your_merchant_key_here

# Supabase Backend
# Get these from https://supabase.com/dashboard/project/_/settings/api
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Application
VITE_SITE_URL=https://ikhayahomeware.online
VITE_APP_ENV=production

# DO NOT commit .env file to git!
# Copy this file to .env and fill in your actual values
```

---

## Verification Checklist

After making changes:

- [ ] `.env` file created with all variables
- [ ] `.env` is in `.gitignore` (verify with `git status`)
- [ ] Lovable.dev environment variables configured
- [ ] Supabase secrets configured
- [ ] Deleted `/src/utils/payment/constants.ts`
- [ ] Updated `PayFastConfig.ts` to use environment variables
- [ ] Tested in sandbox mode
- [ ] Tested in live mode
- [ ] No hardcoded credentials in any source file
- [ ] `.env.example` updated with all required variables

---

## Search for Hardcoded Credentials

Run these commands to find any remaining hardcoded values:

```bash
# Search for PayFast passphrase
grep -r "Khalid123" --exclude-dir=node_modules --exclude-dir=.git .

# Search for merchant ID
grep -r "13644558" --exclude-dir=node_modules --exclude-dir=.git .

# Search for merchant key
grep -r "u6ksewx8j6xzx" --exclude-dir=node_modules --exclude-dir=.git .

# Should only find matches in:
# - .env (not committed)
# - .env.example (safe, no real values)
# - This documentation
```

---

## Credential Rotation

**If your repository was ever public or credentials were exposed:**

1. **Login to PayFast:**
   - Go to https://www.payfast.co.za/merchant/settings
   - Navigate to **Integration** section

2. **Generate New Passphrase:**
   - Click **Generate** next to Passphrase
   - Save the new passphrase securely
   - Update in Supabase secrets

3. **Rotate if Possible:**
   - Some credentials cannot be changed
   - Contact PayFast support if needed

4. **Update Everywhere:**
   - Local `.env`
   - Lovable.dev environment variables
   - Supabase secrets
   - Redeploy all services

---

## Deployment Workflow

**When deploying changes:**

1. **Local Development:**
   ```bash
   # Use .env for local testing
   npm run dev
   ```

2. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Update feature"
   git push
   # .env is NOT pushed (in .gitignore)
   ```

3. **Lovable.dev Auto-Deploy:**
   - Reads environment variables from dashboard
   - Builds with VITE_* variables

4. **Supabase Deploy:**
   ```bash
   # Edge functions use secrets from dashboard
   supabase functions deploy
   ```

---

## Troubleshooting

**Issue:** "PayFast credentials not configured"

**Solution:**
1. Check `.env` file exists
2. Verify variable names start with `VITE_`
3. Restart dev server: `npm run dev`
4. Check browser console for errors

**Issue:** Webhook signature verification fails

**Solution:**
1. Verify `PAYFAST_PASSPHRASE` is set in Supabase secrets
2. Check Supabase function logs: `supabase functions logs payfast-webhook`
3. Ensure passphrase matches PayFast dashboard

**Issue:** Environment variables not updating

**Solution:**
1. Lovable.dev: Trigger manual rebuild
2. Local: Restart dev server
3. Supabase: Redeploy functions

---

## Security Best Practices

✅ **DO:**
- Use environment variables for ALL secrets
- Add `.env` to `.gitignore`
- Use different credentials for sandbox/live
- Rotate credentials if exposed
- Use Supabase secrets for edge functions

❌ **DON'T:**
- Commit `.env` to version control
- Hardcode credentials in source files
- Share credentials in Slack/email
- Use production credentials in development
- Log credentials to console

---

**Created:** 2025-12-24
**Updated:** 2025-12-24
**Priority:** 🔴 CRITICAL - Implement immediately
