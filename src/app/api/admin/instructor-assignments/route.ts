import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const u = new URL(request.url);
  const registrationId = u.searchParams.get("registration_id");

  let q = supabaseAdmin
    .from("instructor_assignments")
    .select("*, registrations(id, first_name, last_name, email, organization, course_id, courses(title, code)), instructor_assignment_documents(id, file_name, file_path, uploaded_at), practical_evaluations(id, status, pre_solo_result, completed_at)")
    .order("created_at", { ascending: false });
  if (registrationId) q = q.eq("registration_id", registrationId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (!body.instructor_email || !body.registration_id) {
    return NextResponse.json({ error: "instructor_email y registration_id requeridos" }, { status: 400 });
  }

  const payload = {
    instructor_email: body.instructor_email.toLowerCase().trim(),
    registration_id: body.registration_id,
    kind: body.kind || "practical",
    city: body.city || null,
    scheduled_date: body.scheduled_date || null,
    start_time: body.start_time || null,
    location_name: body.location_name || null,
    location_url: body.location_url || null,
    status: "assigned",
  };
  const { data, error } = await supabaseAdmin
    .from("instructor_assignments").insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data });
}

// PATCH { ids: string[], fields: { city?, scheduled_date?, start_time?, location_name?, location_url? } }
// Actualiza la programación de la clase para varias asignaciones a la vez.
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);
  if (ids.length === 0) return NextResponse.json({ error: "ids requerido" }, { status: 400 });

  const allowed = ["city", "scheduled_date", "start_time", "location_name", "location_url", "kind", "status"];
  const updates: Record<string, any> = {};
  for (const k of allowed) {
    if (body.fields && k in body.fields) updates[k] = body.fields[k] === "" ? null : body.fields[k];
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("instructor_assignments")
    .update(updates)
    .in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: ids.length });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const { error } = await supabaseAdmin.from("instructor_assignments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
