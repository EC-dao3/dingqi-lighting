// ============================================
// DINGQI - WeChat OAuth Edge Function
// Deploy to Supabase: supabase functions deploy wechat-auth
// ============================================
// Prerequisites:
//  1. Register at https://open.weixin.qq.com (WeChat Open Platform)
//  2. Get AppID and AppSecret
//  3. Set secrets: supabase secrets set WECHAT_APP_ID=xxx WECHAT_APP_SECRET=xxx
//  4. Set authorized redirect URI in WeChat Open Platform:
//     https://YOUR-PROJECT.supabase.co/functions/v1/wechat-auth
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WECHAT_APP_ID = Deno.env.get("WECHAT_APP_ID")!;
const WECHAT_APP_SECRET = Deno.env.get("WECHAT_APP_SECRET")!;

serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("redirect_to") || "/";

  if (!code) {
    // Step 1: redirect user to WeChat authorization page
    const redirectUri = `https://${url.hostname}/functions/v1/wechat-auth`;
    const wechatAuthUrl = "https://open.weixin.qq.com/connect/qrconnect" +
      `?appid=${WECHAT_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=snsapi_login` +
      `&state=${encodeURIComponent(redirectTo)}#wechat_redirect`;

    return Response.redirect(wechatAuthUrl, 302);
  }

  // Step 2: exchange code for access_token
  const tokenRes = await fetch(
    "https://api.weixin.qq.com/sns/oauth2/access_token" +
    `?appid=${WECHAT_APP_ID}` +
    `&secret=${WECHAT_APP_SECRET}` +
    `&code=${code}` +
    `&grant_type=authorization_code`
  );
  const tokenData = await tokenRes.json();

  if (!tokenData.access_token || !tokenData.openid) {
    return new Response(JSON.stringify({ error: "WeChat auth failed", detail: tokenData }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  // Step 3: get user info
  const userRes = await fetch(
    "https://api.weixin.qq.com/sns/userinfo" +
    `?access_token=${tokenData.access_token}` +
    `&openid=${tokenData.openid}`
  );
  const userInfo = await userRes.json();

  // Step 4: create/find Supabase user
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const email = userInfo.openid + "@wechat.dingqi.local";
  const fullName = userInfo.nickname || "WeChat User";
  const avatarUrl = userInfo.headimgurl || "";

  // Check if user exists by email
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const found = existingUsers?.users?.find((u: any) => u.email === email);

  if (found) {
    // Generate a sign-in link for existing user
    const { data: signData } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink", email
    });
    return Response.redirect(redirectTo, 302);
  }

  // Create new user
  const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      avatar_url: avatarUrl,
      wechat_openid: userInfo.openid,
      provider: "wechat"
    }
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  // Generate sign-in link
  const { data: signData } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink", email
  });

  return Response.redirect(redirectTo, 302);
});
