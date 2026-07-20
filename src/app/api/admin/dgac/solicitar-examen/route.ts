import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import { sendSolicitudExamenTeoricos, TEORICOS_DGAC_EMAIL, type SolicitudExamenStudent } from "@/lib/email";

async function verifyAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.id) return null;
  let { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile && user.email) {
    const { data: byEmail } = await supabaseAdmin
      .from("profiles")
      .select("role, id")
      .eq("email", user.email)
      .limit(1);
    if (byEmail?.[0]) profile = byEmail[0];
  }
  return profile?.role === "admin" ? user : null;
}

// POST { registration_ids: string[], cc_alumnos?: boolean, mensaje_extra?: string }
// Envía UN solo correo a Teóricos Licencias DGAC con los datos de todos los
// alumnos seleccionados (Nombre, RUT/Pasaporte, N° Folio, fecha, unidad).
// Santiago → agendamiento directo. Provincia → apertura en SIPA, exige que la
// pre-coordinación con la unidad esté marcada (unidad_coordinada).
export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await request.json();
    const ids: string[] = Array.isArray(body.registration_ids) ? body.registration_ids : [];
    const ccAlumnos = body.cc_alumnos === true;
    const mensajeExtra = typeof body.mensaje_extra === "string" ? body.mensaje_extra.slice(0, 1000) : "";

    if (ids.length === 0) {
      return NextResponse.json({ error: "registration_ids requerido" }, { status: 400 });
    }

    const students: SolicitudExamenStudent[] = [];
    const procedureIds: string[] = [];
    const problems: string[] = [];
    let anyProvincia = false;
    let anySantiago = false;

    for (const regId of ids) {
      const { data: reg } = await supabaseAdmin
        .from("registrations")
        .select("id, first_name, last_name, email")
        .eq("id", regId)
        .maybeSingle();
      if (!reg) { problems.push(`Registro ${regId} no encontrado`); continue; }

      const name = `${reg.first_name || ""} ${reg.last_name || ""}`.trim() || reg.email;

      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("rut")
        .eq("email", reg.email)
        .maybeSingle();

      const { data: procedure } = await supabaseAdmin
        .from("dgac_procedures")
        .select("*")
        .eq("registration_id", regId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!procedure) { problems.push(`${name}: sin trámite DGAC creado`); continue; }
      if (!prof?.rut) { problems.push(`${name}: falta RUT/Pasaporte en el perfil`); continue; }
      if (!procedure.folio_number) { problems.push(`${name}: falta N° de Folio`); continue; }
      if (!procedure.exam_datetime) { problems.push(`${name}: falta fecha y hora del examen`); continue; }
      if (!procedure.exam_unit_city) { problems.push(`${name}: falta unidad/ciudad del examen`); continue; }

      const esSantiago = procedure.exam_unit_city.trim().toLowerCase() === "santiago";
      if (esSantiago) anySantiago = true; else anyProvincia = true;
      if (!esSantiago && procedure.unidad_coordinada !== true) {
        problems.push(`${name}: examen en ${procedure.exam_unit_city} — primero debe completarse la pre-coordinación con la unidad DGAC`);
        continue;
      }

      students.push({
        name,
        rut: prof.rut,
        folio: procedure.folio_number,
        examDatetime: procedure.exam_datetime,
        unitCity: procedure.exam_unit_city,
        email: reg.email || null,
      });
      procedureIds.push(procedure.id);
    }

    if (problems.length > 0) {
      return NextResponse.json({ error: "Faltan datos para enviar la solicitud", missing: problems }, { status: 400 });
    }
    if (anySantiago && anyProvincia) {
      return NextResponse.json({ error: "No mezclar alumnos de Santiago con alumnos de provincia en un mismo envío: son solicitudes distintas (agendamiento vs apertura en SIPA)." }, { status: 400 });
    }

    await sendSolicitudExamenTeoricos({
      students,
      ccAlumnos,
      esApertura: anyProvincia,
      mensajeExtra: mensajeExtra || undefined,
    });

    const now = new Date().toISOString();
    for (const pid of procedureIds) {
      await supabaseAdmin
        .from("dgac_procedures")
        .update({ solicitud_teoricos_at: now, updated_at: now })
        .eq("id", pid);
      await supabaseAdmin.from("dgac_procedure_history").insert({
        procedure_id: pid,
        field_name: "solicitud_teoricos_at",
        old_value: null,
        new_value: `Solicitud enviada a ${TEORICOS_DGAC_EMAIL} (${students.length} alumno${students.length > 1 ? "s" : ""}${ccAlumnos ? ", con copia a alumnos" : ""})`,
      });
    }

    return NextResponse.json({ success: true, sent_to: TEORICOS_DGAC_EMAIL, count: students.length, es_apertura: anyProvincia });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
