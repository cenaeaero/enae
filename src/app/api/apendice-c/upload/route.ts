import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

// DELETE: remove uploaded Apéndice C so it can be re-uploaded
export async function DELETE(request: Request) {
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

    // Get registration + check permissions
    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id, email")
      .eq("id", registration_id)
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

    // Get current file path from dgac_procedures
    const { data: proc } = await supabaseAdmin
      .from("dgac_procedures")
      .select("id, apendice_c_file_url")
      .eq("registration_id", registration_id)
      .maybeSingle();

    if (!proc?.apendice_c_file_url) {
      return NextResponse.json({ error: "No hay documento para eliminar" }, { status: 404 });
    }

    // Delete file from storage
    const { error: removeErr } = await supabaseAdmin.storage
      .from("apendice-c")
      .remove([proc.apendice_c_file_url]);

    // Even if storage remove fails (e.g., file already missing), clear the DB references
    if (removeErr) {
      console.warn("Apendice C storage remove warning:", removeErr.message);
    }

    // Clear references in dgac_procedures
    await supabaseAdmin
      .from("dgac_procedures")
      .update({
        apendice_c: false,
        apendice_c_file_url: null,
        apendice_c_uploaded_at: null,
      })
      .eq("id", proc.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Apendice C delete error:", err?.message);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file") as File | null;
    const registrationId = form.get("registration_id") as string | null;

    if (!file || !registrationId) {
      return NextResponse.json({ error: "file y registration_id requeridos" }, { status: 400 });
    }

    // Verify the registration belongs to this user (by email)
    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id, email")
      .eq("id", registrationId)
      .maybeSingle();

    if (!reg) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    // Allow admins to upload on behalf of student too
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("email", user.email)
      .maybeSingle();
    const isAdmin = profile?.role === "admin";

    if (!isAdmin && reg.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
    const path = `${registrationId}/apendice-c-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from("apendice-c")
      .upload(path, arrayBuffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Upsert dgac_procedures row
    const { data: existingProc } = await supabaseAdmin
      .from("dgac_procedures")
      .select("id")
      .eq("registration_id", registrationId)
      .maybeSingle();

    if (existingProc) {
      await supabaseAdmin
        .from("dgac_procedures")
        .update({
          apendice_c: true,
          apendice_c_file_url: path,
          apendice_c_uploaded_at: new Date().toISOString(),
        })
        .eq("id", existingProc.id);
    } else {
      await supabaseAdmin.from("dgac_procedures").insert({
        registration_id: registrationId,
        procedure_type: "nueva",
        apendice_c: true,
        apendice_c_file_url: path,
        apendice_c_uploaded_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, url: path });
  } catch (err: any) {
    console.error("Apendice C upload error:", err?.message);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
