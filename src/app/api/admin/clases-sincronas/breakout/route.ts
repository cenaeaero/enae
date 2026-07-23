import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";
import { extractZoomMeetingId, setBreakoutRooms } from "@/lib/zoom";

// POST { class_id, preview?: boolean }
// Agrupa por empresa a los alumnos ONLINE del curso de la clase sincrónica y
// preasigna las salas (breakout rooms) en la reunión de Zoom asociada.
// preview=true → devuelve los grupos sin tocar Zoom.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const classId = body.class_id;
  if (!classId) return NextResponse.json({ error: "class_id requerido" }, { status: 400 });

  const { data: clase } = await supabaseAdmin
    .from("synchronous_classes")
    .select("id, title, course_id, session_id, link_url")
    .eq("id", classId)
    .maybeSingle();
  if (!clase) return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });

  const meetingId = extractZoomMeetingId(clase.link_url);
  if (!body.preview && !meetingId) {
    return NextResponse.json({ error: "La clase no tiene un link de Zoom válido para preasignar salas. Agrega el link de la reunión (…/j/1234567890)." }, { status: 400 });
  }

  // Alumnos ONLINE del curso (y de la sesión si la clase la especifica)
  let q = supabaseAdmin
    .from("registrations")
    .select("email, first_name, last_name, organization, company_id, delivery_mode, status")
    .eq("course_id", clase.course_id)
    .eq("delivery_mode", "online")
    .in("status", ["confirmed", "completed"]);
  if (clase.session_id) q = q.eq("session_id", clase.session_id);
  const { data: regs } = await q;

  const online = (regs || []).filter((r: any) => r.email);
  if (online.length === 0) {
    return NextResponse.json({ error: "No hay alumnos inscritos en modalidad online sincrónico para esta clase." }, { status: 400 });
  }

  // Agrupar por empresa (organization; "Sin empresa" para los que no tienen)
  const byCompany: Record<string, { name: string; participants: string[] }> = {};
  for (const r of online as any[]) {
    const key = (r.organization || "Sin empresa").trim() || "Sin empresa";
    if (!byCompany[key]) byCompany[key] = { name: key, participants: [] };
    byCompany[key].participants.push(r.email.toLowerCase());
  }
  const rooms = Object.values(byCompany)
    .map((r) => ({ name: r.name.slice(0, 60), participants: Array.from(new Set(r.participants)) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (body.preview) {
    return NextResponse.json({
      preview: true,
      total_online: online.length,
      rooms: rooms.map((r) => ({ name: r.name, count: r.participants.length, participants: r.participants })),
      has_meeting: !!meetingId,
    });
  }

  try {
    await setBreakoutRooms(meetingId!, rooms);
  } catch (e: any) {
    return NextResponse.json({ error: `No se pudieron preasignar las salas en Zoom: ${e?.message || "error"}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    rooms_created: rooms.length,
    total_online: online.length,
    rooms: rooms.map((r) => ({ name: r.name, count: r.participants.length })),
  });
}
