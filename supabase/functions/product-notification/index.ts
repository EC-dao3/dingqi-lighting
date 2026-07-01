// ============================================
// Supabase Edge Function: product-notification
// ============================================
// Called when a new product is added. Sends email
// to all active subscribers via the configured SMTP.
// ============================================

import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailSub {
  id: number;
  email: string;
  active: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const productName = body.product_name || "New Product";
    const productId = body.product_id || "";
    const seriesName = body.series_name || "";
    const productUrl = body.product_url || "https://dingqilighting.com";

    // ── Get all active subscribers ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subs, error: subErr } = await supabase
      .from("email_subscriptions")
      .select("id, email, active")
      .eq("active", true);

    if (subErr || !subs || subs.length === 0) {
      console.log("No subscribers to notify.");
      return new Response(
        JSON.stringify({ success: true, notified: 0, msg: "No subscribers." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Send emails one by one ──
    const transporter = nodemailer.createTransport({
      host: Deno.env.get("SMTP_HOST") || "smtp.qiye.aliyun.com",
      port: Number(Deno.env.get("SMTP_PORT")) || 465,
      secure: true,
      auth: {
        user: Deno.env.get("SMTP_USER"),
        pass: Deno.env.get("SMTP_PASS"),
      },
    });

    let sent = 0;
    const seriesText = seriesName ? ` (${seriesName})` : "";

    for (const sub of subs as EmailSub[]) {
      try {
        await transporter.sendMail({
          from: `"DINGQI" <${Deno.env.get("SMTP_USER")}>`,
          to: sub.email,
          subject: `新品上线：${productName}${seriesText}`,
          html: `
            <div style="max-width:560px;margin:0 auto;padding:32px;font-family:Arial,sans-serif;background:#fafafa;border:1px solid #e5e5e5;border-radius:2px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:400;color:#000;">DINGQI 新品通知</h2>
              <p style="font-size:14px;color:#666;margin-bottom:24px;">我们刚刚发布了一款新产品：</p>

              <div style="padding:24px;background:#fff;border:1px solid #e5e5e5;border-radius:4px;margin-bottom:24px;">
                <p style="font-size:20px;font-weight:600;color:#000;margin:0 0 4px;">${productName}</p>
                ${productId ? `<p style="font-size:13px;color:#999;margin:0 0 8px;">型号: ${productId}</p>` : ""}
                ${seriesName ? `<p style="font-size:13px;color:#999;margin:0;">系列: ${seriesName}</p>` : ""}
              </div>

              <a href="${productUrl}" style="display:inline-block;padding:12px 32px;background:#000;color:#fff;text-decoration:none;border-radius:4px;font-size:13px;font-weight:500;">
                立即查看
              </a>

              <p style="font-size:12px;color:#999;margin-top:24px;line-height:1.6;">
                此邮件由 DINGQI Lighting 自动发送。如果您不想再收到新品通知，<a href="https://dingqilighting.com/unsubscribe?email=${encodeURIComponent(sub.email)}" style="color:#999;">点此取消订阅</a>。
              </p>
            </div>
          `,
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send to ${sub.email}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, notified: sent, total: subs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("product-notification error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
