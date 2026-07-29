import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";
import { sendCampaignBatch } from "@/lib/marketing-send";
import crypto from "crypto";

// ── GET: lista campañas con métricas, o el detalle de una (?id) ──
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = new URL(request.url).searchParams.get("id");

  if (id) {
    const { data: c } = await supabaseAdmin.from("email_campaigns").select("*, courses:promoted_course_id(title, code)").eq("id", id).maybeSingle();
    if (!c) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    const { data: recips } = await supabaseAdmin
      .from("email_recipients").select("email, name, sent_at, opened_at, open_count, clicked_at, click_count, error")
      .eq("campaign_id", id).order("opened_at", { ascending: false, nullsFirst: false });
    const metrics = await computeMetrics(id, (c as any).promoted_course_id, (c as any).sent_at);
    return NextResponse.json({ campaign: c, recipients: recips || [], metrics });
  }

  const { data: camps } = await supabaseAdmin
    .from("email_campaigns").select("id, subject, status, created_at, sent_at, total_recipients, promoted_course_id, courses:promoted_course_id(title)")
    .order("created_at", { ascending: false });

  // Métricas resumidas por campaña
  const withMetrics = [];
  for (const c of camps || []) {
    const m = await computeMetrics(c.id, (c as any).promoted_course_id, (c as any).sent_at);
    withMetrics.push({ ...c, metrics: m });
  }
  return NextResponse.json({ campaigns: withMetrics });
}

async function computeMetrics(campaignId: string, promotedCourseId: string | null, sentAt: string | null) {
  const { data: rs } = await supabaseAdmin
    .from("email_recipients").select("email, sent_at, opened_at, clicked_at").eq("campaign_id", campaignId);
  const recips = rs || [];
  const sent = recips.filter((r) => r.sent_at).length;
  const opened = recips.filter((r) => r.opened_at).length;
  const clicked = recips.filter((r) => r.clicked_at).length;

  let converted = 0;
  if (promotedCourseId && sentAt && recips.length > 0) {
    const emails = recips.map((r) => (r.email || "").toLowerCase());
    const { data: regs } = await supabaseAdmin
      .from("registrations")
      .select("email, created_at")
      .eq("course_id", promotedCourseId)
      .gte("created_at", sentAt);
    const enrolled = new Set((regs || []).map((r: any) => (r.email || "").toLowerCase()));
    converted = emails.filter((e) => enrolled.has(e)).length;
  }

  return {
    total: recips.length, sent, opened, clicked, converted,
    open_rate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
    click_rate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
    conv_rate: sent > 0 ? Math.round((converted / sent) * 100) : 0,
  };
}

// ── POST: construir audiencia (preview) o crear + enviar campaña ──
// body: { action: 'audience'|'send', audience: {...}, subject, body_html, promoted_course_id, custom_emails }
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const audience = body.audience || {};

  // Resolver destinatarios de las fuentes elegidas
  const map = new Map<string, string>(); // email → nombre
  const add = (email: string | null | undefined, name?: string | null) => {
    const e = (email || "").trim().toLowerCase();
    if (e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !map.has(e)) map.set(e, (name || "").trim());
  };

  if (audience.alumnos) {
    let q = supabaseAdmin.from("registrations").select("email, first_name, last_name, status, course_id, organization");
    if (audience.course_id) q = q.eq("course_id", audience.course_id);
    if (audience.status && audience.status !== "all") q = q.eq("status", audience.status);
    if (audience.organization) q = q.ilike("organization", `%${audience.organization}%`);
    const { data } = await q;
    for (const r of data || []) add(r.email, `${r.first_name || ""} ${r.last_name || ""}`.trim());
  }
  if (audience.leads) {
    const { data } = await supabaseAdmin.from("leads").select("email, first_name, last_name");
    for (const r of data || []) add(r.email, `${r.first_name || ""} ${r.last_name || ""}`.trim());
  }
  if (audience.custom && typeof body.custom_emails === "string") {
    for (const line of body.custom_emails.split(/[\n,;]+/)) add(line);
  }
  if (audience.custom && Array.isArray(body.custom_list)) {
    for (const c of body.custom_list) add(c?.email, c?.name);
  }

  const recipients = Array.from(map.entries()).map(([email, name]) => ({ email, name }));

  if (body.action === "audience") {
    return NextResponse.json({ count: recipients.length, sample: recipients.slice(0, 10) });
  }

  // action === 'send'
  if (!body.subject?.trim() || !body.body_html?.trim()) {
    return NextResponse.json({ error: "Asunto y contenido son requeridos" }, { status: 400 });
  }
  if (recipients.length === 0) {
    return NextResponse.json({ error: "La audiencia está vacía" }, { status: 400 });
  }
  if (recipients.length > 5000) {
    return NextResponse.json({ error: `La audiencia tiene ${recipients.length} correos (máx. 5000 por campaña). Ajusta los filtros.` }, { status: 400 });
  }

  const dailyBatch = Math.min(Math.max(1, Number(body.daily_batch) || 100), 500);

  // Crear campaña (sent_at = inicio del envío; se usa para medir conversión)
  const { data: campaign, error: cErr } = await supabaseAdmin.from("email_campaigns").insert({
    subject: body.subject.trim(),
    body_html: body.body_html,
    promoted_course_id: body.promoted_course_id || null,
    audience,
    status: "sending",
    created_by: auth.email,
    total_recipients: recipients.length,
    daily_batch: dailyBatch,
    sent_at: new Date().toISOString(),
  }).select().single();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  // Insertar TODOS los destinatarios como pendientes (token único)
  const rows = recipients.map((r) => ({
    campaign_id: campaign.id, email: r.email, name: r.name || null,
    token: crypto.randomBytes(16).toString("hex"),
  }));
  await supabaseAdmin.from("email_recipients").insert(rows);

  // Enviar SOLO el primer lote de hoy; el cron diario envía el resto.
  const res = await sendCampaignBatch(campaign.id, dailyBatch);

  return NextResponse.json({
    ok: true, campaign_id: campaign.id,
    sent: res.sent, failed: res.failed, total: rows.length,
    remaining: res.remaining, daily_batch: dailyBatch,
  });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  await supabaseAdmin.from("email_campaigns").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
