import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

// Redirección de seguimiento de clic: marca clicked_at y redirige a la URL real.
// GET ?u=<url codificada>
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const raw = new URL(request.url).searchParams.get("u") || "";
  let dest = "https://www.enae.cl";
  try {
    const u = new URL(decodeURIComponent(raw));
    if (u.protocol === "http:" || u.protocol === "https:") dest = u.toString();
  } catch { /* url inválida → home */ }

  try {
    const { data: r } = await supabaseAdmin
      .from("email_recipients").select("id, click_count, clicked_at, opened_at").eq("token", token).maybeSingle();
    if (r) {
      const now = new Date().toISOString();
      await supabaseAdmin.from("email_recipients").update({
        clicked_at: r.clicked_at || now,
        click_count: (r.click_count || 0) + 1,
        opened_at: r.opened_at || now, // un clic implica apertura
      }).eq("id", r.id);
    }
  } catch { /* nunca bloquear la redirección */ }

  return NextResponse.redirect(dest, 302);
}
