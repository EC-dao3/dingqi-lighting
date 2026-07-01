# DINGQI Login System — Setup Guide

## Quick Start (20 min)

### Step 1: Create Supabase Project

1. Go to https://supabase.com → Sign up (GitHub login recommended)
2. Click **"New project"**
3. Choose **Organization** (default is fine)
4. Enter project name: `dingqi-lighting`
5. Set a **strong database password** (save it somewhere safe)
6. Region: choose **Singapore** or **Tokyo** (closest to China)
7. Wait 1-2 minutes for the project to be created

### Step 2: Get Credentials

1. In Supabase dashboard, go to **Settings → API**
2. Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
3. Copy **anon / public key** (under "Project API keys")
4. Open `js/supabase-client.js` and replace:
   - `YOUR-PROJECT-ID.supabase.co` → your Project URL
   - `YOUR-ANON-KEY` → your anon key

### Step 3: Create Database Table

1. Go to **SQL Editor** in Supabase dashboard
2. Paste the content of `supabase/migrations/001_email_verifications.sql` and click **Run**
3. This creates the `email_verifications` table that stores verification codes

### Step 4: Deploy Edge Functions

These cloud functions handle sending verification codes via your @dingqilighting.com SMTP.

**Install Supabase CLI:**
```
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
```

**Set SMTP secrets (Alibaba Cloud Enterprise Email):**

注意：`SMTP_PASS` 必须是阿里云企业邮箱的**客户端授权码**（不是网页登录密码）。
获取方式：登录邮箱网页版 → 设置 → 账户与安全 → 客户端授权码 → 开启 SMTP 并复制授权码。

```
supabase secrets set SMTP_HOST="smtp.qiye.aliyun.com"
supabase secrets set SMTP_PORT="465"
supabase secrets set SMTP_USER="info@dingqilighting.com"
supabase secrets set SMTP_PASS="your-smtp-client-auth-code"
```

Or use the env file to set all at once:
```
supabase secrets set --env-file supabase/.env.example
```

**Deploy the functions:**
```
supabase functions deploy send-verification-code --no-verify-jwt
supabase functions deploy verify-code --no-verify-jwt
```

### Step 5: Disable Supabase Email Confirmations

Since we use our own verification code, disable Supabase's built-in email:

1. Go to **Authentication → Settings**
2. **UNCHECK** "Enable email confirmations"
3. Save

### Step 6: Test

Start the server and visit `/pages/login.html`:


## OAuth Provider Setup

### GitHub (easiest — 5 min)

1. Go to https://github.com/settings/developers → **New OAuth App**
2. Application name: `DINGQI Lighting`
3. Homepage URL: `http://localhost:8080`
4. Authorization callback URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
5. Register → copy **Client ID** and generate **Client Secret**
6. In Supabase: **Authentication → Providers → GitHub**
   - Enable GitHub provider
   - Paste Client ID and Client Secret
   - Save

Now users can log in with GitHub immediately.

### WeChat 微信 (requires WeChat Open Platform account)

**Prerequisites:**
- A registered business/personal account at https://open.weixin.qq.com
- An approved website application (网站应用)
- Note: individual developer accounts have limited capabilities

**Option A: Supabase Custom Provider (recommended)**

1. Get your **AppID** and **AppSecret** from WeChat Open Platform
2. In Supabase: **Authentication → Providers → Add custom provider**
   - Name: `wechat`
   - Client ID: your WeChat AppID
   - Client Secret: your WeChat AppSecret
   - Authorization URL: `https://open.weixin.qq.com/connect/qrconnect`
   - Token URL: `https://api.weixin.qq.com/sns/oauth2/access_token`
   - User Info URL: `https://api.weixin.qq.com/sns/userinfo`
3. In WeChat Open Platform, set callback URL to:
   `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

**Option B: Edge Function (if custom provider doesn't work)**

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref YOUR-PROJECT-REF`
4. Set secrets:
   ```
   supabase secrets set WECHAT_APP_ID=your_app_id
   supabase secrets set WECHAT_APP_SECRET=your_app_secret
   ```
5. Deploy: `supabase functions deploy wechat-auth --no-verify-jwt`
6. In WeChat Open Platform, set callback URL to:
   `https://YOUR-PROJECT.supabase.co/functions/v1/wechat-auth`

### QQ

**Prerequisites:**
- A registered app at https://connect.qq.com (QQ互联)
- An approved website application

Same two options as WeChat:

**Option A: Supabase Custom Provider**
- Name: `qq`
- Authorization URL: `https://graph.qq.com/oauth2.0/authorize`
- Token URL: `https://graph.qq.com/oauth2.0/token`
- User Info URL: `https://graph.qq.com/user/get_user_info`

**Option B: Edge Function**
```
supabase secrets set QQ_APP_ID=your_app_id
supabase secrets set QQ_APP_KEY=your_app_key
supabase functions deploy qq-auth --no-verify-jwt
```


## File Structure

```
dingqi-lighting/
├── js/
│   ├── supabase-client.js   ← Your Supabase credentials go here
│   ├── auth.js               ← Auth logic (login/register/logout/OAuth)
│   └── main.js
├── pages/
│   ├── login.html            ← Login/register page
│   ├── about.html            (modified: added auth nav + scripts)
│   ├── ...                   (all pages modified)
├── supabase/
│   ├── migrations/
│   │   └── 001_email_verifications.sql  ← DB table for verification codes
│   └── functions/
│       ├── send-verification-code/      ← Sends email via your SMTP
│       ├── verify-code/                 ← Verifies the code
│       ├── wechat-auth/                 ← WeChat OAuth Edge Function
│       └── qq-auth/                     ← QQ OAuth Edge Function
└── SETUP.md                  ← This file
```


## Testing Auth

After setup, open `http://localhost:8080` and:

1. Click **"Sign In"** in the top navigation (upper right)
2. Click **Register** tab
   - **Step 1:** Enter name and email → click "Send Verification Code"
   - Check your email for a 6‑digit code (sent by Supabase)
   - **Step 2:** Enter the code → click "Verify Code"
   - **Step 3:** Set password + confirm → click "Complete Registration"
   - You'll be logged in and redirected to the homepage
3. Try **Sign In** with the registered email and password
4. Try **GitHub** button (after configuring GitHub OAuth)
5. Try **WeChat** / **QQ** (after configuring respective providers)

**Resend:** If the code doesn't arrive within 60 seconds, the "Resend Code" button becomes active.

Logged-in state:
- Navigation shows the user's name
- Hover to see the "Sign Out" dropdown
- Session persists across page refreshes and server restarts


## FAQ

**Q: Do I need a real domain?**
A: For development, `localhost` works fine. For production, you need a real domain
and must update callback URLs in Supabase and OAuth providers.

**Q: Will data survive server restart?**
A: Yes! All user data is stored in Supabase's cloud database (PostgreSQL).
Your local Python server only serves static files.

**Q: Is this free?**
A: Supabase free tier includes 50,000 monthly active users and 500MB database.
More than enough for a product showcase website.

**Q: What if a user forgets their password?**
A: Supabase provides password reset out of the box. Users click "Forgot password"
on the login form (you can add this feature to login.html).
