import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    // Verify authenticated user
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado. Inicia sesion primero." },
        { status: 401 }
      );
    }

    const { courseId, sessionId } = await request.json();

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId es requerido." },
        { status: 400 }
      );
    }

    // Get user's profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado." },
        { status: 400 }
      );
    }

    // Check if already registered for this course
    const { data: existingReg } = await supabaseAdmin
      .from("registrations")
      .select("id")
      .eq("email", profile.email)
      .eq("course_id", courseId)
      .single();

    if (existingReg) {
      return NextResponse.json(
        { error: "Ya estas inscrito en este curso.", registrationId: existingReg.id },
        { status: 400 }
      );
    }

    // Resolve session if not provided - get first active session
    let resolvedSessionId = sessionId || null;
    if (!resolvedSessionId) {
      const { data: firstSession } = await supabaseAdmin
        .from("sessions")
        .select("id")
        .eq("course_id", courseId)
        .eq("is_active", true)
        .limit(1)
        .single();
      if (firstSession) resolvedSessionId = firstSession.id;
    }

    // Create registration using existing profile data
    const { data: registration, error: regError } = await supabaseAdmin
      .from("registrations")
      .insert({
        course_id: courseId,
        session_id: resolvedSessionId,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        title: profile.title,
        job_title: profile.job_title,
        organization: profile.organization,
        organization_type: profile.organization_type,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        postal_code: profile.postal_code,
        country: profile.country || "Chile",
        phone: profile.phone,
        status: "pending",
      })
      .select()
      .single();

    if (regError) {
      return NextResponse.json(
        { error: "Error al crear registro: " + regError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      registrationId: registration.id,
    });
  } catch (error: any) {
    console.error("Internal registration error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
