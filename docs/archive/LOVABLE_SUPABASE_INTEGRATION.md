# Lovable.dev + Supabase Integration Guide
## Ikhaya Homeware E-Commerce Platform

**Last Updated:** December 24, 2025
**Platform Version:** 3.0.0
**Deployment Model:** Lovable.dev (Frontend) + Supabase (Backend)

---

## TABLE OF CONTENTS

1. [Architecture Overview](#architecture-overview)
2. [Development Workflow](#development-workflow)
3. [Deployment Process](#deployment-process)
4. [Database Migrations](#database-migrations)
5. [Environment Configuration](#environment-configuration)
6. [Edge Functions](#edge-functions)
7. [Feature Implementation Guide](#feature-implementation-guide)
8. [Troubleshooting](#troubleshooting)

---

## ARCHITECTURE OVERVIEW

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      LOVABLE.DEV                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Frontend (React + TypeScript + Vite)                │  │
│  │  - UI Components (shadcn/ui + Tailwind CSS)         │  │
│  │  - State Management (React Query + Context)         │  │
│  │  - Routing (React Router)                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS API Calls
                            ├──────────────┐
                            ▼              ▼
┌───────────────────────────────┐   ┌─────────────────────┐
│       SUPABASE                │   │    PAYFAST          │
│                               │   │   (Payment Gateway) │
│  ┌─────────────────────────┐ │   └─────────────────────┘
│  │  PostgreSQL Database    │ │
│  │  - 58 Main Tables       │ │
│  │  - 6 Materialized Views │ │
│  │  - RLS Policies         │ │
│  └─────────────────────────┘ │
│                               │
│  ┌─────────────────────────┐ │
│  │  Edge Functions (Deno)  │ │
│  │  - 18 Serverless Funcs  │ │
│  │  - Webhooks             │ │
│  │  - Background Jobs      │ │
│  └─────────────────────────┘ │
│                               │
│  ┌─────────────────────────┐ │
│  │  Storage                │ │
│  │  - product-images       │ │
│  │  - user-uploads         │ │
│  └─────────────────────────┘ │
└───────────────────────────────┘
```

### Key Components

1. **Lovable.dev** - Frontend hosting & deployment
   - Auto-deploys on git push to main branch
   - Built-in preview deployments
   - Environment variable management
   - CDN distribution

2. **Supabase** - Backend as a Service
   - PostgreSQL database (managed)
   - Real-time subscriptions
   - Authentication & authorization
   - Edge Functions (Deno runtime)
   - File storage

3. **PayFast** - Payment processing
   - South African payment gateway
   - Supports cards, EFT, instant EFT
   - Webhook-based order confirmation

---

## DEVELOPMENT WORKFLOW

### Local Development Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/Iamabhih/ikhaya-new-home.git
   cd ikhaya-new-home
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Run Local Development Server**
   ```bash
   npm run dev
   # Opens on http://localhost:8080
   ```

### Working with Lovable.dev

**Important:** Lovable.dev provides a web-based IDE for rapid UI development.

#### Making Changes via Lovable.dev

1. **Open Project in Lovable.dev**
   - Navigate to https://lovable.dev
   - Select your project

2. **Make UI Changes**
   - Use natural language prompts to modify UI
   - Lovable generates React components
   - Changes sync to GitHub automatically

3. **Pull Changes Locally**
   ```bash
   git pull origin main
   ```

4. **Apply Database Migrations**
   ```bash
   supabase db push
   ```

#### Making Changes Locally (Traditional Development)

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Code Changes**
   - Edit components, add features
   - Create database migrations if needed

3. **Test Locally**
   ```bash
   npm run dev
   ```

4. **Commit & Push**
   ```bash
   git add .
   git commit -m "Add feature: description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Merge to main
   - Lovable.dev auto-deploys

---

## DEPLOYMENT PROCESS

### Automatic Deployment (Lovable.dev)

**Trigger:** Push to `main` branch

**Process:**
1. Code pushed to GitHub main branch
2. Lovable.dev webhook triggered
3. Frontend built (Vite build)
4. Assets deployed to CDN
5. Live site updated (~2 minutes)

**Deployment URL:** https://ikhayahomeware.online

### Manual Deployment Steps

If auto-deployment fails:

1. **Check Lovable.dev Dashboard**
   - View build logs
   - Check for errors

2. **Verify Environment Variables**
   - Lovable.dev dashboard → Settings → Environment Variables
   - Ensure all required variables are set

3. **Trigger Manual Deploy**
   - Lovable.dev dashboard → Deployments → Deploy Now

### Rollback Process

**If deployment breaks production:**

1. **Revert Git Commit**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Or Deploy Previous Version**
   - Lovable.dev dashboard → Deployments
   - Select previous deployment
   - Click "Redeploy"

---

## DATABASE MIGRATIONS

### Migration Files Location

```
supabase/migrations/
├── 20251224140000_audit_log_comprehensive_ecommerce.sql
├── 20251224150000_create_discount_codes_system.sql
├── 20251224150001_create_product_reviews_system.sql
├── 20251224150002_create_seo_metadata_system.sql
├── 20251224150003_create_all_remaining_features.sql
└── ... (140+ migration files)
```

### Applying Migrations

**Prerequisites:**
- Supabase CLI installed (`npm install -g supabase`)
- Supabase project linked

**Commands:**

```bash
# Link to Supabase project (first time only)
supabase link --project-ref your-project-ref

# View pending migrations
supabase migration list

# Apply all pending migrations
supabase db push

# Reset database (DANGER: deletes all data)
supabase db reset

# Create new migration
supabase migration new your_migration_name
```

### Migration Best Practices

1. **Always test migrations locally first**
   ```bash
   supabase start  # Start local Supabase
   supabase db push  # Apply to local
   ```

2. **Never edit existing migrations**
   - Create new migration instead
   - Use `ALTER TABLE` to modify

3. **Include rollback plan**
   ```sql
   -- Migration: Add column
   ALTER TABLE products ADD COLUMN new_field TEXT;

   -- Rollback (in separate file or comments):
   -- ALTER TABLE products DROP COLUMN new_field;
   ```

4. **Log all changes**
   ```sql
   INSERT INTO system_change_logs (
     change_type,
     change_description,
     table_name,
     metadata
   ) VALUES (
     'schema_change',
     'Added new_field to products table',
     'products',
     jsonb_build_object('migration_file', '20251224_add_field.sql')
   );
   ```

### Recently Applied Migrations (Dec 24, 2025)

| Migration | Feature | Tables Created | Status |
|-----------|---------|----------------|--------|
| `20251224150000` | Discount Codes | `discount_codes`, `discount_applications`, `automatic_discounts` | ✅ Ready |
| `20251224150001` | Product Reviews | `product_reviews`, `review_votes`, `review_reports` | ✅ Ready |
| `20251224150002` | SEO Metadata | `seo_metadata`, `url_redirects`, `sitemap_config` | ✅ Ready |
| `20251224150003` | Gift Cards, Collections, Loyalty | 11 tables total | ✅ Ready |

**To Apply:**
```bash
supabase db push
```

---

## ENVIRONMENT CONFIGURATION

### Frontend Environment Variables (Lovable.dev)

**Location:** Lovable.dev Dashboard → Settings → Environment Variables

**Required Variables:**

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# PayFast
VITE_PAYFAST_MODE=sandbox  # or 'live'
VITE_PAYFAST_MERCHANT_ID=13644558
VITE_PAYFAST_MERCHANT_KEY=u6ksewx8j6xzx

# Application
VITE_APP_URL=https://ikhayahomeware.online
```

**Setting Variables in Lovable.dev:**

1. Navigate to project settings
2. Click "Environment Variables"
3. Add each variable (name + value)
4. Save & redeploy

### Backend Environment Variables (Supabase)

**Location:** Supabase Dashboard → Settings → Edge Functions → Secrets

**Required Secrets:**

```bash
# PayFast (for webhook verification)
PAYFAST_PASSPHRASE=Khalid123@Ozz

# Email (if using email service)
SMTP_HOST=smtp.example.com
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Other services
SENTRY_DSN=your_sentry_dsn  # Optional: Error tracking
```

**Setting Secrets in Supabase:**

**Via Dashboard:**
1. Supabase Dashboard → Project Settings
2. Edge Functions → Secrets
3. Add secret (key + value)

**Via CLI:**
```bash
supabase secrets set PAYFAST_PASSPHRASE="Khalid123@Ozz"
supabase secrets set SMTP_HOST="smtp.example.com"

# View secrets
supabase secrets list
```

---

## EDGE FUNCTIONS

### Deployed Edge Functions

| Function | Purpose | Trigger | Status |
|----------|---------|---------|--------|
| `payfast-webhook` | Process payment webhooks | PayFast POST | ✅ Live |
| `process-order` | Create orders atomically | Internal | ✅ Live |
| `send-order-confirmation` | Email confirmations | Order created | ✅ Live |
| `track-cart-events` | Cart analytics | Cart changes | ✅ Live |
| `analyze-cart-abandonment` | Abandonment detection | Scheduled (hourly) | ✅ Live |
| `trigger-recovery-campaigns` | Send recovery emails | Scheduled (daily) | ✅ Live |
| `import-excel-products` | Bulk product import | Admin action | ✅ Live |
| `generate-sitemap` | XML sitemap | On-demand | 🟡 Pending |
| `send-review-request` | Review requests | Post-purchase | 🟡 Pending |
| `apply-loyalty-points` | Points calculation | Order complete | 🟡 Pending |

### Deploying Edge Functions

**All Functions:**
```bash
supabase functions deploy
```

**Single Function:**
```bash
supabase functions deploy payfast-webhook
```

**With Secrets:**
```bash
supabase secrets set MY_SECRET="value"
supabase functions deploy my-function
```

### Testing Edge Functions Locally

1. **Start Supabase Locally**
   ```bash
   supabase start
   supabase functions serve
   ```

2. **Test Function**
   ```bash
   curl -i --location --request POST \
     'http://localhost:54321/functions/v1/your-function' \
     --header 'Authorization: Bearer YOUR_ANON_KEY' \
     --header 'Content-Type: application/json' \
     --data '{"key":"value"}'
   ```

3. **View Logs**
   ```bash
   supabase functions logs your-function
   ```

### Creating New Edge Functions

1. **Generate Function**
   ```bash
   supabase functions new my-new-function
   ```

2. **Edit Function**
   ```typescript
   // supabase/functions/my-new-function/index.ts
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

   serve(async (req) => {
     const { name } = await req.json()
     return new Response(
       JSON.stringify({ message: `Hello ${name}!` }),
       { headers: { "Content-Type": "application/json" } }
     )
   })
   ```

3. **Deploy**
   ```bash
   supabase functions deploy my-new-function
   ```

---

## FEATURE IMPLEMENTATION GUIDE

### Implementing New Features (Lovable.dev + Supabase)

**Example: Adding Discount Codes Feature**

#### Step 1: Database Schema (Supabase)

1. Create migration file locally:
   ```bash
   supabase migration new create_discount_codes
   ```

2. Write SQL schema:
   ```sql
   CREATE TABLE discount_codes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     code TEXT UNIQUE NOT NULL,
     type TEXT NOT NULL,
     value DECIMAL(10,2),
     -- ... more columns
   );
   ```

3. Apply migration:
   ```bash
   supabase db push
   ```

#### Step 2: Backend Logic (Edge Functions)

1. Create edge function if needed:
   ```bash
   supabase functions new validate-discount
   ```

2. Implement logic:
   ```typescript
   // Validate discount code
   const { data, error } = await supabase
     .from('discount_codes')
     .select('*')
     .eq('code', code)
     .single()
   ```

3. Deploy:
   ```bash
   supabase functions deploy validate-discount
   ```

#### Step 3: Frontend UI (Lovable.dev)

**Option A: Via Lovable.dev (Recommended for UI)**

1. Open project in Lovable.dev
2. Use natural language prompt:
   > "Add a discount code input field to the checkout page. When user enters a code, validate it against the discount_codes table and show the discount amount."

3. Lovable generates:
   - React component
   - API integration
   - UI styling

4. Changes auto-sync to GitHub

**Option B: Manual Code (Traditional)**

1. Create component:
   ```tsx
   // src/components/checkout/DiscountCodeInput.tsx
   export const DiscountCodeInput = () => {
     const [code, setCode] = useState('')
     const { mutate: validateDiscount } = useMutation(...)

     return (
       <Input
         value={code}
         onChange={(e) => setCode(e.target.value)}
         placeholder="Enter discount code"
       />
     )
   }
   ```

2. Integrate with checkout:
   ```tsx
   import { DiscountCodeInput } from '@/components/checkout/DiscountCodeInput'

   // In CheckoutPage.tsx
   <DiscountCodeInput onApply={handleDiscountApplied} />
   ```

3. Commit & push to trigger deployment

#### Step 4: Test End-to-End

1. **Database:** Verify tables exist
   ```sql
   SELECT * FROM discount_codes LIMIT 1;
   ```

2. **Backend:** Test edge function
   ```bash
   curl https://your-project.supabase.co/functions/v1/validate-discount \
     -d '{"code":"TEST10"}'
   ```

3. **Frontend:** Test in browser
   - Navigate to checkout
   - Enter discount code
   - Verify application

#### Step 5: Monitor & Iterate

1. **Check Logs:**
   - Supabase: Dashboard → Logs
   - Lovable.dev: Dashboard → Build Logs

2. **Monitor Errors:**
   - Sentry (if configured)
   - Supabase error tracking

3. **Iterate:**
   - Fix bugs
   - Push changes
   - Auto-deploys

---

## TROUBLESHOOTING

### Common Issues & Solutions

#### 1. "Migration Failed: Column Already Exists"

**Problem:** Migration tries to create existing column

**Solution:**
```sql
-- Use IF NOT EXISTS
ALTER TABLE products
ADD COLUMN IF NOT EXISTS new_field TEXT;
```

#### 2. "Environment Variable Not Found"

**Problem:** `import.meta.env.VITE_SUPABASE_URL` is undefined

**Solution:**
- Check Lovable.dev: Settings → Environment Variables
- Variable names must start with `VITE_`
- Redeploy after adding variables

#### 3. "Supabase RLS Policy Denying Access"

**Problem:** Query returns empty despite data existing

**Solution:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Temporarily disable to test (DEV ONLY)
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;

-- Fix policy
CREATE POLICY "Users can view active items"
  ON your_table FOR SELECT
  USING (is_active = true);
```

#### 4. "PayFast Webhook Not Triggering"

**Problem:** Orders not created after payment

**Solution:**
1. Check webhook URL in PayFast dashboard
2. Should be: `https://your-project.supabase.co/functions/v1/payfast-webhook`
3. Check edge function logs:
   ```bash
   supabase functions logs payfast-webhook
   ```
4. Verify signature verification is correct

#### 5. "Lovable.dev Build Failing"

**Problem:** Deployment shows error

**Solution:**
1. Check build logs in Lovable.dev dashboard
2. Common issues:
   - TypeScript errors: Fix type errors
   - Missing dependencies: `npm install`
   - Environment variables: Add in dashboard

3. Test locally:
   ```bash
   npm run build
   # Should complete without errors
   ```

#### 6. "Database Connection Timeout"

**Problem:** Supabase queries hanging

**Solution:**
1. Check Supabase status: https://status.supabase.com
2. Verify connection pooling:
   ```typescript
   // Use connection pooling for edge functions
   const supabase = createClient(
     Deno.env.get('SUPABASE_URL'),
     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
     { db: { schema: 'public' } }
   )
   ```

3. Check for long-running queries in Supabase dashboard

---

## BEST PRACTICES

### Code Organization

```
src/
├── components/          # React components
│   ├── admin/          # Admin-only components
│   ├── checkout/       # Checkout flow
│   ├── products/       # Product display
│   └── ...
├── hooks/              # Custom React hooks
├── contexts/           # React contexts
├── pages/              # Page components (routes)
├── utils/              # Utility functions
├── integrations/       # API integrations
│   └── supabase/       # Supabase client
└── types/              # TypeScript types

supabase/
├── functions/          # Edge functions (Deno)
│   ├── payfast-webhook/
│   ├── process-order/
│   └── ...
└── migrations/         # Database migrations
    └── *.sql
```

### Git Workflow

1. **Main Branch:** Production-ready code only
2. **Feature Branches:** `feature/discount-codes`, `fix/cart-bug`
3. **Commit Messages:** Descriptive and clear
   ```
   ✅ "Add discount code validation to checkout"
   ❌ "update stuff"
   ```

4. **Pull Requests:** Always review before merging to main

### Performance Optimization

1. **Database Queries:**
   - Use indexes on frequently queried columns
   - Avoid N+1 queries (use JOINs)
   - Use materialized views for complex aggregations

2. **Frontend:**
   - Lazy load components: `React.lazy(() => import(...))`
   - Use React Query caching
   - Optimize images (WebP format)

3. **Edge Functions:**
   - Keep functions small and focused
   - Use Deno caching for dependencies
   - Implement timeouts

---

## ADDITIONAL RESOURCES

### Documentation Links

- **Lovable.dev Docs:** https://docs.lovable.dev
- **Supabase Docs:** https://supabase.com/docs
- **PayFast API:** https://developers.payfast.co.za
- **React Query:** https://tanstack.com/query
- **Tailwind CSS:** https://tailwindcss.com

### Support Channels

- **Lovable.dev:** support@lovable.dev
- **Supabase:** https://supabase.com/support
- **Project Issues:** https://github.com/Iamabhih/ikhaya-new-home/issues

---

**Last Updated:** December 24, 2025
**Document Version:** 1.0
**Maintainer:** Development Team
