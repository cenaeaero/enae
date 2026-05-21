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
    .select("*, registrations(id, first_name, last_name, email, course_id, courses(title, code))")
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
    status: "assigned",
  };
  const { data, error } = await supabaseAdmin
    .from("instructor_assignments").insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data });
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
