import { supabaseAdmin } from "@/lib/supabase-service";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.enae.cl";
const FROM = process.env.SMTP_USER || "escuela@enae.cl";

// Inyecta el pixel de apertura y reescribe los href para rastrear clics.
export function renderCampaignEmail(html: string, token: string): string {
  const clickBase = `${SITE}/api/track/c/${token}?u=`;
  let out = html.replace(/href="(https?:\/\/[^"]+)"/gi, (_m, url) => `href="${clickBase}${encodeURIComponent(url)}"`);
  const pixel = `<img src="${SITE}/api/track/o/${token}" width="1" height="1" alt="" style="display:none" />`;
  const footer = `<div style="font-size:11px;color:#9ca3af;margin-top:24px;text-align:center;">Escuela de Navegación Aérea — ENAE · AOC 1521 DGAC · Certificada ISO 9001:2015<br/>Recibiste este correo por tu interés en nuestros cursos.</div>`;
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${footer}${pixel}</body>`);
  else out = `${out}${footer}${pixel}`;
  return out;
}

// Envía hasta `limit` destinatarios PENDIENTES (sin sent_at ni error) de una
// campaña. Marca cada envío y, si ya no quedan pendientes, cierra la campaña.
// Devuelve lo enviado en esta pasada y cuántos quedan.
export async function sendCampaignBatch(campaignId: string, limit: number): Promise<{
  sent: number; failed: number; remaining: number; done: boolean;
}> {
  const { data: campaign } = await supabaseAdmin
    .from("email_campaigns").select("id, subject, body_html, status").eq("id", campaignId).maybeSingle();
  if (!campaign) return { sent: 0, failed: 0, remaining: 0, done: true };

  const { data: batch } = await supabaseAdmin
    .from("email_recipients")
    .select("token, email")
    .eq("campaign_id", campaignId)
    .is("sent_at", null)
    .is("error", null)
    .limit(Math.max(1, limit));

  const rows = batch || [];
  if (rows.length === 0) {
    await supabaseAdmin.from("email_campaigns").update({ status: "sent" }).eq("id", campaignId);
    return { sent: 0, failed: 0, remaining: 0, done: true };
  }

  const { default: nodemailer } = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"), secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  let sent = 0, failed = 0;
  for (const r of rows) {
    try {
      await transporter.sendMail({
        from: `"Escuela de Navegación Aérea - ENAE" <${FROM}>`,
        to: r.email,
        subject: campaign.subject,
        html: renderCampaignEmail(campaign.body_html, r.token),
        headers: { "List-Unsubscribe": `<mailto:${FROM}?subject=Baja>` },
      });
      await supabaseAdmin.from("email_recipients").update({ sent_at: new Date().toISOString() }).eq("token", r.token);
      sent++;
    } catch (e: any) {
      await supabaseAdmin.from("email_recipients").update({ error: (e?.message || "error").slice(0, 300) }).eq("token", r.token);
      failed++;
    }
  }

  // ¿Quedan pendientes tras esta pasada?
  const { count } = await supabaseAdmin
    .from("email_recipients").select("token", { count: "exact", head: true })
    .eq("campaign_id", campaignId).is("sent_at", null).is("error", null);
  const remaining = count || 0;
  if (remaining === 0) {
    await supabaseAdmin.from("email_campaigns").update({ status: "sent" }).eq("id", campaignId);
  }
  return { sent, failed, remaining, done: remaining === 0 };
}
