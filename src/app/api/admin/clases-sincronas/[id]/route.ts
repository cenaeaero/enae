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

  // Alumnos asignados a ESTA clase (vía class_attendance)
  const { data: att } = await supabaseAdmin
    .from("class_attendance")
    .select("*")
    .eq("synchronous_class_id", id);

  const regIds = (att || []).map((a: any) => a.registration_id);
  const { data: regs } = regIds.length === 0
    ? { data: [] as any[] }
    : await supabaseAdmin
        .from("registrations")
        .select("id, first_name, last_name, email, status, rut, organization, company_id")
        .in("id", regIds);

  // Lista de candidatos disponibles del curso/sesión (para agregar más)
  let cq = supabaseAdmin
    .from("registrations")
    .select("id, first_name, last_name, email, status, rut, organization, company_id")
    .eq("course_id", cls.course_id)
    .in("status", ["confirmed", "completed"]);
  if (cls.session_id) cq = cq.eq("session_id", cls.session_id);
  const { data: candidates } = await cq;

  return NextResponse.json({
    class: cls,
    registrations: regs || [],   // los inscritos en esta clase
    candidates: candidates || [], // todos los elegibles del curso/sesión
    attendance: att || [],
  });
}
