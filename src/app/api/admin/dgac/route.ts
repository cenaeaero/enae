import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

async function verifyAdmin() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", user.email)
    .single();
  return profile?.role === "admin" ? user : null;
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registration_id");
    if (!registrationId) return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });

    const { data: procedure } = await supabaseAdmin
      .from("dgac_procedures")
      .select("*")
      .eq("registration_id", registrationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let history: any[] = [];
    if (procedure) {
      const { data } = await supabaseAdmin
        .from("dgac_procedure_history")
        .select("*")
        .eq("procedure_id", procedure.id)
        .order("changed_at", { ascending: false });
      history = data || [];
    }

    return NextResponse.json({ procedure: procedure || null, history });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await request.json();
    const { registration_id, procedure_type } = body;

    if (!registration_id || !procedure_type) {
      return NextResponse.json({ error: "registration_id y procedure_type requeridos" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("dgac_procedures")
      .insert({ registration_id, procedure_type })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log creation in history
    await supabaseAdmin.from("dgac_procedure_history").insert({
      procedure_id: data.id,
      field_name: "procedure_type",
      old_value: null,
      new_value: procedure_type,
    });

    return NextResponse.json({ procedure: data });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { id, field, value } = await request.json();
    if (!id || !field) return NextResponse.json({ error: "id y field requeridos" }, { status: 400 });

    // Get current value for history
    const { data: current } = await supabaseAdmin
      .from("dgac_procedures")
      .select(field)
      .eq("id", id)
      .single();

    const oldValue = current ? String(current[field] ?? "") : "";
    const newValue = String(value ?? "");

    // Update the field
    const { error } = await supabaseAdmin
      .from("dgac_procedures")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log change in history
    await supabaseAdmin.from("dgac_procedure_history").insert({
      procedure_id: id,
      field_name: field,
      old_value: oldValue,
      new_value: newValue,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
