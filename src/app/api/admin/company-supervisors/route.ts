import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const u = new URL(request.url);
  const companyId = u.searchParams.get("company_id");
  if (!companyId) return NextResponse.json({ error: "company_id requerido" }, { status: 400 });

  const { data } = await supabaseAdmin
    .from("company_supervisors")
    .select("id, slot, profile_id, created_at, profiles(id, first_name, last_name, email, rut, phone, role)")
    .eq("company_id", companyId)
    .order("slot");
  return NextResponse.json({ supervisors: data || [] });
}

// POST: { company_id, profile_id, slot } → asigna o reemplaza el slot
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { company_id, profile_id, slot } = body;
  if (!company_id || !profile_id || ![1,2,3].includes(Number(slot))) {
    return NextResponse.json({ error: "company_id, profile_id, slot(1..3) requeridos" }, { status: 400 });
  }

  // No cambiamos el role del profile. Una persona puede ser student + supervisor a la vez.
  // El acceso al portal /supervisor se determina por la existencia de filas en company_supervisors.

  // Borra el slot previo si estaba ocupado (replace)
  await supabaseAdmin.from("company_supervisors").delete().eq("company_id", company_id).eq("slot", slot);
  // Borra otra asignación del mismo profile en la misma empresa (para evitar dup)
  await supabaseAdmin.from("company_supervisors").delete().eq("company_id", company_id).eq("profile_id", profile_id);

  const { data, error } = await supabaseAdmin
    .from("company_supervisors")
    .insert({ company_id, profile_id, slot: Number(slot) })
    .select("id, slot, profile_id, profiles(id, first_name, last_name, email)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ supervisor: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const { error } = await supabaseAdmin.from("company_supervisors").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
