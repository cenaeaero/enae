import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import { normalizeOrganization } from "@/lib/organization";

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, status: 401, error: "No autenticado" };
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("role").eq("email", user.email).maybeSingle();
  if (profile?.role !== "admin") return { ok: false, status: 403, error: "No autorizado" };
  return { ok: true };
}

function clean(v: any) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();

  let query = supabaseAdmin
    .from("companies")
    .select("*")
    .order("name");

  if (q) {
    // Búsqueda por nombre o RUT
    query = query.or(`name.ilike.%${q}%,rut.ilike.%${q}%,legal_name.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ companies: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const name = normalizeOrganization(body.name);
  const rut = clean(body.rut);

  if (!name) return NextResponse.json({ error: "Nombre de empresa requerido" }, { status: 400 });
  if (!rut)  return NextResponse.json({ error: "RUT requerido" }, { status: 400 });

  const payload = {
    name,
    legal_name: clean(body.legal_name),
    rut,
    address: clean(body.address),
    city: clean(body.city),
    region: clean(body.region),
    country: clean(body.country) || "Chile",
    phone: clean(body.phone),
    email: clean(body.email),
    website: clean(body.website),
    contact_name: clean(body.contact_name),
    contact_email: clean(body.contact_email),
    contact_phone: clean(body.contact_phone),
    notes: clean(body.notes),
  };

  const { data, error } = await supabaseAdmin
    .from("companies")
    .insert(payload)
    .select()
    .single();
  if (error) {
    if (error.message.includes("duplicate")) {
      return NextResponse.json({ error: "Ya existe una empresa con ese nombre o RUT." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ company: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const updates: Record<string, any> = {};
  for (const k of [
    "legal_name","rut","address","city","region","country",
    "phone","email","website","contact_name","contact_email","contact_phone",
    "notes","is_active",
  ]) {
    if (k in rest) updates[k] = clean(rest[k]);
  }
  if (rest.name) updates.name = normalizeOrganization(rest.name);

  const { data, error } = await supabaseAdmin
    .from("companies")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.message.includes("duplicate")) {
      return NextResponse.json({ error: "Ya existe una empresa con ese nombre o RUT." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Si cambió el nombre, propagar al campo denormalizado en billing_cases / registrations / profiles
  if (updates.name) {
    await supabaseAdmin.from("billing_cases").update({ company: updates.name }).eq("company_id", id);
    await supabaseAdmin.from("registrations").update({ organization: updates.name, company: updates.name }).eq("company_id", id);
    await supabaseAdmin.from("profiles").update({ organization: updates.name }).eq("company_id", id);
  }

  return NextResponse.json({ company: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  // Soft delete (is_active=false). El DELETE duro pondría null en company_id de filas vinculadas.
  const { error } = await supabaseAdmin
    .from("companies")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
