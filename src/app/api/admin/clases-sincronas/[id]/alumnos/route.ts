import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// POST { registration_ids: string[] } → agrega alumnos a la clase
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const body = await request.json();
  if (!Array.isArray(body.registration_ids) || body.registration_ids.length === 0) {
    return NextResponse.json({ error: "registration_ids[] requerido" }, { status: 400 });
  }
  const rows = body.registration_ids.map((rid: string) => ({
    synchronous_class_id: id,
    registration_id: rid,
    status: "absent",
  }));
  const { error } = await supabaseAdmin
    .from("class_attendance")
    .upsert(rows, { onConflict: "synchronous_class_id,registration_id", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, added: rows.length });
}

// DELETE ?registration_id=... → quita un alumno de la clase
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const regId = new URL(request.url).searchParams.get("registration_id");
  if (!regId) return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });
  const { error } = await supabaseAdmin
    .from("class_attendance")
    .delete()
    .eq("synchronous_class_id", id)
    .eq("registration_id", regId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
