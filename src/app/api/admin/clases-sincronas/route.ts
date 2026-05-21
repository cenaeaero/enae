import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const u = new URL(request.url);
  const courseId = u.searchParams.get("course_id");
  let q = supabaseAdmin
    .from("synchronous_classes")
    .select("*, courses(title, code), sessions(dates, location)")
    .order("scheduled_at", { ascending: false });
  if (courseId) q = q.eq("course_id", courseId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ classes: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (!body.course_id || !body.title || !body.scheduled_at) {
    return NextResponse.json({ error: "course_id, title y scheduled_at requeridos" }, { status: 400 });
  }

  const payload = {
    course_id: body.course_id,
    session_id: body.session_id || null,
    title: body.title,
    description: body.description || null,
    kind: body.kind || "class",
    link_url: body.link_url || null,
    scheduled_at: body.scheduled_at,
    duration_minutes: body.duration_minutes ?? 60,
    instructor_email: body.instructor_email || null,
    created_by: auth.email,
    notes: body.notes || null,
  };

  const { data, error } = await supabaseAdmin
    .from("synchronous_classes").insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ class: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("synchronous_classes").update(rest).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ class: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const { error } = await supabaseAdmin.from("synchronous_classes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
