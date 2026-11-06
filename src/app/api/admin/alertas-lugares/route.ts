import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";
import { type PracticeSite, authorizationState, scheduleWarnings } from "@/lib/practice-sites";

// GET -> alertas de Lugares de práctica para el Dashboard:
//   sites   : lugares ACTIVOS con autorizaciones vencidas, por vencer (≤30 días) o sin autorizaciones
//   classes : clases futuras (no completadas/canceladas) programadas en un lugar con advertencias
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: sitesData, error } = await supabaseAdmin
    .from("practice_sites").select("*, practice_site_authorizations(*)");
  if (error) return NextResponse.json({ sites: [], classes: [], unavailable: true });
  const sites = (sitesData || []) as PracticeSite[];
  const byId: Record<string, PracticeSite> = {};
  for (const s of sites) byId[s.id] = s;

  const siteAlerts = sites
    .filter((s) => s.status === "activo")
    .map((s) => ({ id: s.id, name: s.name, city: s.city, ...authorizationState(s) }))
    .filter((x) => x.state !== "vigente")
    .sort((a, b) => ["vencida", "por_vencer", "sin_autorizaciones"].indexOf(a.state) - ["vencida", "por_vencer", "sin_autorizaciones"].indexOf(b.state));

  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const { data: asgs } = await supabaseAdmin
    .from("instructor_assignments")
    .select("id, instructor_email, scheduled_date, start_time, status, practice_site_id, registration_id, registrations(first_name, last_name, course_id)")
    .not("practice_site_id", "is", null)
    .gte("scheduled_date", today)
    .not("status", "in", "(completed,cancelled)")
    .order("scheduled_date");

  const classes = [] as any[];
  for (const a of (asgs || []) as any[]) {
    const site = byId[a.practice_site_id];
    if (!site) continue;
    const warnings = scheduleWarnings(site, a.scheduled_date, a.registrations?.course_id || null, { skipLead: true });
    if (warnings.length === 0) continue;
    classes.push({
      id: a.id,
      registration_id: a.registration_id,
      student: `${a.registrations?.first_name || ""} ${a.registrations?.last_name || ""}`.trim(),
      instructor_email: a.instructor_email,
      date: a.scheduled_date,
      time: a.start_time,
      site: site.name,
      warnings,
    });
  }

  return NextResponse.json({ sites: siteAlerts, classes });
}
