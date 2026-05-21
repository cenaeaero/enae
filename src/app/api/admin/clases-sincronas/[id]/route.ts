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

  // Lista de inscripciones del curso/sesión
  let q = supabaseAdmin
    .from("registrations")
    .select("id, first_name, last_name, email, status, rut, organization")
    .eq("course_id", cls.course_id)
    .in("status", ["confirmed", "completed"]);
  if (cls.session_id) q = q.eq("session_id", cls.session_id);
  const { data: regs } = await q;

  // Asistencia existente
  const regIds = (regs || []).map((r: any) => r.id);
  const { data: att } = await supabaseAdmin
    .from("class_attendance")
    .select("*")
    .eq("synchronous_class_id", id)
    .in("registration_id", regIds.length > 0 ? regIds : ["00000000-0000-0000-0000-000000000000"]);

  return NextResponse.json({ class: cls, registrations: regs || [], attendance: att || [] });
}
