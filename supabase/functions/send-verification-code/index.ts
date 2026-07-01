// ============================================
// Supabase Edge Function: send-verification-code
// ============================================
// 1. Generates a 6‑digit code
// 2. Stores it in the email_verifications table
// 3. Sends it to the user via Alibaba Cloud SMTP
// ============================================

import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Generate 6‑digit code ──
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // ── 2. Store in DB ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Invalidate any previous unused codes for this email
    await supabase
      .from("email_verifications")
      .update({ used: true })
      .eq("email", email)
      .eq("used", false);

    const { error: dbError } = await supabase
      .from("email_verifications")
      .insert({
        email,
        code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to generate code. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Send email via SMTP ──
    const transporter = nodemailer.createTransport({
      host: Deno.env.get("SMTP_HOST") || "smtp.qiye.aliyun.com",
      port: Number(Deno.env.get("SMTP_PORT")) || 465,
      secure: true,
      auth: {
        user: Deno.env.get("SMTP_USER"),
        pass: Deno.env.get("SMTP_PASS"),
      },
    });

    await transporter.sendMail({
      from: `"DINGQI" <${Deno.env.get("SMTP_USER")}>`,
      to: email,
      subject: `Your DINGQI verification code: ${code}`,
      html: `
        <div style="max-width:480px;margin:0 auto;padding:32px;font-family:Arial,sans-serif;background:#fafafa;border:1px solid #e5e5e5;border-radius:2px;">
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:400;color:#000;">DINGQI Verification Code</h2>
          <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#000;margin:24px 0;padding:20px;background:#fff;text-align:center;border:1px solid #e5e5e5;">
            ${code}
          </p>
          <p style="font-size:13px;color:#666;">Enter this code on the registration page to verify your email. The code expires in 10 minutes.</p>
          <p style="font-size:12px;color:#999;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({ success: true, msg: "Verification code sent to your email." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
