import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import { findFinalExam } from "@/lib/examen-directo";

// Enlace directo al examen final de un curso (el que va en el código QR).
// Busca la inscripción del alumno autenticado en ese curso y lo lleva a su
// curso con el examen abierto. Sin sesión, pasa primero por el login.
export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const url = new URL(request.url);

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    const login = new URL("/tpems/login", url.origin);
    login.searchParams.set("next", url.pathname);
    return NextResponse.redirect(login);
  }

  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select("id, status")
    .eq("course_id", courseId)
    .ilike("email", user.email)
    .in("status", ["confirmed", "completed"])
    .order("created_at", { ascending: false })
    .limit(1);

  const reg = regs?.[0];
  if (!reg) return NextResponse.redirect(new URL("/tpems?aviso=sin-inscripcion", url.origin));

  const dest = new URL(`/tpems/curso/${reg.id}`, url.origin);
  dest.searchParams.set("tab", "modules");
  const exam = await findFinalExam(courseId);
  if (exam) dest.searchParams.set("examen", exam.activityId);
  return NextResponse.redirect(dest);
}
