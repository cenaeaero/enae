import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

// Cédula de identidad (frente/reverso, PDF) para el trámite DGAC.
// Se almacena en el mismo bucket "apendice-c" y se referencia desde
// dgac_procedures.cedula_frente_url / cedula_reverso_url.

const SIDES = { frente: "cedula_frente_url", reverso: "cedula_reverso_url" } as const;
type Side = keyof typeof SIDES;

function isValidSide(s: string | null): s is Side {
  return s === "frente" || s === "reverso";
}

// Verifica que el usuario autenticado sea el dueño del registro o admin.
async function authorize(request: Request, registrationId: string) {
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
    .select("id, cedula_frente_url, cedula_reverso_url")
    .eq("registration_id", registrationId)
    .maybeSingle();
  return data;
}

// POST: subir un lado de la cédula (solo PDF)
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const registrationId = form.get("registration_id") as string | null;
    const side = form.get("side") as string | null;

    if (!file || !registrationId || !isValidSide(side)) {
      return NextResponse.json({ error: "file, registration_id y side (frente|reverso) requeridos" }, { status: 400 });
    }

    // Solo PDF
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "La cédula debe subirse en formato PDF." }, { status: 400 });
    }

    const auth = await authorize(request, registrationId);
    if (auth.error) return auth.error;

    const path = `${registrationId}/cedula-${side}-${Date.now()}.pdf`;
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from("apendice-c")
      .upload(path, arrayBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const column = SIDES[side];
    const existingProc = await getProc(registrationId);

    if (existingProc) {
      await supabaseAdmin
        .from("dgac_procedures")
        .update({ [column]: path, cedula_uploaded_at: new Date().toISOString() })
        .eq("id", existingProc.id);
    } else {
      await supabaseAdmin.from("dgac_procedures").insert({
        registration_id: registrationId,
        procedure_type: "nueva",
        [column]: path,
        cedula_uploaded_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, url: path });
  } catch (err: any) {
    console.error("Cedula upload error:", err?.message);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

// GET: URL firmada para ver/descargar un lado
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registration_id");
    const side = searchParams.get("side");
    if (!registrationId || !isValidSide(side)) {
      return NextResponse.json({ error: "registration_id y side requeridos" }, { status: 400 });
    }

    const auth = await authorize(request, registrationId);
    if (auth.error) return auth.error;

    const proc = await getProc(registrationId);
    const filePath = proc?.[SIDES[side]] as string | null | undefined;
    if (!filePath) {
      return NextResponse.json({ error: "Sin archivo" }, { status: 404 });
    }

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("apendice-c")
      .createSignedUrl(filePath, 300);
    if (signedError || !signed) {
      return NextResponse.json({ error: signedError?.message || "Error firmando URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err: any) {
    console.error("Cedula download error:", err?.message);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

// DELETE: eliminar un lado para volver a subir
export async function DELETE(request: Request) {
  try {
    const { registration_id, side } = await request.json();
    if (!registration_id || !isValidSide(side)) {
      return NextResponse.json({ error: "registration_id y side requeridos" }, { status: 400 });
    }

    const auth = await authorize(request, registration_id);
    if (auth.error) return auth.error;

    const proc = await getProc(registration_id);
    const column = SIDES[side];
    const filePath = proc?.[column] as string | null | undefined;
    if (!proc || !filePath) {
      return NextResponse.json({ error: "No hay documento para eliminar" }, { status: 404 });
    }

    const { error: removeErr } = await supabaseAdmin.storage.from("apendice-c").remove([filePath]);
    if (removeErr) console.warn("Cedula storage remove warning:", removeErr.message);

    await supabaseAdmin
      .from("dgac_procedures")
      .update({ [column]: null })
      .eq("id", proc.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Cedula delete error:", err?.message);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
