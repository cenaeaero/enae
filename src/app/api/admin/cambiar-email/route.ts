import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

// POST: change a student's email everywhere (auth, profiles, registrations)
// Body: { registration_id: string, new_email: string }
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verify caller is admin
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { registration_id, new_email } = await request.json();
    if (!registration_id || !new_email) {
      return NextResponse.json({ error: "registration_id y new_email son requeridos" }, { status: 400 });
    }

    const newEmail = String(new_email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    // Get the current registration + linked profile
    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id, email")
      .eq("id", registration_id)
      .maybeSingle();
    if (!reg) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    const oldEmail = String(reg.email).toLowerCase();
    if (oldEmail === newEmail) {
      return NextResponse.json({ success: true, message: "El email es el mismo, no se realizó cambio" });
    }

    // Check if newEmail already exists in another profile
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id")
      .eq("email", newEmail)
      .maybeSingle();
    if (existingProfile) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 400 });
    }

    // Find the auth user via the existing profile (linked by old email)
    const { data: oldProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id")
      .eq("email", oldEmail)
      .maybeSingle();

    let authUserId = oldProfile?.user_id || null;

    // Update Supabase Auth user email
    if (authUserId) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        email: newEmail,
        email_confirm: true,
      });
      if (authErr) {
        return NextResponse.json({ error: "Error actualizando auth: " + authErr.message }, { status: 500 });
      }
    }

    // Update profiles.email
    if (oldProfile) {
      const { error: profErr } = await supabaseAdmin
        .from("profiles")
        .update({ email: newEmail })
        .eq("id", oldProfile.id);
      if (profErr) {
        return NextResponse.json({ error: "Error actualizando profile: " + profErr.message }, { status: 500 });
      }
    }

    // Update ALL registrations of this student (in case they're in multiple courses)
    const { error: regErr } = await supabaseAdmin
      .from("registrations")
      .update({ email: newEmail })
      .eq("email", oldEmail);
    if (regErr) {
      return NextResponse.json({ error: "Error actualizando registrations: " + regErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("cambiar-email error:", err?.message);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
