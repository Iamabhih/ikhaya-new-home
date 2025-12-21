# AI Assistant Context for OZZ Cash & Carry E-Commerce Platform

**Purpose:** This document provides context for AI assistants (lovable.dev AI, Claude, etc.) when working with this codebase.

**Last Updated:** December 21, 2025

---

## 📋 Project Overview

### What This Is
A **production-grade full-stack e-commerce platform** for OZZ Cash & Carry, a South African wholesale homeware business.

### Architecture
- **Frontend**: React 18 + TypeScript, hosted on **lovable.dev**
- **Backend**: **Supabase** (PostgreSQL + Edge Functions + Storage)
- **Payments**: **PayFast** (South African payment gateway)

### Key Stats
- **Files**: 499+ files
- **Code**: ~65,623 lines TypeScript/TSX
- **Database**: 105 SQL migrations
- **Edge Functions**: 22 serverless functions
- **Dependencies**: 71 production + 13 dev

---

## 🎯 Critical Guidelines

### ⚠️ MUST FOLLOW

#### 1. **Environment Variables**
```typescript
// ✅ ALWAYS use environment variables for secrets
const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ❌ NEVER hardcode credentials
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // DON'T DO THIS!
```

**Required Prefix**: All environment variables MUST start with `VITE_` to be accessible in frontend.

**Location**:
- Development: `.env` (NOT in git!)
- Production: lovable.dev project settings → Environment Variables

#### 2. **TypeScript Strict Mode**
```typescript
// ✅ Use explicit types
const user: User | null = await getUser();

// ❌ Avoid 'any' type
const user: any = await getUser(); // DON'T DO THIS!
```

**Status**: Strict mode is being incrementally enabled. All new code MUST have explicit types.

#### 3. **No Console Logs in Production**
```typescript
// ✅ Use logger
import { logger } from '@/utils/logger';
logger.debug('User logged in', userId);

// ❌ Direct console.log
console.log('User logged in', userId); // DON'T DO THIS!
```

**Reason**: Console logs expose sensitive data in production.

#### 4. **Secure ID Generation**
```typescript
// ✅ Cryptographically secure
const orderId = crypto.randomUUID();

// ❌ Weak random
const orderId = Math.floor(Math.random() * 1000000).toString(); // DON'T DO THIS!
```

#### 5. **Payment Flow - Keep It Simple**
The PayFast integration uses **simple HTML form submission** - do NOT add signature generation or complex encryption.

```typescript
// ✅ Current working implementation (keep as-is)
<form action="https://www.payfast.co.za/eng/process" method="post">
  <input type="hidden" name="merchant_id" value={config.MERCHANT_ID} />
  <input type="hidden" name="amount" value={amount} />
  {/* ... other fields ... */}
</form>

// ❌ Don't add signature generation
// PayFast handles this on their end for simple integrations
```

**File**: `src/components/checkout/PayFastForm.tsx` - This works, don't change it!

---

## 🏗️ Architecture Patterns

### Frontend Structure
```
src/
├── components/          # React components
│   ├── admin/          # Admin dashboard (104 files)
│   ├── ui/             # shadcn/ui components (60+ files)
│   ├── common/         # Reusable components
│   ├── products/       # Product-related
│   ├── checkout/       # Checkout flow
│   └── ...
├── hooks/              # Custom React hooks (33 hooks)
├── contexts/           # React Context providers (6 contexts)
├── pages/              # Route components
├── utils/              # Utility functions
├── services/           # Business logic
├── integrations/       # Third-party integrations
│   └── supabase/       # Supabase client
└── styles/             # Global styles
```

### State Management Strategy
```typescript
// Server State: React Query
import { useQuery, useMutation } from '@tanstack/react-query';

const { data: products } = useQuery({
  queryKey: ['products'],
  queryFn: () => supabase.from('products').select('*')
});

// Client State: React Context
import { useCart } from '@/contexts/CartContext';
const { items, addItem } = useCart();

// Form State: React Hook Form
import { useForm } from 'react-hook-form';
const { register, handleSubmit } = useForm();
```

### Common Hooks You'll Use
```typescript
// Authentication
import { useAuth } from '@/contexts/AuthContext';
const { user, session, signOut } = useAuth();

// Cart Operations
import { useCart } from '@/hooks/useCart';
const { items, addToCart, removeFromCart, clearCart } = useCart();

// Supabase Access
import { supabase } from '@/integrations/supabase/client';
const { data, error } = await supabase.from('products').select('*');

// Analytics
import { useAnalytics } from '@/hooks/useAnalytics';
const { trackEvent, trackCartAdd } = useAnalytics();
```

---

## 🔐 Security Patterns

### Input Sanitization
```typescript
import { sanitizeText, sanitizeEmail, sanitizeHtml } from '@/utils/security';

// User input
const name = sanitizeText(formData.name);
const email = sanitizeEmail(formData.email);

// HTML content (admin-generated)
const description = sanitizeHtml(productDescription);
```

### File Upload Validation
```typescript
import { validateFileUpload } from '@/utils/security';

const isValid = validateFileUpload(
  file,
  ['image/jpeg', 'image/png', 'image/webp'],
  5 * 1024 * 1024 // 5MB max
);
```

### Rate Limiting
```typescript
import { RateLimiter } from '@/utils/security';

const limiter = new RateLimiter(5, 60000); // 5 attempts per minute

if (!limiter.isAllowed(userEmail)) {
  toast.error('Too many attempts. Please try again later.');
  return;
}
```

---

## 💾 Database Patterns

### Querying with RLS
```typescript
// RLS (Row Level Security) automatically filters based on user
const { data: myOrders } = await supabase
  .from('orders')
  .select('*')
  .eq('user_id', user.id); // RLS enforces this automatically

// Admin queries (bypass RLS with service role key - only in edge functions!)
const supabaseAdmin = createClient(url, serviceRoleKey);
const { data: allOrders } = await supabaseAdmin.from('orders').select('*');
```

### Real-time Subscriptions
```typescript
useEffect(() => {
  const channel = supabase
    .channel('order-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      console.log('Order updated:', payload);
      queryClient.invalidateQueries(['orders']);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);
```

### Inserting Data
```typescript
// Single insert
const { data, error } = await supabase
  .from('products')
  .insert({
    name: 'New Product',
    price: 99.99,
    category_id: categoryId
  })
  .select()
  .single();

// Bulk insert
const { data, error } = await supabase
  .from('products')
  .insert([
    { name: 'Product 1', price: 10 },
    { name: 'Product 2', price: 20 }
  ]);
```

---

## 🚀 Common Tasks

### Adding a New Feature Component

```typescript
// 1. Create component file
// src/components/features/NewFeature.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface NewFeatureProps {
  title: string;
  onAction: () => void;
}

export const NewFeature = ({ title, onAction }: NewFeatureProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async () => {
    setIsLoading(true);
    try {
      await onAction();
      toast.success('Action completed successfully');
    } catch (error) {
      toast.error('Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleAction} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Execute Action'}
        </Button>
      </CardContent>
    </Card>
  );
};

// 2. Use in a page
import { NewFeature } from '@/components/features/NewFeature';

function MyPage() {
  return (
    <div>
      <NewFeature
        title="My Feature"
        onAction={() => console.log('Action!')}
      />
    </div>
  );
}
```

### Adding a New Database Table

```sql
-- 1. Create migration file
-- supabase/migrations/YYYYMMDD_HHMMSS_create_my_table.sql

CREATE TABLE IF NOT EXISTS public.my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own records"
  ON public.my_table FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own records"
  ON public.my_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records"
  ON public.my_table FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_my_table_user_id ON public.my_table(user_id);

-- Updated at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.my_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

```typescript
// 2. Update TypeScript types (auto-generated)
// Run: supabase gen types typescript --project-id kauostzhxqoxggwqgtym

// 3. Create hook for table
// src/hooks/useMyTable.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMyTable = () => {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['my_table'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const addItem = useMutation({
    mutationFn: async (item: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('my_table')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_table'] });
      toast.success('Item added successfully');
    }
  });

  return { items, isLoading, addItem };
};
```

### Adding a New Edge Function

```typescript
// 1. Create function
// supabase/functions/my-function/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request
    const { param1, param2 } = await req.json();

    // Business logic here
    const result = await performAction(param1, param2);

    // Return response
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function performAction(param1: string, param2: string) {
  // Implementation
  return { result: 'success' };
}
```

```bash
# 2. Deploy function
supabase functions deploy my-function

# 3. Set secrets (if needed)
supabase secrets set MY_API_KEY=your_key_here
```

```typescript
// 4. Call from frontend
const { data, error } = await supabase.functions.invoke('my-function', {
  body: { param1: 'value1', param2: 'value2' }
});
```

---

## 🎨 UI/UX Patterns

### Using shadcn/ui Components
```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

// Example usage
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here.
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button onClick={handleSave}>Save Changes</Button>
    </div>
  </DialogContent>
</Dialog>
```

### Toast Notifications
```typescript
import { toast } from 'sonner';

// Success
toast.success('Product added to cart');

// Error
toast.error('Failed to update product');

// Warning
toast.warning('Stock is running low');

// Info
toast.info('Check your email for order confirmation');

// Loading
const toastId = toast.loading('Processing payment...');
// Later: toast.success('Payment successful', { id: toastId });
```

### Loading States
```typescript
import { Skeleton } from '@/components/ui/skeleton';

function ProductCard({ isLoading, product }) {
  if (isLoading) {
    return (
      <Card>
        <Skeleton className="h-48 w-full" />
        <CardContent className="space-y-2 pt-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <img src={product.image} alt={product.name} />
      <CardContent>
        <h3>{product.name}</h3>
        <p>{product.price}</p>
      </CardContent>
    </Card>
  );
}
```

---

## 🐛 Error Handling

### Component Error Boundaries
```typescript
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

function MyPage() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### Async Error Handling
```typescript
async function fetchData() {
  try {
    const { data, error } = await supabase.from('products').select('*');

    if (error) {
      logger.error('Failed to fetch products', error);
      toast.error('Failed to load products');
      throw error;
    }

    return data;
  } catch (error) {
    // Handle network errors, etc.
    logger.error('Unexpected error', error);
    throw error;
  }
}
```

---

## 📊 Analytics Integration

### Tracking Events
```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function ProductPage({ product }) {
  const { trackEvent, trackCartAdd } = useAnalytics();

  const handleAddToCart = () => {
    trackCartAdd(product.id, product.price, 1);
    // ... add to cart logic
  };

  const handleViewDetails = () => {
    trackEvent('product_view', {
      product_id: product.id,
      product_name: product.name,
      category: product.category
    });
  };

  // ...
}
```

---

## 🔍 Debugging Tips

### Enable Debug Logging
```typescript
// Set in .env
VITE_DEBUG_MODE=true

// Use in code
import { logger } from '@/utils/logger';

if (import.meta.env.VITE_DEBUG_MODE) {
  logger.debug('Detailed debug info', { data });
}
```

### React Query DevTools
```typescript
// src/App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Supabase Query Logging
```typescript
const { data, error } = await supabase
  .from('products')
  .select('*')
  .explain(); // Shows query execution plan

console.log(data); // See the explain output
```

---

## ⚡ Performance Optimization

### Code Splitting
```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function MyPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Image Optimization
```typescript
// Use progressive loading
<img
  src={imageUrl}
  alt={alt}
  loading="lazy"
  decoding="async"
  className="blur-up" // Add blur effect while loading
/>
```

### Query Optimization
```typescript
// Use select to limit fields
const { data } = await supabase
  .from('products')
  .select('id, name, price') // Only fetch needed fields
  .eq('category_id', categoryId)
  .limit(20); // Paginate results

// Use React Query caching
const { data } = useQuery({
  queryKey: ['products', categoryId],
  queryFn: fetchProducts,
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
});
```

---

## 📦 Deployment Checklist

### Before Deploying
- [ ] All tests passing (once implemented)
- [ ] No console.log statements (use logger)
- [ ] Environment variables set in lovable.dev
- [ ] TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Bundle size acceptable (<500KB gzipped)

### Deployment Process
```bash
# 1. Commit changes
git add .
git commit -m "feat: add new feature"

# 2. Push to main (triggers lovable.dev deployment)
git push origin main

# 3. Deploy Supabase migrations (if any)
supabase db push

# 4. Deploy edge functions (if changed)
supabase functions deploy

# 5. Verify deployment
# - Check lovable.dev dashboard
# - Test critical flows (auth, checkout, admin)
# - Monitor error logs
```

---

## 🆘 Common Issues & Solutions

### Issue: "Environment variable undefined"
**Solution:**
```typescript
// Check variable name has VITE_ prefix
const apiKey = import.meta.env.VITE_API_KEY; // ✅
const apiKey = import.meta.env.API_KEY;      // ❌ Won't work!

// Check variable is set in lovable.dev
// Settings → Environment Variables → Add variable
```

### Issue: "Type error: Type 'X' is not assignable to type 'Y'"
**Solution:**
```typescript
// Add explicit type annotation
const user: User | null = data; // ✅

// Or use type assertion (use sparingly!)
const user = data as User; // ⚠️ Use only when you're certain
```

### Issue: "Supabase query returns null"
**Solution:**
```typescript
// Check RLS policies are configured
// Check user is authenticated
// Check query filters are correct

const { data, error } = await supabase
  .from('products')
  .select('*');

console.log('Error:', error); // Check for errors
console.log('Data:', data);   // Check data structure
```

### Issue: "PayFast payment not processing"
**Solution:**
1. Check merchant credentials in environment variables
2. Verify webhook URL is accessible
3. Check PayFast merchant dashboard for errors
4. Review `payment_logs` table in Supabase

```sql
SELECT * FROM payment_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📚 Key Files Reference

### Critical Files (Don't Break These!)
- `src/components/checkout/PayFastForm.tsx` - PayFast payment form
- `src/integrations/supabase/client.ts` - Supabase client initialization
- `src/contexts/AuthContext.tsx` - Authentication context
- `src/hooks/useCart.ts` - Cart operations
- `supabase/functions/payfast-webhook/index.ts` - Payment webhook handler

### Configuration Files
- `.env` - Environment variables (NOT in git!)
- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.app.json` - TypeScript configuration
- `supabase/config.toml` - Supabase configuration

### Documentation Files
- `README.md` - Project overview
- `CODEBASE_AUDIT_REPORT.md` - Security audit
- `IMPLEMENTATION_PLAN.md` - Fix implementation guide
- `CHANGELOG.md` - Version history
- `PROMPT.md` - This file!

---

## 🎓 Learning Resources

### Internal Documentation
- Review `CODEBASE_AUDIT_REPORT.md` for known issues
- Review `IMPLEMENTATION_PLAN.md` for fix patterns
- Review `CHANGELOG.md` for recent changes

### External Resources
- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [PayFast Integration Guide](https://www.payfast.co.za/integration/shopping-carts/)
- [Vite Docs](https://vitejs.dev)

---

## ✅ Quick Checklist for AI Assistants

When making changes to this codebase:

- [ ] Use environment variables for all secrets (prefix: `VITE_`)
- [ ] Avoid `any` type, use explicit types
- [ ] Use `logger` instead of `console.log`
- [ ] Use `crypto.randomUUID()` for ID generation
- [ ] Don't modify PayFast form submission logic
- [ ] Add tests for business logic (once testing is set up)
- [ ] Use React Query for server state
- [ ] Use React Context for client state
- [ ] Follow existing file structure and naming conventions
- [ ] Add proper error handling
- [ ] Use toast notifications for user feedback
- [ ] Validate user input with security utilities
- [ ] Check RLS policies when adding database queries
- [ ] Update TypeScript types when changing database schema
- [ ] Document complex logic with comments
- [ ] Test changes locally before deploying

---

## 🚀 Ready to Start?

1. **Read** `CODEBASE_AUDIT_REPORT.md` to understand known issues
2. **Review** `IMPLEMENTATION_PLAN.md` for implementation patterns
3. **Check** `CHANGELOG.md` for recent changes
4. **Follow** patterns in this document
5. **Test** thoroughly before committing
6. **Deploy** via Git push to lovable.dev

---

**Questions?** Review the documentation files or ask for clarification!

**Making changes?** Follow the patterns in this document and test thoroughly.

**Found an issue?** Document it in `CHANGELOG.md` and create a fix plan.

---

**Happy coding! 🎉**
