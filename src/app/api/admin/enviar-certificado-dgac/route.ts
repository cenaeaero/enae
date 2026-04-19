import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import { generateDgacCertificatePdf } from "@/lib/certificado-dgac-pdf";
import { sendDgacCertificate } from "@/lib/email";

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
      .select("id, first_name, last_name, email, rut, instruction_city, folio_enae, created_at, completed_at, status, course_id")
      .eq("id", registration_id)
      .maybeSingle();

    if (!reg) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    if (reg.status !== "completed") {
      return NextResponse.json({ error: "El alumno aún no ha completado el curso" }, { status: 400 });
    }

    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("title, theoretical_hours, practical_hours, dgac_habilitaciones, dgac_content_list")
      .eq("id", reg.course_id)
      .single();

    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const totalHours = (course.theoretical_hours || 0) + (course.practical_hours || 0);
    const completedAt = reg.completed_at || new Date().toISOString();
    const startAt = reg.created_at || completedAt;

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
      rut: reg.rut || null,
      courseName: course.title,
      city: reg.instruction_city || "Antofagasta",
      startDate: startAt,
      endDate: completedAt,
      totalHours,
      folio: reg.folio_enae || null,
      year: new Date(completedAt).getFullYear(),
      habilitaciones: course.dgac_habilitaciones || null,
      contentList,
    });

    const safeName = `${reg.first_name || ""}_${reg.last_name || ""}`.replace(/[^A-Za-z0-9]+/g, "_");
    const fileName = `Certificado_DGAC_${safeName}.pdf`;

    await sendDgacCertificate(
      `${reg.first_name} ${reg.last_name}`,
      reg.email,
      course.title,
      Buffer.from(pdfBuffer as ArrayBuffer),
      fileName,
    );

    return NextResponse.json({ ok: true, sent_to: reg.email });
  } catch (err: any) {
    console.error("[enviar-certificado-dgac] Error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
