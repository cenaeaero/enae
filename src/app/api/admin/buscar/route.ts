import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// GET ?q= -> buscador global del panel: alumnos por nombre, email, RUT o empresa.
// Devuelve una fila por persona (agrupada por email) con sus cursos y el enlace
// a su ficha (profile) o, si no tiene perfil, a su inscripción más reciente.
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const raw = (new URL(request.url).searchParams.get("q") || "").trim();
  const q = raw.replace(/[%,()]/g, " ").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });
  const like = `%${q}%`;

  const [{ data: profs }, { data: regs }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email, rut, role")
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},rut.ilike.${like}`)
      .limit(15),
    supabaseAdmin
      .from("registrations")
      .select("id, first_name, last_name, email, organization, status, is_alumni, created_at, courses(title, code)")
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},organization.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  type Row = { key: string; name: string; email: string; role: string | null; href: string; courses: string[]; organization: string | null };
  const byEmail: Record<string, Row> = {};
  for (const p of (profs || []) as any[]) {
    const k = (p.email || p.id).toLowerCase();
    byEmail[k] = {
      key: k,
      name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
      email: p.email,
      role: p.role,
      href: p.role === "student" || !p.role ? `/admin/registros/${p.id}` : `/admin/perfiles`,
      courses: [],
      organization: null,
    };
  }
  for (const r of (regs || []) as any[]) {
    const k = (r.email || r.id).toLowerCase();
    const label = `${r.courses?.code || r.courses?.title || "Curso"}${r.is_alumni ? " 🎓" : r.status === "pending" ? " (pendiente)" : ""}`;
    if (!byEmail[k]) {
      byEmail[k] = {
        key: k,
        name: `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.email,
        email: r.email,
        role: "student",
        href: `/admin/registros/inscripcion/${r.id}`,
        courses: [],
        organization: r.organization || null,
      };
    }
    if (!byEmail[k].organization && r.organization) byEmail[k].organization = r.organization;
    if (byEmail[k].courses.length < 4 && !byEmail[k].courses.includes(label)) byEmail[k].courses.push(label);
  }
  return NextResponse.json({ results: Object.values(byEmail).slice(0, 12) });
}
