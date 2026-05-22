import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const u = new URL(request.url);
  const q = (u.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ registrations: [] });

  const { data } = await supabaseAdmin
    .from("registrations")
    .select("id, first_name, last_name, email, organization, status, course_id, courses(title, code)")
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,organization.ilike.%${q}%`)
    .in("status", ["confirmed", "completed"])
    .limit(30);

  return NextResponse.json({ registrations: data || [] });
}
