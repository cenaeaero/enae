import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import { generateDgacCertificatePdf } from "@/lib/certificado-dgac-pdf";
import { sendDgacCertificate } from "@/lib/email";
import { allGradesEntered } from "@/lib/grades-helper";

export async function POST(request: Request) {
  try {
    const { registration_id } = await request.json();
    if (!registration_id) {
      return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });
    }

    // Admin check
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("email", user.email)
      .maybeSingle();
    if (profile?.role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id, first_name, last_name, email, instruction_city, created_at, completed_at, status, course_id")
      .eq("id", registration_id)
      .maybeSingle();

    if (!reg) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("rut, folio_enae")
      .eq("email", reg.email)
      .maybeSingle();

    // STRICT GATE: all grade_items (including practical) must have a score.
    const grades = await allGradesEntered(reg.id, reg.course_id);
    if (!grades.allGraded) {
      return NextResponse.json(
        {
          error: "No se puede enviar el certificado: faltan calificaciones por ingresar.",
          missing: grades.missing,
          filled: grades.filled,
          total: grades.total,
        },
        { status: 400 }
      );
    }

    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("id", reg.course_id)
      .single();

    if (courseErr || !course) {
      return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    }

    const c: any = course;

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

    const { data: modules } = await supabaseAdmin
      .from("course_modules")
      .select("sort_order, title")
      .eq("course_id", reg.course_id)
      .order("sort_order");

    const { data: diploma } = await supabaseAdmin
      .from("diplomas")
      .select("verification_code")
      .eq("registration_id", reg.id)
      .maybeSingle();

    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.enae.cl";
    const verificationUrl = diploma?.verification_code
      ? `${site}/verificar?code=${diploma.verification_code}`
      : `${site}/verificar?reg=${reg.id}`;

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
    });

    const folio = (prof?.folio_enae || "SIN_FOLIO").replace(/[^A-Za-z0-9]+/g, "_");
    const nombre = `${reg.first_name || ""}_${reg.last_name || ""}`.replace(/[^A-Za-z0-9]+/g, "_");
    const curso = (c.code || c.title || "").replace(/[^A-Za-z0-9]+/g, "_");
    const fileName = `${folio}_${nombre}_${curso}.pdf`;

    await sendDgacCertificate(
      `${reg.first_name} ${reg.last_name}`,
      reg.email,
      c.title,
      Buffer.from(pdfBuffer as ArrayBuffer),
      fileName,
    );

    return NextResponse.json({ ok: true, sent_to: reg.email });
  } catch (err: any) {
    console.error("[enviar-certificado-dgac] Error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
