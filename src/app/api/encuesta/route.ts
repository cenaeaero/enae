import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-service";

export async function POST(request: Request) {
  try {
    const { registrationId, questionnaireType, moduleName, answers } =
      await request.json();

    if (!registrationId || !questionnaireType || !answers) {
      return NextResponse.json(
        { error: "registrationId, questionnaireType y answers son requeridos" },
        { status: 400 }
      );
    }

    if (!["module", "course", "instructor"].includes(questionnaireType)) {
      return NextResponse.json(
        { error: "questionnaireType invalido" },
        { status: 400 }
      );
    }

    if (questionnaireType === "module" && !moduleName) {
      return NextResponse.json(
        { error: "moduleName es requerido para cuestionarios de modulo" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    // Verify registration belongs to user and is completed
    const { data: registration } = await supabaseAdmin
      .from("registrations")
      .select("id, status, email")
      .eq("id", registrationId)
      .single();

    if (!registration) {
      return NextResponse.json(
        { error: "Registro no encontrado" },
        { status: 404 }
      );
    }

    if (registration.email !== user.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (registration.status !== "completed") {
      return NextResponse.json(
        { error: "El curso debe estar completado para responder la encuesta" },
        { status: 403 }
      );
    }

    // Check if already responded
    const { data: existing } = await supabaseAdmin
      .from("survey_responses")
      .select("id")
      .eq("registration_id", registrationId)
      .eq("questionnaire_type", questionnaireType)
      .eq("module_name", moduleName || "")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Ya respondiste este cuestionario" },
        { status: 409 }
      );
    }

    // Insert survey response
    const { error: insertError } = await supabaseAdmin
      .from("survey_responses")
      .insert({
        registration_id: registrationId,
        profile_id: profile.id,
        questionnaire_type: questionnaireType,
        module_name: questionnaireType === "module" ? moduleName : null,
        answers,
      });

    if (insertError) {
      console.error("Survey insert error:", insertError);
      return NextResponse.json(
        { error: "Error al guardar la encuesta: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Survey error:", error);
    return NextResponse.json(
      { error: "Error interno: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
