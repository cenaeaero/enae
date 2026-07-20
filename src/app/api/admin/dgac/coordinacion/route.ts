import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// GET /api/admin/dgac/coordinacion — listado de trámites DGAC con datos del
// alumno y su RUT. Usa service_role: el navegador consulta profiles con la
// clave anónima y RLS le oculta las filas (los RUT aparecían como "falta").
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await supabaseAdmin
    .from("dgac_procedures")
    .select("*, registrations(id, first_name, last_name, email, is_alumni, courses(title, code))")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emails = new Set<string>();
  for (const p of (data || []) as any[]) {
    const e = p.registrations?.email;
    if (e) { emails.add(e); emails.add(e.toLowerCase()); }
  }

  const rut_by_email: Record<string, string> = {};
  if (emails.size > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("email, rut")
      .in("email", Array.from(emails));
    for (const p of profs || []) {
      if (p.email && p.rut) rut_by_email[p.email.toLowerCase()] = p.rut;
    }
  }

  return NextResponse.json({ procedures: data || [], rut_by_email });
}
