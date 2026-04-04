import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

async function verifyAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.id) return null;
  let { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile && user.email) {
    const { data: byEmail } = await supabaseAdmin
      .from("profiles")
      .select("role, id")
      .eq("email", user.email)
      .limit(1);
    if (byEmail?.[0]) {
      profile = byEmail[0];
      await supabaseAdmin.from("profiles").update({ user_id: user.id }).eq("id", byEmail[0].id);
    }
  }
  return profile?.role === "admin" ? user : null;
}

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Fetch all registrations using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .select("id, first_name, last_name, email, status, created_at, course_id, courses(title)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching registrations:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ registrations: data || [] });
  } catch (err: any) {
    console.error("Admin registros error:", err?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "id y status requeridos" }, { status: 400 });
    }

    const validStatuses = ["pending", "confirmed", "completed", "rejected", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("registrations")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating registration:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Admin registros PATCH error:", err?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
