import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_USER || "escuela@enae.cl";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "escuela@enae.cl";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.enae.cl";

// POST: Send diploma by email with PDF attachment
export async function POST(request: Request) {
  try {
    const { diploma_id, pdf_base64 } = await request.json();

    if (!diploma_id || !pdf_base64) {
      return NextResponse.json({ error: "diploma_id y pdf_base64 requeridos" }, { status: 400 });
    }

    // Fetch diploma with registration email
    const { data: diploma } = await supabaseAdmin
      .from("diplomas")
      .select("*, registrations(email)")
      .eq("id", diploma_id)
      .single();

    if (!diploma) {
      return NextResponse.json({ error: "Diploma no encontrado" }, { status: 404 });
    }

    const d = diploma as any;
    const email = d.registrations?.email;

    if (!email) {
      return NextResponse.json({ error: "Email del alumno no encontrado" }, { status: 400 });
    }

    const studentName = d.student_name || "Alumno";
    const courseName = d.course_title || "Curso ENAE";
    const courseCode = d.course_code || "";
    const verifyCode = d.verification_code;
    const filename = `Diploma_${courseCode || "ENAE"}_${verifyCode}.pdf`;

    await transporter.sendMail({
      from: `"ENAE Training" <${FROM}>`,
      to: email,
      subject: `Felicidades! Tu Diploma - ${courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #003366; padding: 25px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 26px;">Felicidades ${studentName}!</h1>
            <p style="color: #93C5FD; margin: 8px 0 0; font-size: 14px;">Has completado exitosamente tu curso</p>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <p style="font-size: 16px;">Estimado/a <strong>${studentName}</strong>,</p>
            <p>Nos complace hacerte llegar tu diploma oficial del curso:</p>
            <div style="background: white; border: 1px solid #e5e7eb; border-left: 4px solid #F57C00; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #003366; margin: 0 0 5px; font-size: 18px;">${courseName}</h3>
              ${courseCode ? `<p style="color: #6b7280; margin: 0; font-size: 13px;">Codigo: ${courseCode}</p>` : ""}
              ${d.final_score !== null ? `<p style="margin: 10px 0 0; font-size: 14px;">Calificacion Final: <strong style="color: #003366;">${d.final_score}%</strong></p>` : ""}
              <p style="margin: 5px 0 0; font-size: 13px; color: #6b7280;">Codigo de Verificacion: <span style="font-family: monospace; color: #003366;">${verifyCode}</span></p>
            </div>
            <p>El diploma esta adjunto a este correo en formato PDF, y puedes verificar su autenticidad en cualquier momento en:</p>
            <p style="text-align: center; margin: 20px 0;">
              <a href="${SITE_URL}/verificar?code=${verifyCode}" style="display: inline-block; background: #0072CE; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Verificar Diploma</a>
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">
              Te felicitamos por tu compromiso y dedicacion durante el curso. ENAE se enorgullece de haber sido parte de tu formacion.
            </p>
            <p style="color: #6b7280; font-size: 13px;">Si tienes dudas, contactanos en <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a></p>
          </div>
          <div style="background: #001d3d; padding: 15px; text-align: center;">
            <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegacion Aerea SpA | AOC 1521 DGAC</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename,
          content: pdf_base64,
          encoding: "base64",
        },
      ],
    });

    return NextResponse.json({ success: true, email });
  } catch (err: any) {
    console.error("Error sending diploma email:", err);
    return NextResponse.json({ error: err.message || "Error al enviar email" }, { status: 500 });
  }
}
