import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// PATCH: bulk update attendance
//   body: { items: [{ registration_id, status, notes? }] }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json();
  if (!Array.isArray(body.items)) return NextResponse.json({ error: "items[] requerido" }, { status: 400 });

  const rows = body.items.map((it: any) => ({
    synchronous_class_id: id,
    registration_id: it.registration_id,
    status: it.status || "absent",
    notes: it.notes || null,
    marked_by: auth.email,
    marked_at: new Date().toISOString(),
    arrived_at: it.status === "present" || it.status === "late" ? new Date().toISOString() : null,
  }));

  const { error } = await supabaseAdmin
    .from("class_attendance")
    .upsert(rows, { onConflict: "synchronous_class_id,registration_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
