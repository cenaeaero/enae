import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

// POST: admin marks all activities of a registration as completed.
// Useful when the alumno has already done the content but never
// clicked "Marcar como completada" (or there was a sync issue).
// Body: { registration_id: string }
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: caller } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (caller?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { registration_id } = await request.json();
    if (!registration_id) {
      return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });
    }

    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id, course_id")
      .eq("id", registration_id)
      .maybeSingle();
    if (!reg) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });

    // Get all modules + activities of this course (excluding exams, which require their own grading)
    const { data: modules } = await supabaseAdmin
      .from("course_modules")
      .select("id")
      .eq("course_id", reg.course_id);
    const moduleIds = (modules || []).map((m: any) => m.id);
    if (moduleIds.length === 0) {
      return NextResponse.json({ success: true, marked: 0 });
    }

    const { data: activities } = await supabaseAdmin
      .from("module_activities")
      .select("id, type")
      .in("module_id", moduleIds)
      .neq("type", "exam");
    const activityIds = (activities || []).map((a: any) => a.id);
    if (activityIds.length === 0) {
      return NextResponse.json({ success: true, marked: 0 });
    }

    const now = new Date().toISOString();
    const rows = activityIds.map((aid) => ({
      registration_id,
      activity_id: aid,
      status: "completed" as const,
      started_at: now,
      completed_at: now,
    }));

    const { error: upErr } = await supabaseAdmin
      .from("activity_progress")
      .upsert(rows, { onConflict: "registration_id,activity_id" });
    if (upErr) {
      return NextResponse.json({ error: "Error: " + upErr.message }, { status: 500 });
    }

    // Mark all modules as completed too
    const moduleRows = moduleIds.map((mid) => ({
      registration_id,
      module_id: mid,
      status: "completed" as const,
      started_at: now,
      completed_at: now,
    }));
    await supabaseAdmin
      .from("module_progress")
      .upsert(moduleRows, { onConflict: "registration_id,module_id" });

    return NextResponse.json({ success: true, marked: activityIds.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
