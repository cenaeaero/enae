import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-service";

export async function POST(request: Request) {
  try {
    const { registrationId, message } = await request.json();

    if (!registrationId || !message?.trim()) {
      return NextResponse.json(
        { error: "registrationId y message son requeridos" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verify registration belongs to user (students) or allow admins/instructors
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    if (profile.role === "student") {
      const { data: reg } = await supabaseAdmin
        .from("registrations")
        .select("id, email")
        .eq("id", registrationId)
        .single();
      if (!reg || reg.email !== user.email) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("course_messages")
      .insert({
        registration_id: registrationId,
        sender_profile_id: profile.id,
        message: message.trim(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al enviar mensaje: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registrationId");

    if (!registrationId) {
      return NextResponse.json(
        { error: "registrationId es requerido" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verify registration belongs to user or user is admin/instructor
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.role === "student") {
      const { data: reg } = await supabaseAdmin
        .from("registrations")
        .select("id, email")
        .eq("id", registrationId)
        .single();
      if (!reg || reg.email !== user.email) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("course_messages")
      .select("*, profiles:sender_profile_id (first_name, last_name, role)")
      .eq("registration_id", registrationId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Error al cargar mensajes: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
