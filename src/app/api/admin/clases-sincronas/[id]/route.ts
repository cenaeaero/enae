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

  // Alumnos asignados a ESTA clase (vía class_attendance con join embedded)
  const { data: att, error: attErr } = await supabaseAdmin
    .from("class_attendance")
    .select("*, registrations(id, first_name, last_name, email, status, rut, organization, company_id)")
    .eq("synchronous_class_id", id);
  if (attErr) console.error("class_attendance fetch error:", attErr);

  const regs = (att || [])
    .map((a: any) => a.registrations)
    .filter((r: any) => !!r);

  // Lista de candidatos disponibles del curso/sesión (para agregar más)
  let cq = supabaseAdmin
    .from("registrations")
    .select("id, first_name, last_name, email, status, rut, organization, company_id")
    .eq("course_id", cls.course_id)
    .in("status", ["confirmed", "completed"]);
  if (cls.session_id) cq = cq.eq("session_id", cls.session_id);
  const { data: candidates, error: candErr } = await cq;
  if (candErr) console.error("candidates fetch error:", candErr);

  return NextResponse.json({
    class: cls,
    registrations: regs || [],   // los inscritos en esta clase
    candidates: candidates || [], // todos los elegibles del curso/sesión
    attendance: att || [],
  });
}
