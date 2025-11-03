# Check Supabase Project Status

## Critical Issue Detected
Your Supabase URL `https://xtdptfdzjwjzzececfvx.supabase.co` is returning `DNS_PROBE_FINISHED_NXDOMAIN`.

**This means your Supabase project is PAUSED or DELETED.**

## How to Check and Fix

### Step 1: Verify Project Status
1. Go to: **https://supabase.com/dashboard**
2. Sign in to your account
3. Look for project with reference: `xtdptfdzjwjzzececfvx`
4. Check the status indicator

### Step 2A: If Project Shows "Paused" ⏸️
**Action Required:**
1. Click on the paused project
2. Click **"Restore Project"** or **"Resume"** button
3. Wait 2-5 minutes for restoration
4. Verify status changes to "Active" ✅
5. Refresh your app and try again

### Step 2B: If Project is Missing/Deleted ❌
**You need to create a new project:**

1. **Create New Project:**
   - Click "New Project" in Supabase dashboard
   - Follow the setup wizard
   - Wait for project to initialize (2-3 minutes)

2. **Get New Credentials:**
   - Go to **Settings** → **API**
   - Copy the **Project URL** (format: `https://xxxxx.supabase.co`)
   - Copy the **anon public** key (long JWT token)

3. **Update Environment Variables:**
   - Update `.env` file:
     ```env
     VITE_SUPABASE_URL=https://your-new-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=your-new-anon-key-here
     ```

4. **Redeploy:**
   - If using Vercel, add these as environment variables in Vercel dashboard
   - Redeploy your application

### Step 2C: If You See Different Project ID
**Your `.env` file might have wrong credentials:**
1. Check Supabase dashboard for your actual project URL
2. Compare with `.env` file
3. Update `.env` with correct credentials

## Quick Test

After fixing, test if the URL resolves:
1. Try opening: `https://xtdptfdzjwjzzececfvx.supabase.co/rest/v1/` in browser
2. If you see a Supabase response (even 401) → Project is active ✅
3. If you see DNS error → Still paused/deleted ❌

## Why This Happens
- **Free Tier**: Supabase pauses projects after 7 days of inactivity
- **Solution**: Restore project in dashboard (takes 2-5 minutes)

## After Fixing
Once project is restored/created:
1. Wait 2-5 minutes for full restoration
2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Try signup again
4. The signup should work now!

## Verify It's Working
Check browser console - you should see:
- ✅ No `ERR_NAME_NOT_RESOLVED` errors
- ✅ Supabase API calls return responses (even if 401)
- ✅ Signup form works correctly

