# Fix URL Mismatch - Step-by-Step Execution Plan

## Immediate Actions (DO NOW)

### Step 1: Verify Vercel Environment Variables
1. Go to: https://vercel.com/dashboard
2. Click your project: `build-fast-chat`
3. Go to **Settings** → **Environment Variables**
4. Check `VITE_SUPABASE_URL`:
   - **Must be:** `https://xtdptfdejwzzececifvx.supabase.co`
   - **NOT:** `https://xtdptfdzjwjzzececfvx.supabase.co` (old)
5. Check `VITE_SUPABASE_ANON_KEY` matches your `.env` file
6. **If wrong**: Delete old variables, add correct ones
7. **If correct**: Proceed to Step 2

### Step 2: Force Vercel Redeploy with Fresh Build
1. In Vercel dashboard, go to **Deployments** tab
2. Find the latest deployment
3. Click **"..."** (three dots) menu
4. Click **"Redeploy"**
5. **CRITICAL**: Turn OFF **"Use existing Build Cache"**
6. Click **"Redeploy"**
7. Wait 2-5 minutes for deployment to complete

### Step 3: Clear Browser Cache
1. Open your deployed site: `build-fast-chat-9v8v.vercel.app`
2. Open Developer Console (F12)
3. Go to **Application** tab → **Storage** → **Clear site data**
4. **OR** do hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
5. Close and reopen the browser

### Step 4: Verify Fix
1. Navigate to `/signup` page
2. Open DevTools → Network tab
3. Fill form and submit
4. Check Network tab for Supabase requests
5. **Verify URL**: Should be `xtdptfdejwzzececifvx.supabase.co` (NOT the old one)
6. If still showing old URL → Repeat Step 2 and Step 3

## Alternative: Update via CLI

If dashboard doesn't work, use Vercel CLI:

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login
vercel login

# Link project
cd /Users/yusufdiallo/Desktop/buildfast/ChatApp
vercel link

# Set environment variables
vercel env add VITE_SUPABASE_URL production
# When prompted, paste: https://xtdptfdejwzzececifvx.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# When prompted, paste your anon key from .env

# Redeploy
vercel --prod
```

## If Issue Persists

### Check 1: Verify Supabase Project is Active
1. Go to: https://supabase.com/dashboard
2. Verify project `xtdptfdejwzzececifvx` is **green/active**
3. If paused → Restore it

### Check 2: Test Connection Directly
Open browser console and run:
```javascript
fetch('https://xtdptfdejwzzececifvx.supabase.co/rest/v1/', {
  method: 'HEAD',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0ZHB0ZmRland6emVjZWNpZnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODgwMzksImV4cCI6MjA3NzA2NDAzOX0.1PwU0D4eG3SMUVLvFkQdkdfhyrcbUD7DbwFjJslCVdI'
  }
}).then(r => console.log('✅ Connected:', r.status)).catch(e => console.error('❌ Error:', e))
```

### Check 3: Verify Build Output
1. Check Vercel build logs
2. Look for environment variable injection
3. Verify no old URLs in build output

## Success Criteria

✅ Console shows: `xtdptfdejwzzececifvx.supabase.co` (correct URL)
✅ Network requests succeed (200 or 401, NOT DNS errors)
✅ Signup form works without "Failed to fetch"
✅ User can successfully create account

## Prevention

To prevent this in the future:
1. Always update Vercel env vars when updating `.env` locally
2. Use Vercel CLI for consistency between local and production
3. Clear browser cache after major deployments
4. Test deployed site, not just local dev server

