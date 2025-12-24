# Lovable.dev + Supabase Integration Guide

This document explains how the Ikhaya Homeware platform is deployed and how to make changes using Lovable.dev + Supabase.

---

## Architecture Overview

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐      ┌──────────────┐
│  Lovable.dev    │←────→│   GitHub     │
│   (Frontend)    │      │  Repository  │
└────────┬────────┘      └──────────────┘
         │
         ↓
┌─────────────────┐
│    Supabase     │
│   (Backend)     │
│  - PostgreSQL   │
│  - Edge Funcs   │
│  - Storage      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│     PayFast     │
│ (Payment Gateway│
└─────────────────┘
```

---

## Deployment Flow

### 1. Code Changes

```bash
# Local development
git checkout -b feature/my-change
# Make changes...
git add .
git commit -m "Description of changes"
git push origin feature/my-change
```

### 2. Lovable.dev Auto-Deploy

When you push to your repository:

1. **GitHub** receives the push
2. **Lovable.dev** detects the change
3. **Automatic build** starts:
   - Installs dependencies (`npm install`)
   - Builds React app (`npm run build`)
   - Deploys to CDN
4. **Live in ~2 minutes**

**What Gets Deployed:**
- All React components (`src/components/`)
- All pages (`src/pages/`)
- All hooks (`src/hooks/`)
- All utilities (`src/utils/`)
- All styles (Tailwind CSS)
- Environment variables from Lovable.dev dashboard

---

### 3. Supabase Deployment (Manual)

**Database Migrations:**
```bash
# Apply new migrations
supabase db push

# Check migration status
supabase migration list
```

**Edge Functions:**
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy payfast-webhook
supabase functions deploy process-order

# Check function logs
supabase functions logs payfast-webhook --tail
```

**Secrets (One-Time Setup):**
```bash
# Set secrets for edge functions
supabase secrets set PAYFAST_PASSPHRASE="your_passphrase"
supabase secrets set PAYFAST_MODE="live"

# List secrets (values hidden)
supabase secrets list
```

---

## Environment Configuration

### Frontend Environment Variables (Lovable.dev)

**Location:** Lovable.dev Dashboard → Settings → Environment Variables

**Required Variables:**
```bash
VITE_SUPABASE_URL=https://kauostzhxqoxggwqgtym.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_PAYFAST_MODE=sandbox
VITE_PAYFAST_MERCHANT_ID=13644558
VITE_PAYFAST_MERCHANT_KEY=u6ksewx8j6xzx
VITE_SITE_URL=https://ikhayahomeware.online
```

**How to Update:**
1. Go to Lovable.dev project
2. Click **Settings** → **Environment Variables**
3. Add/edit variables
4. Click **Save**
5. Trigger **Rebuild** for changes to apply

**Important:** Environment variables are baked into the build. You MUST rebuild after changing them.

---

### Backend Environment Variables (Supabase)

**Location:** Supabase Dashboard → Settings → Edge Functions → Secrets

**Required Secrets:**
```bash
PAYFAST_MODE=live
PAYFAST_PASSPHRASE=Khalid123@Ozz
PAYFAST_MERCHANT_ID=13644558
PAYFAST_MERCHANT_KEY=u6ksewx8j6xzx
```

**How to Update:**
1. Go to Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Click **Secrets** tab
4. Add/edit secrets
5. Click **Save**
6. **Redeploy functions:** `supabase functions deploy`

---

## Common Workflows

### Making a Frontend Change

```bash
# 1. Create branch
git checkout -b fix/button-styling

# 2. Make changes to React components
vim src/components/ui/button.tsx

# 3. Test locally
npm run dev

# 4. Commit and push
git add .
git commit -m "Fix button styling"
git push origin fix/button-styling

# 5. Lovable.dev auto-deploys
# Wait ~2 minutes, then check live site
```

**No manual deployment needed!** Lovable.dev handles it.

---

### Making a Backend Change (Database)

```bash
# 1. Create migration file
supabase migration new add_order_notes_column

# 2. Edit migration file
vim supabase/migrations/20251224_add_order_notes_column.sql

# Add SQL:
ALTER TABLE orders ADD COLUMN notes TEXT;

# 3. Test locally
supabase db reset

# 4. Apply to production
supabase db push

# 5. Commit migration
git add supabase/migrations/
git commit -m "Add notes column to orders table"
git push
```

---

### Making a Backend Change (Edge Function)

```bash
# 1. Edit edge function
vim supabase/functions/payfast-webhook/index.ts

# 2. Test locally (if possible)
supabase functions serve payfast-webhook

# 3. Deploy to production
supabase functions deploy payfast-webhook

# 4. Watch logs
supabase functions logs payfast-webhook --tail

# 5. Commit code
git add supabase/functions/
git commit -m "Improve webhook logging"
git push
```

---

### Updating PayFast Configuration

**Scenario:** Need to switch from sandbox to live mode

**Steps:**

1. **Update Lovable.dev environment:**
   - Dashboard → Settings → Environment Variables
   - Change `VITE_PAYFAST_MODE` from `sandbox` to `live`
   - Click **Save**
   - Click **Rebuild**

2. **Update Supabase secrets:**
   - Dashboard → Settings → Edge Functions → Secrets
   - Change `PAYFAST_MODE` from `sandbox` to `live`
   - Click **Save**
   - Redeploy: `supabase functions deploy payfast-webhook`

3. **Verify in code:**
   ```typescript
   // Should now use live credentials
   console.log('PayFast mode:', import.meta.env.VITE_PAYFAST_MODE); // 'live'
   ```

---

## Debugging

### Frontend Issues

**Check Lovable.dev Build Logs:**
1. Go to Lovable.dev dashboard
2. Click **Deployments**
3. Find latest deployment
4. View build logs

**Check Browser Console:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors
4. Check Network tab for failed API calls

**Common Issues:**
- **Environment variables not found:** Rebuild after adding variables
- **API calls fail:** Check Supabase URL/keys
- **PayFast redirect fails:** Check VITE_PAYFAST_MODE

---

### Backend Issues

**Check Edge Function Logs:**
```bash
# Real-time logs
supabase functions logs payfast-webhook --tail

# Last 100 lines
supabase functions logs payfast-webhook --limit 100

# Specific time range
supabase functions logs payfast-webhook --since "2025-12-24 10:00:00"
```

**Check Database Logs:**
1. Supabase Dashboard → Logs → Database
2. Filter by timestamp
3. Look for errors or slow queries

**Check payment_logs Table:**
```sql
SELECT *
FROM payment_logs
WHERE event_type IN ('processing_failed', 'order_failed', 'signature_failed')
ORDER BY created_at DESC
LIMIT 20;
```

**Common Issues:**
- **Webhook signature failed:** Check PAYFAST_PASSPHRASE secret
- **Order creation failed:** Check create_order_transaction function
- **Stock errors:** Check stock_movements table
- **Email send failed:** Check send-order-confirmation function

---

## Monitoring

### Key Metrics to Watch

**Payment Success Rate:**
```sql
SELECT
  event_type,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM payment_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;
```

**Order Creation Success Rate:**
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'confirmed') as successful,
  COUNT(*) FILTER (WHERE status IN ('payment_failed', 'cancelled')) as failed
FROM orders
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Stock Mismatches:**
```sql
SELECT
  p.id,
  p.name,
  p.stock_quantity,
  COALESCE(SUM(sm.quantity_change), 0) as total_movements,
  p.stock_quantity - COALESCE(SUM(sm.quantity_change), 0) as discrepancy
FROM products p
LEFT JOIN stock_movements sm ON p.id = sm.product_id
GROUP BY p.id, p.name, p.stock_quantity
HAVING p.stock_quantity - COALESCE(SUM(sm.quantity_change), 0) != 0;
```

---

## Rollback Procedures

### Rollback Frontend (Lovable.dev)

**Option 1: Revert Git Commit**
```bash
git revert <bad-commit-hash>
git push
# Lovable.dev auto-deploys reverted code
```

**Option 2: Redeploy Previous Version**
1. Go to Lovable.dev Dashboard → Deployments
2. Find previous working deployment
3. Click **Redeploy**

---

### Rollback Backend (Database)

```bash
# Revert last migration
supabase migration down

# Revert specific migration
supabase migration down 20251224120001

# Push to production
supabase db push
```

---

### Rollback Backend (Edge Function)

```bash
# Revert code in git
git checkout <previous-commit-hash> -- supabase/functions/payfast-webhook/

# Redeploy
supabase functions deploy payfast-webhook

# Verify
supabase functions logs payfast-webhook --tail
```

---

## Emergency Procedures

### Site is Down

1. **Check Lovable.dev Status:**
   - Go to Lovable.dev dashboard
   - Check deployment status
   - View build logs

2. **Check Supabase Status:**
   - Go to Supabase dashboard
   - Check database status
   - Check edge function status

3. **Quick Fixes:**
   - Redeploy last known good version
   - Restart edge functions
   - Check environment variables

---

### Payments Not Processing

1. **Check PayFast Status:**
   - Login to PayFast dashboard
   - Check for service issues
   - Verify merchant account is active

2. **Check Webhook:**
   ```bash
   # Check webhook logs
   supabase functions logs payfast-webhook --tail

   # Check payment_logs
   psql $DATABASE_URL -c "SELECT * FROM payment_logs WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC;"
   ```

3. **Check Configuration:**
   - Verify PAYFAST_MODE matches environment
   - Verify webhook URL in PayFast dashboard
   - Verify credentials are correct

4. **Manual Recovery:**
   ```bash
   # Use reconcile-payment function
   supabase functions invoke reconcile-payment --body '{"action":"list_orphaned"}'
   ```

---

## Best Practices

### Development

✅ **DO:**
- Always create feature branches
- Test locally before pushing
- Use meaningful commit messages
- Update CHANGELOG.md
- Add comments to complex code
- Write migration files for schema changes

❌ **DON'T:**
- Push directly to main
- Hardcode credentials
- Skip testing
- Make database changes without migrations
- Delete old migrations

---

### Deployment

✅ **DO:**
- Deploy during low-traffic periods
- Monitor logs after deployment
- Test in sandbox before production
- Keep backups of database
- Document all changes

❌ **DON'T:**
- Deploy on Black Friday/high traffic days
- Deploy without testing
- Skip environment variable updates
- Forget to redeploy edge functions after secret changes

---

## Helpful Commands

```bash
# Local development
npm run dev                          # Start dev server
npm run build                        # Build for production
npm run test                         # Run tests

# Supabase local
supabase start                       # Start local Supabase
supabase db reset                    # Reset local database
supabase functions serve             # Serve functions locally

# Supabase production
supabase db push                     # Push migrations
supabase functions deploy            # Deploy all functions
supabase functions deploy <name>    # Deploy specific function
supabase secrets list                # List secrets (values hidden)
supabase secrets set KEY=value       # Set secret

# Git
git status                           # Check status
git log --oneline -10                # Last 10 commits
git diff HEAD^ HEAD                  # Compare last commit

# Database queries
psql $DATABASE_URL                   # Connect to database
supabase db dump -f backup.sql       # Backup database
```

---

## Resources

- **Lovable.dev Docs:** https://docs.lovable.dev/
- **Supabase Docs:** https://supabase.com/docs
- **PayFast API:** https://developers.payfast.co.za/
- **React Docs:** https://react.dev/
- **Tailwind CSS:** https://tailwindcss.com/docs

---

## Support

**For Platform Issues:**
- Lovable.dev Support: support@lovable.dev
- Supabase Support: support@supabase.com
- PayFast Support: support@payfast.co.za

**For Code Issues:**
- Check `/AUDIT_REPORT.md` for known issues
- Check `/docs/implementation/` for fix guides
- Review payment_logs for payment issues
- Check Supabase logs for backend errors

---

**Last Updated:** 2025-12-24
**Platform Versions:**
- Lovable.dev: Latest
- Supabase: Postgres 15
- React: 18.3.1
- Node: 18.x+
