import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function POST() {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Update profile to mark password as changed
    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: false })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Password changed API error:", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
