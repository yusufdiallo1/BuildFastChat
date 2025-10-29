# Environment Variables Setup Required

## ⚠️ Your app needs Supabase credentials to run!

Your app is currently missing Supabase environment variables. Here's how to fix it:

### Option 1: If you already have a Supabase project

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings > API**
4. Copy the following values:
   - **URL** (under Project Settings)
   - **anon/public key** (under Project API keys)

5. Update your `.env` file with these values:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SIk1D0jZOjOEt976AP4c0SgY9caYvhYxNgDkJ0IYfmlFzAPquoMiVbhjCwQVloKoQqkkAbtzNxfjb59Gk8CDNEd00O3lDWI2b
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Option 2: Create a new Supabase project

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in project details
5. Get your API keys as described in Option 1
6. Add them to your `.env` file

### After adding credentials

1. Save the `.env` file
2. Restart your dev server (it should auto-restart)
3. Your app should now load without errors!

---

**Need help?** Check the Supabase documentation: https://supabase.com/docs

