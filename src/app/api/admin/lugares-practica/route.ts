import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";
import { SITE_FIELDS } from "@/lib/practice-sites";

const SELECT = "*, practice_site_authorizations(*)";
const AUTH_FIELDS = ["authority", "reference", "document_url", "valid_from", "valid_until", "lead_days", "notes"];
const NUMERIC = new Set(["latitude", "longitude", "nearest_aerodrome_km", "max_height_agl_m", "max_radius_m", "max_mtom_kg", "max_simultaneous_rpa", "capacity_students", "lead_days"]);

function clean(src: any, fields: readonly string[]) {
  const out: Record<string, any> = {};
  for (const k of fields) {
    if (!(k in (src || {}))) continue;
    let v = src[k];
    if (typeof v === "string") v = v.trim();
    if (v === "") v = null;
    if (v != null && NUMERIC.has(k)) { const n = Number(v); v = Number.isFinite(n) ? n : null; }
    out[k] = v;
  }
  return out;
}

async function saveAuthorizations(siteId: string, auths: any[]) {
  await supabaseAdmin.from("practice_site_authorizations").delete().eq("site_id", siteId);
  const rows = (auths || [])
    .map((a) => ({ ...clean(a, AUTH_FIELDS), site_id: siteId }) as Record<string, any>)
    .filter((a) => a.authority);
  if (rows.length > 0) {
    const { error } = await supabaseAdmin.from("practice_site_authorizations").insert(rows);
    if (error) throw new Error(error.message);
  }
}

// GET -> todos los lugares (activos y suspendidos) con sus autorizaciones + uso
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await supabaseAdmin.from("practice_sites").select(SELECT).order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: uses } = await supabaseAdmin
    .from("instructor_assignments").select("practice_site_id").not("practice_site_id", "is", null);
  const useCount: Record<string, number> = {};
  for (const u of uses || []) useCount[u.practice_site_id] = (useCount[u.practice_site_id] || 0) + 1;

  return NextResponse.json({ sites: (data || []).map((s) => ({ ...s, uses: useCount[s.id] || 0 })) });
}

// POST { site, authorizations } -> crea
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => ({}));
  const site = clean(body.site, SITE_FIELDS);
  if (!site.name) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("practice_sites").insert(site).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try { await saveAuthorizations(data.id, body.authorizations); }
  catch (e: any) { return NextResponse.json({ error: e.message, id: data.id }, { status: 500 }); }
  return NextResponse.json({ ok: true, id: data.id });
}

// PUT { id, site, authorizations } -> actualiza (las autorizaciones se reemplazan)
export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const site = clean(body.site, SITE_FIELDS);
  if ("name" in site && !site.name) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  const { error } = await supabaseAdmin
    .from("practice_sites").update({ ...site, updated_at: new Date().toISOString() }).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (Array.isArray(body.authorizations)) {
    try { await saveAuthorizations(body.id, body.authorizations); }
    catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }
  return NextResponse.json({ ok: true });
}

// DELETE ?id= -> elimina solo si no tiene clases asociadas (si no, suspender)
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const { count } = await supabaseAdmin
    .from("instructor_assignments").select("id", { count: "exact", head: true }).eq("practice_site_id", id);
  if ((count || 0) > 0) {
    return NextResponse.json({ error: `El lugar tiene ${count} clase(s) asociada(s). Suspéndelo en vez de eliminarlo.` }, { status: 409 });
  }
  const { error } = await supabaseAdmin.from("practice_sites").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
