import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

// POST: Mark task as completed
export async function POST(request: Request) {
  try {
    const { activity_id, registration_id } = await request.json();

    if (!activity_id || !registration_id) {
      return NextResponse.json({ error: "activity_id y registration_id requeridos" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("task_submissions")
      .upsert({ activity_id, registration_id }, { onConflict: "activity_id,registration_id" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ submission: data });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
