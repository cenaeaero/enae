import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import { generateDgacCertificatePdf } from "@/lib/certificado-dgac-pdf";
import { allGradesEntered } from "@/lib/grades-helper";

// GET: download DGAC certificate as PDF.
// Access: admins can download any; students can download only their own completed courses.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registration_id");
    const skipGradeCheck = searchParams.get("skip_grade_check") === "true";
    if (!registrationId) {
      return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });
    }

    // Auth
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // Load registration (rut and folio_enae live on profiles, not registrations)
    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id, first_name, last_name, email, instruction_city, organization, created_at, completed_at, status, final_score, course_id")
      .eq("id", registrationId)
      .maybeSingle();

    if (!reg) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });

    // Load RUT + folio from profiles by email
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("rut, folio_enae")
      .eq("email", reg.email)
      .maybeSingle();

    const isOwner = reg.email === user.email;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("email", user.email)
      .maybeSingle();
    const isAdmin = profile?.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // STRICT GATE 1: block download until every grade_item has a score
    // (including the practical evaluation entered manually). Apply to both
    // admin and student — a certificate for an incomplete record must not
    // leave the platform.
    //
    // Exception: admins can pre-print certificates for presencial courses
    // with ?skip_grade_check=true (certificates get signed at training).
    if (!(isAdmin && skipGradeCheck)) {
      const grades = await allGradesEntered(reg.id, reg.course_id);
      if (!grades.allGraded) {
        return NextResponse.json(
          {
            error: "No se puede generar el certificado: faltan calificaciones por ingresar.",
            missing: grades.missing,
            filled: grades.filled,
            total: grades.total,
          },
          { status: 400 }
        );
      }
    }

    // STRICT GATE 2: block download until alumno has completed 100% of
    // course activities. Skip for presencial courses (attendance is the
    // proof of completion) and for the admin pre-print path.
    {
      const { data: regWithMode } = await supabaseAdmin
        .from("registrations")
        .select("delivery_mode, is_alumni")
        .eq("id", reg.id)
        .maybeSingle();
      const isPresencial = regWithMode?.delivery_mode === "presencial";
      const isAlumni = regWithMode?.is_alumni === true;

      // Presencial → skip (in-person attendance verifies completion).
      // Alumni → skip (already graduated; certificate may be re-issued).
      // Otherwise (online courses) the gate applies even for admins with
      // skip_grade_check, because the requirement is "100% módulos finalizados".
      if (!isPresencial && !isAlumni) {
        // Compute progress: completed activity_progress rows / total activities in course
        const { data: modules } = await supabaseAdmin
          .from("course_modules")
          .select("id")
          .eq("course_id", reg.course_id);
        const moduleIds = (modules || []).map((m: any) => m.id);
        let totalActivities = 0;
        let completedActivities = 0;
        if (moduleIds.length > 0) {
          const { data: activities } = await supabaseAdmin
            .from("module_activities")
            .select("id")
            .in("module_id", moduleIds);
          const activityIds = (activities || []).map((a: any) => a.id);
          totalActivities = activityIds.length;
          if (totalActivities > 0) {
            const { data: prog } = await supabaseAdmin
              .from("activity_progress")
              .select("activity_id")
              .eq("registration_id", reg.id)
              .eq("status", "completed")
              .in("activity_id", activityIds);
            completedActivities = (prog || []).length;
          }
        }

        if (totalActivities > 0 && completedActivities < totalActivities) {
          return NextResponse.json(
            {
              error: `No se puede descargar el certificado: el alumno aún no ha finalizado todos los módulos (${completedActivities}/${totalActivities} actividades completadas).`,
              completed_activities: completedActivities,
              total_activities: totalActivities,
            },
            { status: 400 }
          );
        }
      }
    }

    // Load course (SELECT * avoids breaking when an expected column doesn't exist)
    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("id", reg.course_id)
      .single();

    if (courseErr || !course) {
      console.error("[certificado-dgac] course lookup failed", { course_id: reg.course_id, err: courseErr });
      return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    }

    const c: any = course;

    // Gate: this DGAC certificate only applies to courses that issue it
    if (c.has_dgac_certificate !== true) {
      return NextResponse.json(
        { error: "Este curso no emite Certificado DGAC." },
        { status: 400 }
      );
    }
    const theoretical = c.theoretical_hours ?? c.horas_teoricas ?? 0;
    const practical = c.practical_hours ?? c.horas_practicas ?? 0;
    const totalHours = (theoretical + practical) || c.total_hours || c.hours || 34;
    const completedAt = reg.completed_at || new Date().toISOString();
    const startAt = reg.created_at || completedAt;

    // Load course modules for page 2 (the certificate lists them as course contents)
    const { data: modules } = await supabaseAdmin
      .from("course_modules")
      .select("sort_order, title")
      .eq("course_id", reg.course_id)
      .order("sort_order");

    // Verification URL: uses the diploma's verification code if present, otherwise
    // falls back to a registration-based URL on the public /verificar page.
    const { data: diploma } = await supabaseAdmin
      .from("diplomas")
      .select("verification_code")
      .eq("registration_id", reg.id)
      .maybeSingle();

    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.enae.cl";
    // Human-readable verification code: diploma's code if available,
    // otherwise the first 8 chars of the registration UUID (uppercase)
    const verificationCode = diploma?.verification_code || String(reg.id).slice(0, 8).toUpperCase();
    const verificationUrl = diploma?.verification_code
      ? `${site}/verificar?code=${diploma.verification_code}&type=certificate`
      : `${site}/verificar?reg=${reg.id}&type=certificate`;

    const pdfBuffer = await generateDgacCertificatePdf({
      studentName: `${reg.first_name || ""} ${reg.last_name || ""}`.trim(),
      rut: prof?.rut || null,
      courseName: c.title,
      city: reg.instruction_city || "Antofagasta",
      startDate: startAt,
      endDate: completedAt,
      totalHours,
      folio: prof?.folio_enae || null,
      year: new Date(completedAt).getFullYear(),
      habilitaciones: c.dgac_habilitaciones || null,
      modules: modules || null,
      verificationUrl,
      verificationCode,
    });

    const folio = (prof?.folio_enae || "SIN_FOLIO").replace(/[^A-Za-z0-9]+/g, "_");
    const nombre = `${reg.first_name || ""}_${reg.last_name || ""}`.replace(/[^A-Za-z0-9]+/g, "_");
    const curso = ((c as any).code || (c as any).title || "").replace(/[^A-Za-z0-9]+/g, "_");
    const fileName = `${folio}_${nombre}_${curso}.pdf`;

    // Convert ArrayBuffer to Uint8Array for proper Next.js response serialization
    const bytes = new Uint8Array(pdfBuffer);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err: any) {
    console.error("[certificado-dgac] Error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
