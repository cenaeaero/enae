import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireInstructor } from "@/lib/auth-instructor";
import { sendStaffMessageToStudent, sendInstructorMessageToAdmin } from "@/lib/email";

// Mensajería del instructor (vía service role — el cliente del navegador
// depende de RLS y no debe consultar estas tablas directamente):
//   GET                    → lista de sus alumnos asignados con último mensaje
//   GET ?registration_id   → hilo completo de mensajes de ese alumno
//   POST { registration_id, message }            → mensaje al alumno (+ notificación por correo)
//   POST { to_admin: true, subject, message }    → correo al administrador

async function ownsRegistration(instructorEmail: string, registrationId: string, isAdmin: boolean) {
  if (isAdmin) return true;
  const { count } = await supabaseAdmin
    .from("instructor_assignments")
    .select("id", { count: "exact", head: true })
    .eq("instructor_email", instructorEmail)
    .eq("registration_id", registrationId);
  return (count || 0) > 0;
}

export async function GET(request: Request) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const registrationId = url.searchParams.get("registration_id");
  const asInstructor = url.searchParams.get("as_instructor");
  const email = auth.isAdmin && asInstructor ? asInstructor : auth.email!;

  // Hilo de un alumno
  if (registrationId) {
    if (!(await ownsRegistration(email, registrationId, !!auth.isAdmin))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { data: msgs } = await supabaseAdmin
      .from("course_messages")
      .select("id, message, created_at, sender_profile_id, profiles:sender_profile_id(first_name, last_name, role, email)")
      .eq("registration_id", registrationId)
      .order("created_at", { ascending: true });
    return NextResponse.json({ messages: msgs || [] });
  }

  // Lista de alumnos asignados + último mensaje
  const { data: asgs } = await supabaseAdmin
    .from("instructor_assignments")
    .select("registration_id, scheduled_date, registrations(id, first_name, last_name, email, courses(title))")
    .eq("instructor_email", email)
    .order("scheduled_date", { ascending: true });

  const regIds = Array.from(new Set((asgs || []).map((a: any) => a.registration_id).filter(Boolean)));
  const lastByReg: Record<string, any> = {};
  if (regIds.length > 0) {
    const { data: msgs } = await supabaseAdmin
      .from("course_messages")
      .select("registration_id, message, created_at")
      .in("registration_id", regIds)
      .order("created_at", { ascending: false });
    for (const m of msgs || []) {
      if (!lastByReg[m.registration_id]) lastByReg[m.registration_id] = m;
    }
  }

  const seen = new Set<string>();
  const students = [];
  for (const a of (asgs || []) as any[]) {
    const r = a.registrations;
    if (!r || seen.has(r.id)) continue;
    seen.add(r.id);
    students.push({
      registration_id: r.id,
      name: `${r.last_name || ""}, ${r.first_name || ""}`.replace(/^, /, "").trim() || r.email,
      email: r.email,
      course: r.courses?.title || null,
      last_message: lastByReg[r.id]?.message || null,
      last_message_at: lastByReg[r.id]?.created_at || null,
    });
  }

  return NextResponse.json({ students });
}

export async function POST(request: Request) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const message = (body.message || "").trim();
  if (!message) return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });

  // Datos del instructor (nombre para las notificaciones)
  const { data: instProf } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("id", auth.profileId)
    .maybeSingle();
  const instructorName = instProf ? `${instProf.first_name || ""} ${instProf.last_name || ""}`.trim() : auth.email!;

  // Mensaje al administrador → correo con reply-to al instructor
  if (body.to_admin === true) {
    await sendInstructorMessageToAdmin({
      instructorEmail: auth.email!,
      instructorName,
      subject: (body.subject || "").trim().slice(0, 150),
      message: message.slice(0, 4000),
    });
    return NextResponse.json({ ok: true, sent: "admin" });
  }

  // Mensaje a un alumno → course_messages + notificación por correo
  const registrationId = body.registration_id;
  if (!registrationId) return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });
  if (!(await ownsRegistration(auth.email!, registrationId, !!auth.isAdmin))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from("course_messages").insert({
    registration_id: registrationId,
    sender_profile_id: auth.profileId,
    message: message.slice(0, 4000),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notificar al alumno por correo (best-effort)
  try {
    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id, first_name, last_name, email, courses(title)")
      .eq("id", registrationId)
      .maybeSingle();
    if (reg?.email) {
      await sendStaffMessageToStudent(
        reg.email,
        `${reg.first_name || ""} ${reg.last_name || ""}`.trim() || reg.email,
        instructorName,
        (reg as any).courses?.title || "tu curso",
        message,
        registrationId,
      );
    }
  } catch (e) { console.error(e); }

  return NextResponse.json({ ok: true, sent: "student" });
}
