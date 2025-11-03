# Signup Feature - Intended Behavior Documentation

## User's Perspective

### Visual Experience
1. User navigates to `/signup` route
2. Sees a dark-themed form with fields:
   - Email Address (required, validated as email format)
   - Password (required, masked input)
   - Username (required, must be unique, hint: "Must be unique")
   - City (required, dropdown with 300+ predefined cities)
   - Profile Picture (optional, max 5MB, JPG/PNG/GIF/WEBP)
3. On form submission:
   - Button shows "Creating Account..." with spinner
   - All fields become disabled during loading
   - Any errors display in red box at top of form

### Expected Outcomes
- **Success**: Account created → User redirected to `/chat` page
- **Failure**: Clear error message explaining what went wrong (no technical jargon like "Failed to fetch")

### Error Scenarios User Should See
1. **Configuration Issues**: "❌ Configuration Error: Supabase credentials are missing..." (guide to fix)
2. **Connection Issues**: "❌ Connection Error: Cannot connect to Supabase. Your project may be PAUSED..." (with dashboard link)
3. **Validation Errors**: "Username is required", "City is required", "Image size must be less than 5MB"
4. **Business Logic Errors**: "This username is already taken", "This email is already registered. Please try logging in."

## System's Perspective (Front-end)

### Component: `src/pages/Signup.jsx`

#### Initialization
1. **useEffect (line 330)**: Redirects if user already logged in
2. **useEffect (line 337)**: Validates Supabase URL on mount, sets error if invalid

#### State Management
- `email`, `password`, `username`, `city`: Form inputs
- `profilePicture`: File object for upload
- `previewUrl`: Base64 preview of selected image
- `loading`: Boolean to disable form during submission
- `error`: String for user-facing error messages

#### Form Submission Flow (`handleSubmit` function)

**Step 1: Pre-flight Checks (Lines 375-411)**
- Validates environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Validates URL format (must start with `https://` and contain `.supabase.co`)
- **Connection Test**: Makes HEAD request to `${supabaseUrl}/rest/v1/` with 3-second timeout
  - If fails → Shows connection error immediately
  - If succeeds → Continues to next step

**Step 2: Input Validation (Lines 413-423)**
- Checks `username` is not empty
- Checks `city` is selected
- If validation fails → Sets error, stops loading, returns

**Step 3: Username Availability Check (Lines 425-471)**
- Queries `user_profiles` table: `SELECT username WHERE username = ?`
- Uses `.single()` which returns `PGRST116` code if no rows found (username available)
- **Error Handling**:
  - `PGRST116`: Proceed (username available)
  - `CONFIG_ERROR`: Show configuration error
  - `Failed to fetch` / network errors: Transform to connection error
  - Other errors: Display error message
- If username exists → Show "username already taken", return

**Step 4: User Authentication (Lines 479-507)**
- Calls `supabase.auth.signUp({ email, password })`
- **Error Handling**:
  - Catches network errors in try/catch
  - Transforms "Failed to fetch" immediately if detected
  - Checks `result.error` for Supabase-specific errors
  - Handles: "already registered", password validation, connection errors

**Step 5: Profile Creation (Lines 540-587)**
- If `data.user` exists (signup successful):
  - **Profile Picture Upload** (if selected):
    - Uploads to `avatars` storage bucket
    - Gets public URL for the uploaded file
  - **User Profile Insert**:
    - Inserts into `user_profiles` table:
      - `id`: From `data.user.id`
      - `email`: From `data.user.email`
      - `username`: Trimmed user input
      - `city`: Selected city
      - `full_name`: Empty string
      - `profile_picture`: URL from storage (or empty)
      - `is_online`: `true`
  - **Success**: Navigate to `/chat`

### Supabase Client: `src/lib/supabase.js`

#### Client Initialization
1. **Environment Variable Validation**:
   - Checks `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist
   - Validates URL format (`https://`, `.supabase.co`, length > 20)
   - Validates key format (string, length > 50)

2. **Client Creation** (if credentials valid):
   - Creates Supabase client with:
     - Custom sessionStorage implementation (prefix: `sb-auth_`)
     - `autoRefreshToken: false` (prevents background calls)
     - `persistSession: false` (prevents session calls)
     - Custom `fetch` wrapper with 5-second timeout
     - Error transformation at fetch level

3. **Proxy/Wrapper System**:
   - Wraps all auth methods to transform errors
   - Wraps `.from()` queries to transform errors
   - If credentials invalid → Returns proxy that never makes network calls

#### Error Transformation
- `transformError()` function: Converts all "Failed to fetch", network errors into user-friendly messages
- Applied at multiple levels:
  - Fetch wrapper level
  - Auth method level
  - Query method level

### Authentication Context: `src/contexts/AuthContext.jsx`

#### On App Load
- Calls `supabase.auth.getSession()` to check existing session
- Subscribes to `onAuthStateChange()` for auth state updates
- Error handling: Catches errors gracefully, doesn't crash app

#### Profile Management
- When user logged in: Fetches `user_profiles` record
- If profile doesn't exist: Creates one with defaults
- Listens to real-time updates for profile changes

## Backend/Database Schema (Supabase)

### Expected Database Structure

#### `auth.users` Table (Supabase Managed)
- Created automatically by `supabase.auth.signUp()`
- Fields: `id` (UUID), `email`, `encrypted_password`, etc.

#### `user_profiles` Table (Custom)
**Required Schema:**
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  city TEXT,
  full_name TEXT DEFAULT '',
  profile_picture TEXT,  -- URL from storage
  is_online BOOLEAN DEFAULT true,
  theme_preference TEXT DEFAULT 'dark',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all profiles
CREATE POLICY "Users can view all profiles" 
  ON user_profiles FOR SELECT 
  USING (true);

-- Policy: Users can only update their own profile
CREATE POLICY "Users can update own profile" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
  ON user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);
```

#### Storage: `avatars` Bucket
- Public bucket for storing profile pictures
- Path structure: `{user_id}/{filename}`
- Policies: Users can upload to their own folder, all can read

## Data Flow Diagram

```
User Input → Validation → Connection Test → Username Check → Sign Up → Profile Create → Redirect
    ↓           ↓              ↓              ↓            ↓          ↓              ↓
  Fields    Empty check   HEAD request   DB query    Auth API   DB insert    /chat route
    ↓           ↓              ↓              ↓            ↓          ↓
  Error      Error         Error          Error       Error      Error
Display    Display       Display        Display     Display   Display
```

## Error Handling Strategy

1. **Prevention**: Validate before making API calls
2. **Connection Testing**: Test Supabase reachability before operations
3. **Transformation**: Convert all technical errors to user-friendly messages
4. **Multiple Layers**: Error handling at fetch, client, and component levels
5. **Graceful Degradation**: App continues functioning even if Supabase is unavailable

## Key Design Principles

1. **No Raw Technical Errors**: All "Failed to fetch" must be transformed
2. **Early Validation**: Fail fast with clear messages
3. **User Guidance**: Error messages include actionable next steps
4. **Network Timeouts**: All requests have timeouts to prevent hanging
5. **Error State Management**: Clear errors between attempts
