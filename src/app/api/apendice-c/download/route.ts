import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registration_id");
    if (!registrationId) {
      return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });
    }

    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id, email")
      .eq("id", registrationId)
      .maybeSingle();
    if (!reg) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("email", user.email)
      .maybeSingle();
    const isAdmin = profile?.role === "admin";

    if (!isAdmin && reg.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { data: proc } = await supabaseAdmin
      .from("dgac_procedures")
      .select("apendice_c_file_url")
      .eq("registration_id", registrationId)
      .maybeSingle();

    if (!proc?.apendice_c_file_url) {
      return NextResponse.json({ error: "Sin archivo" }, { status: 404 });
    }

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("apendice-c")
      .createSignedUrl(proc.apendice_c_file_url, 300);

    if (signedError || !signed) {
      return NextResponse.json({ error: signedError?.message || "Error firmando URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err: any) {
    console.error("Apendice C download error:", err?.message);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
