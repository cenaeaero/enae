import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

// Cédula de identidad (un solo PDF con ambos lados) para el trámite DGAC.
// Se almacena en el mismo bucket "apendice-c" y se referencia desde
// dgac_procedures.cedula_url.

// Verifica que el usuario autenticado sea el dueño del registro o admin.
async function authorize(registrationId: string) {
  const supabase = await createSupabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  const { data: reg } = await supabaseAdmin
    .from("registrations")
    .select("id, email")
    .eq("id", registrationId)
    .maybeSingle();
  if (!reg) {
    return { error: NextResponse.json({ error: "Registro no encontrado" }, { status: 404 }) };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", user.email)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  if (!isAdmin && reg.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  }
  return { isAdmin };
}

async function getProc(registrationId: string) {
  const { data } = await supabaseAdmin
    .from("dgac_procedures")
    .select("id, cedula_url")
    .eq("registration_id", registrationId)
    .maybeSingle();
  return data;
}

// POST: subir la cédula (un solo PDF con ambos lados)
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const registrationId = form.get("registration_id") as string | null;

    if (!file || !registrationId) {
      return NextResponse.json({ error: "file y registration_id requeridos" }, { status: 400 });
    }

    // Solo PDF
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "La cédula debe subirse en formato PDF." }, { status: 400 });
    }

    const auth = await authorize(registrationId);
    if (auth.error) return auth.error;

    const path = `${registrationId}/cedula-${Date.now()}.pdf`;
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from("apendice-c")
      .upload(path, arrayBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const existingProc = await getProc(registrationId);
    if (existingProc) {
      await supabaseAdmin
        .from("dgac_procedures")
        .update({ cedula_url: path, cedula_uploaded_at: new Date().toISOString() })
        .eq("id", existingProc.id);
    } else {
      await supabaseAdmin.from("dgac_procedures").insert({
        registration_id: registrationId,
        procedure_type: "nueva",
        cedula_url: path,
        cedula_uploaded_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, url: path });
  } catch (err: any) {
    console.error("Cedula upload error:", err?.message);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

// GET: URL firmada para ver/descargar la cédula
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registration_id");
    if (!registrationId) {
      return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });
    }

    const auth = await authorize(registrationId);
    if (auth.error) return auth.error;

    const proc = await getProc(registrationId);
    if (!proc?.cedula_url) {
      return NextResponse.json({ error: "Sin archivo" }, { status: 404 });
    }

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("apendice-c")
      .createSignedUrl(proc.cedula_url, 300);
    if (signedError || !signed) {
      return NextResponse.json({ error: signedError?.message || "Error firmando URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err: any) {
    console.error("Cedula download error:", err?.message);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

// DELETE: eliminar la cédula para volver a subirla
export async function DELETE(request: Request) {
  try {
    const { registration_id } = await request.json();
    if (!registration_id) {
      return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });
    }

    const auth = await authorize(registration_id);
    if (auth.error) return auth.error;

    const proc = await getProc(registration_id);
    if (!proc?.cedula_url) {
      return NextResponse.json({ error: "No hay documento para eliminar" }, { status: 404 });
    }

    const { error: removeErr } = await supabaseAdmin.storage.from("apendice-c").remove([proc.cedula_url]);
    if (removeErr) console.warn("Cedula storage remove warning:", removeErr.message);

    await supabaseAdmin
      .from("dgac_procedures")
      .update({ cedula_url: null })
      .eq("id", proc.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Cedula delete error:", err?.message);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
