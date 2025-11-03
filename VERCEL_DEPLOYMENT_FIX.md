# Vercel 404 Fix - Deployment Instructions

## Problem
Getting 404 "Deployment Not Found" when refreshing pages like `/login`, `/signup`, `/chat`.

## Solution
The `vercel.json` file has been updated with the correct SPA rewrite rules.

## Steps to Fix

### 1. Verify vercel.json is correct
```bash
cat vercel.json
```

Should show:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. Commit and Push
```bash
git add vercel.json
git commit -m "Fix Vercel SPA routing - 404 on refresh"
git push origin main
```

### 3. Redeploy on Vercel

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project: `build-fast-chat-mu`
3. Go to **Deployments** tab
4. Click **Redeploy** on the latest deployment (or it will auto-deploy after git push)
5. Make sure **"Use existing Build Cache"** is **OFF** (unchecked)
6. Click **Redeploy**

**Option B: Via Vercel CLI**
```bash
cd /Users/yusufdiallo/Desktop/buildfast/ChatApp
npx vercel --prod --force
```

### 4. Verify Vercel Project Settings

Go to: **Vercel Dashboard → Your Project → Settings → General**

Ensure these settings:
- **Framework Preset**: `Vite` (or `Other`)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Root Directory**: (leave empty or `.`)
- **Install Command**: `npm install`

### 5. Test the Fix

After redeployment:
1. Visit: `https://build-fast-chat-mu.vercel.app/`
2. Navigate to `/login` or `/signup`
3. **Hard refresh the page** (Cmd+Shift+R or Ctrl+Shift+R)
4. Should **NOT** show 404 error

### 6. If Still Not Working

**Check Deployment Logs:**
1. Go to Vercel Dashboard → Deployments
2. Click on the latest deployment
3. Check **Build Logs** and **Runtime Logs**
4. Look for any errors

**Force Clear Cache:**
1. In Vercel Dashboard → Settings → General
2. Scroll to bottom
3. Click **Clear Build Cache**
4. Redeploy

**Verify vercel.json is in deployment:**
1. Check deployment logs for: `Using vercel.json`
2. If not found, the file might not be in the root directory

## Why This Works

The `vercel.json` rewrite rule tells Vercel:
- For ANY route (like `/login`, `/chat`, etc.)
- Serve `/index.html` instead
- React Router then handles client-side routing

Without this, Vercel tries to find a file at `/login/index.html` which doesn't exist, causing 404.

## Troubleshooting

If you still get 404:
1. Check browser console for errors
2. Verify `vercel.json` is in the root directory where Vercel deploys from
3. Ensure you're not deploying from a subdirectory (check Root Directory setting)
4. Try accessing the site with a hard refresh or incognito mode
5. Check if Vercel is using an old cached build

