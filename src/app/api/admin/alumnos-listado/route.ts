import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Profiles + conteo de cursos por email
  const [{ data: profiles }, { data: regs }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email, rut, folio_enae, organization, phone, role, created_at")
      .order("last_name", { ascending: true }),
    supabaseAdmin.from("registrations").select("email, status"),
  ]);

  const byEmail: Record<string, { total: number; completed: number; in_progress: number }> = {};
  for (const r of regs || []) {
    const e = (r.email || "").toLowerCase();
    if (!e) continue;
    byEmail[e] ||= { total: 0, completed: 0, in_progress: 0 };
    byEmail[e].total++;
    if (r.status === "completed") byEmail[e].completed++;
    else if (r.status === "confirmed") byEmail[e].in_progress++;
  }

  const alumnos = (profiles || []).map((p: any) => {
    const stats = byEmail[(p.email || "").toLowerCase()] || { total: 0, completed: 0, in_progress: 0 };
    return {
      id: p.id,
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      email: p.email,
      rut: p.rut,
      folio_enae: p.folio_enae,
      organization: p.organization,
      phone: p.phone,
      role: p.role || "student",
      created_at: p.created_at,
      total_courses: stats.total,
      completed_courses: stats.completed,
      in_progress_courses: stats.in_progress,
    };
  });

  return NextResponse.json({ alumnos });
}
