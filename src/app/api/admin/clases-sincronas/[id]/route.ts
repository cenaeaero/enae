import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// Detalle + lista de asistencia (con alumnos de la sesión/curso)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  const { data: cls } = await supabaseAdmin
    .from("synchronous_classes")
    .select("*, courses(title, code), sessions(dates, location)")
    .eq("id", id).maybeSingle();
  if (!cls) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // 1) attendance
  const { data: att, error: attErr } = await supabaseAdmin
    .from("class_attendance")
    .select("*")
    .eq("synchronous_class_id", id);
  if (attErr) console.error("class_attendance error:", attErr);

  const attArr = att || [];
  const regIds = attArr.map((a: any) => a.registration_id).filter(Boolean);

  // 2) registrations vinculadas — query separada con maybeSingle por cada id evitando bug del .in()
  let regs: any[] = [];
  if (regIds.length > 0) {
    // Probamos primero .in()
    const r1 = await supabaseAdmin
      .from("registrations")
      .select("id, first_name, last_name, email, status, organization, company_id")
      .in("id", regIds);
    if (r1.error) console.error(".in() error:", r1.error);
    if (r1.data && r1.data.length > 0) {
      regs = r1.data;
    } else {
      // Fallback: hacer queries individuales (lento pero seguro)
      console.warn(".in() returned empty, falling back to individual queries");
      const results = await Promise.all(
        regIds.map((rid) =>
          supabaseAdmin
            .from("registrations")
            .select("id, first_name, last_name, email, status, organization, company_id")
            .eq("id", rid)
            .maybeSingle()
        )
      );
      regs = results.map((r) => r.data).filter(Boolean) as any[];
    }
  }

  // 3) Candidatos del curso (todas las sesiones, incluyendo pendientes)
  // No filtramos por session_id ni excluimos pending: el admin decide a quién agregar.
  const cq = supabaseAdmin
    .from("registrations")
    .select("id, first_name, last_name, email, status, organization, company_id, session_id")
    .eq("course_id", cls.course_id)
    .in("status", ["pending", "confirmed", "completed"]);
  const { data: candidates, error: candErr } = await cq;
  if (candErr) console.error("candidates error:", candErr);

  return NextResponse.json({
    class: cls,
    registrations: regs || [],   // los inscritos en esta clase
    candidates: candidates || [], // todos los elegibles del curso/sesión
    attendance: att || [],
  });
}
