import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import nodemailer from "nodemailer";

// Increase body size limit for PDF base64
export const maxDuration = 60;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Improve deliverability
  tls: {
    rejectUnauthorized: true,
  },
});

const FROM = process.env.SMTP_USER || "escuela@enae.cl";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "escuela@enae.cl";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.enae.cl";

// POST: Send diploma by email with PDF attachment
export async function POST(request: Request) {
  console.log("[enviar-diploma] Request received");

  try {
    const body = await request.json();
    const { diploma_id, pdf_base64 } = body;

    if (!diploma_id || !pdf_base64) {
      console.error("[enviar-diploma] Missing fields");
      return NextResponse.json({ error: "diploma_id y pdf_base64 requeridos" }, { status: 400 });
    }

    console.log(`[enviar-diploma] PDF size: ${Math.round(pdf_base64.length / 1024)} KB (base64)`);

    // Fetch diploma with registration email
    const { data: diploma, error: dbError } = await supabaseAdmin
      .from("diplomas")
      .select("*, registrations(email)")
      .eq("id", diploma_id)
      .single();

    if (dbError) {
      console.error("[enviar-diploma] DB error:", dbError.message);
      return NextResponse.json({ error: "Error al buscar diploma: " + dbError.message }, { status: 500 });
    }

    if (!diploma) {
      return NextResponse.json({ error: "Diploma no encontrado" }, { status: 404 });
    }

    const d = diploma as any;
    const email = d.registrations?.email;

    if (!email) {
      console.error("[enviar-diploma] No email found for registration");
      return NextResponse.json({ error: "Email del alumno no encontrado" }, { status: 400 });
    }

    const studentName = d.student_name || "Alumno";
    const courseName = d.course_title || "Curso ENAE";
    const courseCode = d.course_code || "";
    const verifyCode = d.verification_code;
    const filename = `Diploma_${(courseCode || "ENAE").replace(/[^a-zA-Z0-9]/g, "_")}_${verifyCode}.pdf`;

    console.log(`[enviar-diploma] Sending to ${email}`);

    // Plain text version (reduces spam score significantly)
    const textVersion = `
Estimado/a ${studentName},

Nos complace hacer llegar tu diploma oficial del curso:

${courseName}
${courseCode ? `Codigo: ${courseCode}` : ""}
${d.final_score !== null ? `Calificacion Final: ${d.final_score}%` : ""}

Codigo de Verificacion: ${verifyCode}

El diploma esta adjunto en formato PDF. Puedes verificar su autenticidad en:
${SITE_URL}/verificar?code=${verifyCode}

Te felicitamos por tu compromiso y dedicacion.

--
Escuela de Navegacion Aerea SpA
AOC 1521 - DGAC Chile
${ADMIN_EMAIL}
    `.trim();

    // Professional HTML version — simpler to reduce spam score
    const htmlVersion = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Tu Diploma ${courseName}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f4;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f4;padding:20px 0;">
<tr>
<td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color:#ffffff;border-collapse:collapse;max-width:600px;">
<tr>
<td style="background-color:#003366;padding:30px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:normal;">Escuela de Navegacion Aerea</h1>
<p style="color:#ffffff;margin:5px 0 0;font-size:13px;opacity:0.9;">AOC 1521 - DGAC Chile</p>
</td>
</tr>
<tr>
<td style="padding:35px 30px;color:#333333;line-height:1.6;">
<p style="margin:0 0 15px;font-size:16px;">Estimado/a <strong>${studentName}</strong>,</p>
<p style="margin:0 0 20px;font-size:15px;">Nos complace hacer llegar tu diploma oficial del curso que has completado satisfactoriamente.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:20px 0;">
<tr>
<td style="background-color:#f8f9fa;padding:20px;border-left:3px solid #003366;">
<p style="margin:0 0 8px;color:#003366;font-size:17px;font-weight:bold;">${courseName}</p>
${courseCode ? `<p style="margin:0 0 5px;color:#666666;font-size:13px;">Codigo: ${courseCode}</p>` : ""}
${d.final_score !== null ? `<p style="margin:5px 0 0;color:#333;font-size:14px;">Calificacion Final: <strong>${d.final_score}%</strong></p>` : ""}
<p style="margin:5px 0 0;color:#666;font-size:12px;">Codigo de Verificacion: ${verifyCode}</p>
</td>
</tr>
</table>

<p style="margin:20px 0 15px;font-size:14px;">El diploma esta adjunto a este correo en formato PDF.</p>
<p style="margin:15px 0;font-size:14px;">Puedes verificar la autenticidad del diploma en cualquier momento en:<br>
<a href="${SITE_URL}/verificar?code=${verifyCode}" style="color:#003366;">${SITE_URL}/verificar?code=${verifyCode}</a></p>

<p style="margin:25px 0 5px;font-size:14px;">Te felicitamos por tu compromiso y dedicacion.</p>
<p style="margin:0;font-size:14px;">Saludos cordiales,</p>
<p style="margin:5px 0 0;font-size:14px;"><strong>Escuela de Navegacion Aerea SpA</strong></p>
</td>
</tr>
<tr>
<td style="background-color:#f4f4f4;padding:20px 30px;text-align:center;font-size:12px;color:#888888;border-top:1px solid #e0e0e0;">
<p style="margin:0 0 5px;">Escuela de Navegacion Aerea SpA | AOC 1521 DGAC</p>
<p style="margin:0;">Contacto: <a href="mailto:${ADMIN_EMAIL}" style="color:#003366;">${ADMIN_EMAIL}</a></p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"ENAE - Escuela de Navegacion Aerea" <${FROM}>`,
      to: email,
      replyTo: ADMIN_EMAIL,
      subject: `Tu Diploma - ${courseName}`,
      text: textVersion,
      html: htmlVersion,
      attachments: [
        {
          filename,
          content: pdf_base64,
          encoding: "base64",
          contentType: "application/pdf",
        },
      ],
      headers: {
        "X-Priority": "3",
        "X-MSMail-Priority": "Normal",
      },
    });

    console.log(`[enviar-diploma] Email sent successfully to ${email}`);
    return NextResponse.json({ success: true, email });
  } catch (err: any) {
    console.error("[enviar-diploma] Error:", err?.message || err);
    console.error("[enviar-diploma] Stack:", err?.stack);
    return NextResponse.json(
      { error: err?.message || "Error al enviar email" },
      { status: 500 }
    );
  }
}
