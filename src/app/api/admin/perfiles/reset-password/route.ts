import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";
import { sendStudentCredentials } from "@/lib/email";
import crypto from "crypto";

// POST { profile_id, send_email?: boolean }
// Genera una nueva clave temporal, la setea en auth.users y opcionalmente envía email.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (!body.profile_id) return NextResponse.json({ error: "profile_id requerido" }, { status: 400 });

  const { data: prof } = await supabaseAdmin
    .from("profiles").select("user_id, email, first_name, last_name").eq("id", body.profile_id).maybeSingle();
  if (!prof?.user_id) return NextResponse.json({ error: "Perfil sin auth.user_id" }, { status: 404 });

  const password = crypto.randomBytes(4).toString("hex");
  const { error } = await supabaseAdmin.auth.admin.updateUserById(prof.user_id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.send_email !== false) {
    try {
      await sendStudentCredentials(
        prof.email,
        password,
        `${prof.first_name || ""} ${prof.last_name || ""}`.trim(),
        "Portal ENAE"
      );
    } catch (e) { console.error("send email failed:", e); }
  }

  return NextResponse.json({ ok: true, password });
}
