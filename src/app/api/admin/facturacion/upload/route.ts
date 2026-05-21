import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer as serverClient } from "@/lib/supabase-server";

const KIND_TO_COLUMN: Record<string, string> = {
  quotation: "quotation_file_url",
  oc: "oc_file_url",
  hes: "hes_file_url",
  invoice: "invoice_file_url",
};

async function requireAdmin() {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, status: 401, error: "No autenticado" };
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", user.email)
    .maybeSingle();
  if (profile?.role !== "admin") return { ok: false, status: 403, error: "No autorizado" };
  return { ok: true };
}

// POST multipart/form-data
//   fields: case_id, kind (quotation|oc|hes|invoice)
//   file:   PDF/PNG/JPG
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await request.formData();
  const caseId = form.get("case_id")?.toString();
  const kind = form.get("kind")?.toString();
  const file = form.get("file") as File | null;

  if (!caseId || !kind || !file) {
    return NextResponse.json({ error: "case_id, kind y file requeridos" }, { status: 400 });
  }
  const column = KIND_TO_COLUMN[kind];
  if (!column) {
    return NextResponse.json({ error: `kind inválido: ${kind}` }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${caseId}/${kind}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from("billing-docs")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Guarda la ruta interna (no URL pública). La firma se hace al descargar.
  const { error: updErr } = await supabaseAdmin
    .from("billing_cases")
    .update({ [column]: path })
    .eq("id", caseId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, path });
}

// GET ?path=... → devuelve URL firmada (válida 5 min)
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const path = new URL(request.url).searchParams.get("path");
  if (!path) return NextResponse.json({ error: "path requerido" }, { status: 400 });

  const { data, error } = await supabaseAdmin.storage
    .from("billing-docs")
    .createSignedUrl(path, 300);
  if (error || !data) return NextResponse.json({ error: error?.message || "no signed url" }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
