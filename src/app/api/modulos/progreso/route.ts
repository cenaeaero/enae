import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-service";

export async function POST(request: Request) {
  try {
    const { registrationId, moduleId, status } = await request.json();

    if (!registrationId || !moduleId || !status) {
      return NextResponse.json(
        { error: "registrationId, moduleId y status son requeridos" },
        { status: 400 }
      );
    }

    if (!["not_started", "in_progress", "completed"].includes(status)) {
      return NextResponse.json(
        { error: "status invalido" },
        { status: 400 }
      );
    }

    // Verify authenticated user
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verify registration belongs to user
    const { data: registration } = await supabaseAdmin
      .from("registrations")
      .select("id, email")
      .eq("id", registrationId)
      .single();

    if (!registration || registration.email !== user.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = { status };
    if (status === "in_progress") updates.started_at = now;
    if (status === "completed") updates.completed_at = now;

    // Upsert progress
    const { error } = await supabaseAdmin
      .from("module_progress")
      .upsert(
        {
          registration_id: registrationId,
          module_id: moduleId,
          ...updates,
        },
        { onConflict: "registration_id,module_id" }
      );

    if (error) {
      return NextResponse.json(
        { error: "Error al actualizar progreso: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
