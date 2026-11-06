import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireInstructor } from "@/lib/auth-instructor";

// GET -> catálogo de lugares de práctica para planificar clases (instructores y admin).
// Solo lectura. Incluye suspendidos marcados, para que el selector pueda advertir.
export async function GET() {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await supabaseAdmin
    .from("practice_sites")
    .select("*, practice_site_authorizations(authority, reference, valid_from, valid_until, lead_days)")
    .order("name");
  if (error) {
    // Si la migración aún no se ejecutó, el selector simplemente no muestra lugares.
    return NextResponse.json({ sites: [], unavailable: true, error: error.message });
  }
  return NextResponse.json({ sites: data || [] });
}
