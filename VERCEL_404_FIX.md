# Fix Vercel 404 Error on Refresh

## Problem
Getting 404 error page when hard refreshing routes like `/signup`, `/login`, etc.

## Solution Applied

1. **Updated vercel.json** - Simplified to use only rewrites (recommended for Vite)
2. **Added catch-all route** - App.jsx already has `<Route path="*" element={<Navigate to="/" replace />} />`
3. **Created .vercelignore** - Prevents unnecessary files from being deployed

## Next Steps

### Option 1: Redeploy on Vercel (RECOMMENDED)
1. Go to Vercel Dashboard → Your Project
2. Go to Settings → General
3. Make sure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Go to Deployments tab
5. Click "..." on latest deployment → **Redeploy**
6. **TURN OFF** "Use existing Build Cache"
7. Click "Redeploy"
8. Wait 2-5 minutes

### Option 2: Push to GitHub (if connected)
```bash
git add vercel.json .vercelignore
git commit -m "Fix Vercel routing for SPA"
git push origin main
```

Vercel will automatically redeploy.

## Verification

After redeploy:
1. Go to your site (e.g., `build-fast-chat-9v8v.vercel.app`)
2. Navigate to `/signup`
3. Hard refresh (`Cmd+Shift+R` or `Ctrl+Shift+R`)
4. Should NOT see 404 page - should load signup form

## Current Configuration

**vercel.json:**
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

This tells Vercel to serve `index.html` for ALL routes, allowing React Router to handle routing client-side.

