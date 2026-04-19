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
    let isAdmin = false;
    if (!isOwner) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("email", user.email)
        .maybeSingle();
      isAdmin = profile?.role === "admin";
    }
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // STRICT GATE: block download until every grade_item has a score
    // (including the practical evaluation entered manually). Apply to both
    // admin and student — a certificate for an incomplete record must not
    // leave the platform.
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

    // Load course
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("title, code, theoretical_hours, practical_hours, dgac_habilitaciones, dgac_content_list")
      .eq("id", reg.course_id)
      .single();

    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const totalHours = (course.theoretical_hours || 0) + (course.practical_hours || 0);
    const completedAt = reg.completed_at || new Date().toISOString();
    const startAt = reg.created_at || completedAt;

    // Parse content list (stored as newline-delimited text)
    let contentList: string[] | null = null;
    if (course.dgac_content_list) {
      const list = course.dgac_content_list
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean);
      if (list.length > 0) contentList = list;
    }

    const pdfBuffer = generateDgacCertificatePdf({
      studentName: `${reg.first_name || ""} ${reg.last_name || ""}`.trim(),
      rut: prof?.rut || null,
      courseName: course.title,
      city: reg.instruction_city || "Antofagasta",
      startDate: startAt,
      endDate: completedAt,
      totalHours,
      folio: prof?.folio_enae || null,
      year: new Date(completedAt).getFullYear(),
      habilitaciones: course.dgac_habilitaciones || null,
      contentList,
    });

    const safeName = `${reg.first_name || ""}_${reg.last_name || ""}`.replace(/[^A-Za-z0-9]+/g, "_");
    const fileName = `Certificado_DGAC_${safeName}.pdf`;

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
