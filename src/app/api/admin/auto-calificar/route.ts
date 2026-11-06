import { NextResponse } from "next/server";
import { runAutoCalificar } from "@/lib/auto-calificar";
import { requireAdmin } from "@/lib/auth-instructor";

// Auto-grading endpoint — thin wrapper over lib/auto-calificar. Used by
// the admin grades UI after saving, and available as a standalone tool.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { registration_id, course_id } = await request.json();
    if (!registration_id && !course_id) {
      return NextResponse.json({ error: "registration_id o course_id requerido" }, { status: 400 });
    }
    const result = await runAutoCalificar({ registration_id, course_id });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[auto-calificar] Error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
