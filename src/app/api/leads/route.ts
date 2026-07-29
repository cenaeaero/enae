import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

// Guarda un interesado del formulario "Solicitar información" (público).
export async function POST(request: Request) {
  try {
    const b = await request.json();
    const email = String(b.email || "").trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from("leads").insert({
      first_name: (b.first_name || "").trim() || null,
      last_name: (b.last_name || "").trim() || null,
      email,
      phone: (b.phone || "").trim() || null,
      course_interest: (b.course_interest || "").trim() || null,
      message: (b.message || "").trim() || null,
      source: "contacto",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Aviso al admin (best-effort)
    try {
      const { default: nodemailer } = await import("nodemailer");
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"), secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await t.sendMail({
        from: `"ENAE Web" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_EMAIL || "escuela@enae.cl",
        replyTo: email,
        subject: `Nuevo interesado: ${b.course_interest || "Consulta general"}`,
        html: `<p><strong>${b.first_name || ""} ${b.last_name || ""}</strong> (${email}${b.phone ? `, ${b.phone}` : ""})</p>
               <p>Curso de interés: ${b.course_interest || "—"}</p>
               <p>${(b.message || "").replace(/\n/g, "<br/>")}</p>`,
      });
    } catch { /* el lead ya quedó guardado */ }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
