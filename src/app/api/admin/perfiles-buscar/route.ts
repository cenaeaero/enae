import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const email = new URL(request.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email requerido" }, { status: 400 });
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, email, role")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (!data) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile: data });
}
