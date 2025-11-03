# Signup Regression Checklist

## Config and environment
- Confirm env vars are set in local `.env` and deployment provider:
  - `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<anon>`
- Hard redeploy without build cache; clear browser site data and hard refresh.

## Supabase Auth URL configuration
- Auth → URL Configuration:
  - SITE_URL: your production domain
  - Additional Redirect URLs: production, preview domains, `http://localhost:5173`

## Database and storage
- Table `user_profiles` exists with UNIQUE `username`, PK `id` referencing `auth.users(id)`.
- RLS:
  - SELECT: `USING (true)`
  - INSERT: `WITH CHECK (auth.uid() = id)`
  - UPDATE: `USING (auth.uid() = id)`
- Storage bucket `avatars` exists and is public; users can write under `<auth.uid()>/*`.

## Client checks
- Pre-flight HEAD to `${VITE_SUPABASE_URL}/rest/v1/` returns any status (not a network error/timeout).
- Signup passes `emailRedirectTo: ${window.location.origin}/login`.
- If email confirmation is enabled, profile creation waits until after login (no insert when `session` is null).

## Tests (dev and prod)
1. Invalid URL → shows configuration error immediately.
2. Paused project → shows connection error within ~3s.
3. Offline → shows connection error.
4. Username taken → shows "This username is already taken".
5. Existing email → shows "This email is already registered".
6. Happy path with avatar → creates auth user, uploads avatar, inserts profile, redirects to `/chat`.
7. Email confirmation (if enabled) → confirmation link returns to app (no 404), then login completes profile creation.

## Visual/UX
- Button shows spinner and disables inputs while submitting.
- Error banner never displays raw "Failed to fetch".

## Rollback
- If signup fails in production, temporarily disable the button and display a maintenance message while investigating configuration.


