import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireInstructor } from "@/lib/auth-instructor";

export async function GET() {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("bank_name, bank_account_type, bank_account_number, bank_account_name, bank_account_confirmed_at, first_name, last_name, email, phone, rut")
    .eq("email", auth.email)
    .maybeSingle();
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const updates: Record<string, any> = {};
  for (const k of ["bank_name","bank_account_type","bank_account_number","bank_account_name"]) {
    if (k in body) updates[k] = body[k] || null;
  }
  if (body.confirmed === true) updates.bank_account_confirmed_at = new Date().toISOString();
  if (body.confirmed === false) updates.bank_account_confirmed_at = null;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("email", auth.email)
    .select("bank_name, bank_account_type, bank_account_number, bank_account_name, bank_account_confirmed_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
