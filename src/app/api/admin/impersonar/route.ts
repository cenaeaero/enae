import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// Consola de "Ver como / Suplantar": devuelve instructores, supervisores y
// (si hay búsqueda) alumnos, con sus destinos de suplantación.
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const q = (new URL(request.url).searchParams.get("q") || "").trim();

  // Instructores
  const { data: insts } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("role", "instructor")
    .order("last_name");

  // Supervisores + sus empresas
  const { data: cs } = await supabaseAdmin
    .from("company_supervisors")
    .select("company_id, profile_id, companies(id, name), profiles(id, first_name, last_name, email)");
  const supMap: Record<string, any> = {};
  for (const row of (cs || []) as any[]) {
    const p = row.profiles;
    if (!p) continue;
    if (!supMap[p.id]) supMap[p.id] = { id: p.id, name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email, email: p.email, companies: [] };
    if (row.companies) supMap[p.id].companies.push({ id: row.companies.id, name: row.companies.name });
  }

  // Alumnos (solo con búsqueda; todos los estados)
  let students: any[] = [];
  if (q.length >= 2) {
    const { data: regs } = await supabaseAdmin
      .from("registrations")
      .select("id, first_name, last_name, email, organization, status, courses(title, code)")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,organization.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(40);
    students = (regs || []).map((r: any) => ({
      registration_id: r.id,
      name: `${r.last_name || ""}, ${r.first_name || ""}`.replace(/^, /, "").trim() || r.email,
      email: r.email,
      organization: r.organization || null,
      status: r.status,
      course: r.courses?.title || null,
    }));
  }

  return NextResponse.json({
    instructors: (insts || []).map((p) => ({
      id: p.id, name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email, email: p.email,
    })),
    supervisors: Object.values(supMap),
    students,
  });
}
