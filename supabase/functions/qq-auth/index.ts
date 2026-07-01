// ============================================
// DINGQI - QQ OAuth Edge Function
// Deploy to Supabase: supabase functions deploy qq-auth
// ============================================
// Prerequisites:
//  1. Register at https://connect.qq.com (QQ Connect)
//  2. Get AppID and AppKey
//  3. Set secrets: supabase secrets set QQ_APP_ID=xxx QQ_APP_KEY=xxx
//  4. Set callback URL in QQ Connect:
//     https://YOUR-PROJECT.supabase.co/functions/v1/qq-auth
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const QQ_APP_ID = Deno.env.get("QQ_APP_ID")!;
const QQ_APP_KEY = Deno.env.get("QQ_APP_KEY")!;

serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("redirect_to") || "/";

  if (!code) {
    // Step 1: redirect user to QQ authorization page
    const redirectUri = `https://${url.hostname}/functions/v1/qq-auth`;
    const qqAuthUrl = "https://graph.qq.com/oauth2.0/authorize" +
      `?response_type=code` +
      `&client_id=${QQ_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(redirectTo)}` +
      `&scope=get_user_info`;

    return Response.redirect(qqAuthUrl, 302);
  }

  // Step 2: exchange code for access_token
  const tokenRes = await fetch(
    "https://graph.qq.com/oauth2.0/token" +
    `?grant_type=authorization_code` +
    `&client_id=${QQ_APP_ID}` +
    `&client_secret=${QQ_APP_KEY}` +
    `&code=${code}` +
    `&redirect_uri=${encodeURIComponent(`https://${url.hostname}/functions/v1/qq-auth`)}`
  );
  const tokenText = await tokenRes.text();

  // QQ returns a query-string-like response
  const params = new URLSearchParams(tokenText.replace(/^access_token=/, ""));
  const accessToken = params.get("access_token");

  if (!accessToken) {
    return new Response(JSON.stringify({ error: "QQ auth failed", detail: tokenText }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  // Step 3: get openid
  const openidRes = await fetch(
    `https://graph.qq.com/oauth2.0/me?access_token=${accessToken}`
  );
  const openidText = await openidRes.text();
  const openidMatch = openidText.match(/"openid"\s*:\s*"(\w+)"/);
  const openid = openidMatch ? openidMatch[1] : null;

  if (!openid) {
    return new Response(JSON.stringify({ error: "QQ get openid failed", detail: openidText }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  const appIdForUser = openidText.match(/"client_id"\s*:\s*"(\w+)"/)?.[1] || QQ_APP_ID;

  // Step 4: get user info
  const userRes = await fetch(
    `https://graph.qq.com/user/get_user_info` +
    `?access_token=${accessToken}` +
    `&oauth_consumer_key=${appIdForUser}` +
    `&openid=${openid}`
  );
  const userInfo = await userRes.json();

  // Step 5: create/find Supabase user
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const email = openid + "@qq.dingqi.local";
  const fullName = userInfo.nickname || "QQ User";
  const avatarUrl = userInfo.figureurl_qq_2 || userInfo.figureurl_qq_1 || "";

  // Check if user exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const found = existingUsers?.users?.find((u: any) => u.email === email);

  if (found) {
    const { data: signData } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink", email
    });
    return Response.redirect(redirectTo, 302);
  }

  // Create new user
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      avatar_url: avatarUrl,
      qq_openid: openid,
      provider: "qq"
    }
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

   const { data: signData } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink", email
  });

  return Response.redirect(redirectTo, 302);
});
