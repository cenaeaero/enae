import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import { buildSolicitudCredencialSIPA, sendSolicitudCredencialSIPA, AYUDA_SIPA_EMAIL } from "@/lib/email";

async function verifyAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.id) return null;
  let { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (!profile && user.email) {
    const { data: byEmail } = await supabaseAdmin.from("profiles").select("role").eq("email", user.email).limit(1);
    if (byEmail?.[0]) profile = byEmail[0];
  }
  return profile?.role === "admin" ? user : null;
}

// POST { registration_id, cc_alumno?, cc_supervisor?, mensaje_extra?, preview? }
// Solicita a Ayuda SIPA (DGAC) la ACTUALIZACIÓN de la credencial RPAS con la
// habilitación del curso aprobado. No coordina fecha; referencia el folio bajo el
// cual ya se subieron el Apéndice C y el certificado del curso.
export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await request.json();
    const regId: string = body.registration_id;
    if (!regId) return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });
    const ccAlumno = body.cc_alumno === true;
    const ccSupervisor = body.cc_supervisor === true;
    const mensajeExtra = typeof body.mensaje_extra === "string" ? body.mensaje_extra.slice(0, 1000) : "";

    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id, first_name, last_name, email, supervisor_email, course_id")
      .eq("id", regId)
      .maybeSingle();
    if (!reg) return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });

    const studentName = `${reg.first_name || ""} ${reg.last_name || ""}`.trim() || reg.email;

    const { data: prof } = await supabaseAdmin
      .from("profiles").select("rut, supervisor_email").eq("email", reg.email).maybeSingle();

    const { data: course } = await supabaseAdmin
      .from("courses").select("title, dgac_habilitaciones").eq("id", reg.course_id).maybeSingle();

    const { data: procedure } = await supabaseAdmin
      .from("dgac_procedures").select("id, folio_number, dgac_credential_number")
      .eq("registration_id", regId).order("created_at", { ascending: false }).limit(1).maybeSingle();

    // Validaciones
    const problems: string[] = [];
    if (!prof?.rut) problems.push("Falta RUT/Pasaporte en el perfil del alumno.");
    if (!procedure?.folio_number) problems.push("Falta el N° de Folio (ingrésalo en la sección de folios del trámite DGAC).");
    if (problems.length > 0) {
      return NextResponse.json({ error: "Faltan datos para la solicitud", missing: problems }, { status: 400 });
    }

    const args = {
      studentName,
      rut: prof!.rut as string,
      credencial: (procedure as any)?.dgac_credential_number || null,
      courseName: course?.title || "Curso ENAE",
      habilitacion: (course as any)?.dgac_habilitaciones || course?.title || "—",
      folio: procedure!.folio_number as string,
      ccAlumno,
      ccSupervisor,
      studentEmail: reg.email || null,
      supervisorEmail: prof?.supervisor_email || reg.supervisor_email || null,
      mensajeExtra: mensajeExtra || undefined,
    };

    if (body.preview === true) {
      const draft = buildSolicitudCredencialSIPA(args);
      return NextResponse.json({ preview: true, ...draft });
    }

    await sendSolicitudCredencialSIPA(args);

    const now = new Date().toISOString();
    if (procedure?.id) {
      await supabaseAdmin.from("dgac_procedures").update({ solicitud_credencial_at: now, updated_at: now }).eq("id", procedure.id);
      await supabaseAdmin.from("dgac_procedure_history").insert({
        procedure_id: procedure.id,
        field_name: "solicitud_credencial_at",
        old_value: null,
        new_value: `Solicitud de actualización de credencial enviada a ${AYUDA_SIPA_EMAIL} (folio ${procedure.folio_number})`,
      });
    }

    return NextResponse.json({ success: true, sent_to: AYUDA_SIPA_EMAIL });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
