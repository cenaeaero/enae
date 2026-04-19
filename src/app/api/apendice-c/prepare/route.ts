import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import crypto from "crypto";

function generateCode() {
  // 12-char alphanumeric, uppercase, easy to read
  return crypto.randomBytes(8).toString("base64url").replace(/[-_]/g, "").slice(0, 12).toUpperCase();
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { registration_id } = await request.json();
    if (!registration_id) {
      return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });
    }

    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id, email")
      .eq("id", registration_id)
      .maybeSingle();
    if (!reg) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("email", user.email)
      .maybeSingle();
    const isAdmin = profile?.role === "admin";

    if (!isAdmin && reg.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Get or create dgac_procedures row with verification code
    const { data: existing } = await supabaseAdmin
      .from("dgac_procedures")
      .select("id, apendice_c_verification_code")
      .eq("registration_id", registration_id)
      .maybeSingle();

    let code = existing?.apendice_c_verification_code || null;

    if (existing) {
      if (!code) {
        code = generateCode();
        await supabaseAdmin
          .from("dgac_procedures")
          .update({ apendice_c_verification_code: code })
          .eq("id", existing.id);
      }
    } else {
      code = generateCode();
      await supabaseAdmin.from("dgac_procedures").insert({
        registration_id,
        procedure_type: "nueva",
        apendice_c_verification_code: code,
      });
    }

    return NextResponse.json({ verification_code: code });
  } catch (err: any) {
    console.error("Apendice C prepare error:", err?.message);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
