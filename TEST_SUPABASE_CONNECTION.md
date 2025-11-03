# Testing Your Supabase Connection

## The Problem
Your Supabase URL `https://xtdptfdzjwjzzececfvx.supabase.co` is not resolving (`net::ERR_NAME_NOT_RESOLVED`).

## This Means:
1. **Project is paused** (most common - Supabase pauses free tier projects after 7 days of inactivity)
2. **Project was deleted**
3. **Project ID is incorrect**

## Quick Fix Steps:

### Step 1: Check Project Status
1. Go to https://supabase.com/dashboard
2. Look for project `xtdptfdzjwjzzececfvx`
3. Check if it shows:
   - ✅ **Active** - Project is running
   - ⏸️ **Paused** - Need to restore it
   - ❌ **Deleted** - Project no longer exists

### Step 2A: If Project is PAUSED
1. Click on the paused project
2. Click "Restore" or "Resume Project"
3. Wait 2-5 minutes for it to restore
4. Verify it's now "Active"
5. **Refresh your browser** and try again

### Step 2B: If Project is DELETED or NOT FOUND
You need to create a new project or use an existing one:

1. Go to https://supabase.com/dashboard
2. Click "New Project" (or use an existing active project)
3. Get the NEW credentials:
   - Go to **Settings** → **API**
   - Copy the **Project URL**
   - Copy the **anon public** key
4. Update your `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-new-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-new-anon-key-here
   ```
5. **Restart your dev server** (Ctrl+C, then `npm run dev`)

### Step 3: Verify Connection
After updating, test in browser console:
```javascript
console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
```

## Still Not Working?

The most common issue is a **paused project**. Supabase automatically pauses free tier projects after inactivity to save resources. Simply restore it in the dashboard!

**The error is NOT in your code - it's that the Supabase server is not accessible/active.**

