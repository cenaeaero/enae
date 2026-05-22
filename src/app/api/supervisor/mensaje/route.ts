import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireSupervisor } from "@/lib/auth-supervisor";

export async function POST(request: Request) {
  const auth = await requireSupervisor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (!body.body) return NextResponse.json({ error: "body requerido" }, { status: 400 });

  const { error } = await supabaseAdmin.from("supervisor_messages").insert({
    from_email: auth.email,
    company_id: auth.companyIds[0] || null,
    about_profile_id: body.about_profile_id || null,
    subject: body.subject || null,
    body: body.body,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email opcional al admin
  try {
    const { default: nodemailer } = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"ENAE Sistema" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || "escuela@enae.cl",
      subject: `Mensaje supervisor · ${body.subject || "sin asunto"}`,
      html: `<p>De: ${auth.email}</p><p>${body.body.replace(/\n/g, "<br>")}</p>`,
    });
  } catch (e) { console.error(e); }

  return NextResponse.json({ ok: true });
}
