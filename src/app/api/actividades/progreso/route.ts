import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

// POST: Update activity progress + auto-complete module
export async function POST(request: Request) {
  try {
    const { registration_id, activity_id, status } = await request.json();

    if (!registration_id || !activity_id || !status) {
      return NextResponse.json({ error: "registration_id, activity_id y status requeridos" }, { status: 400 });
    }

    // Verify authenticated user
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verify registration belongs to user OR user is admin
    const { data: registration } = await supabaseAdmin
      .from("registrations")
      .select("id, email")
      .eq("id", registration_id)
      .single();

    if (!registration) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    const isOwner = registration.email === user.email;
    let isAdmin = false;
    if (!isOwner) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("email", user.email!)
        .maybeSingle();
      isAdmin = profile?.role === "admin";
    }

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const updateData: any = { registration_id, activity_id, status };
    if (status === "in_progress") updateData.started_at = now;
    if (status === "completed") updateData.completed_at = now;

    // Upsert activity progress
    const { error } = await supabaseAdmin
      .from("activity_progress")
      .upsert(updateData, { onConflict: "registration_id,activity_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get the activity's module
    const { data: activity } = await supabaseAdmin
      .from("module_activities")
      .select("module_id")
      .eq("id", activity_id)
      .single();

    if (!activity) return NextResponse.json({ success: true });

    // Check if all activities in this module are completed
    const { data: allActivities } = await supabaseAdmin
      .from("module_activities")
      .select("id")
      .eq("module_id", activity.module_id)
      .order("sort_order");

    const activityIds = (allActivities || []).map((a: any) => a.id);

    const { data: progressData } = await supabaseAdmin
      .from("activity_progress")
      .select("activity_id, status")
      .eq("registration_id", registration_id)
      .in("activity_id", activityIds);

    const completedCount = (progressData || []).filter((p: any) => p.status === "completed").length;
    const allCompleted = completedCount === activityIds.length && activityIds.length > 0;

    // Update module_progress accordingly
    if (status === "in_progress" || status === "completed") {
      // Ensure module is at least in_progress
      const { data: existingProgress } = await supabaseAdmin
        .from("module_progress")
        .select("status")
        .eq("registration_id", registration_id)
        .eq("module_id", activity.module_id)
        .single();

      if (!existingProgress) {
        await supabaseAdmin.from("module_progress").upsert({
          registration_id,
          module_id: activity.module_id,
          status: allCompleted ? "completed" : "in_progress",
          started_at: now,
          completed_at: allCompleted ? now : null,
        }, { onConflict: "registration_id,module_id" });
      } else if (allCompleted && existingProgress.status !== "completed") {
        await supabaseAdmin
          .from("module_progress")
          .update({ status: "completed", completed_at: now })
          .eq("registration_id", registration_id)
          .eq("module_id", activity.module_id);
      }
    }

    // If module completed, auto-start next module
    if (allCompleted) {
      const { data: currentModule } = await supabaseAdmin
        .from("course_modules")
        .select("course_id, sort_order")
        .eq("id", activity.module_id)
        .single();

      if (currentModule) {
        const { data: nextModule } = await supabaseAdmin
          .from("course_modules")
          .select("id")
          .eq("course_id", currentModule.course_id)
          .gt("sort_order", currentModule.sort_order)
          .order("sort_order")
          .limit(1)
          .single();

        if (nextModule) {
          await supabaseAdmin.from("module_progress").upsert({
            registration_id,
            module_id: nextModule.id,
            status: "in_progress",
            started_at: now,
          }, { onConflict: "registration_id,module_id" });
        }
      }
    }

    return NextResponse.json({ success: true, module_completed: allCompleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
