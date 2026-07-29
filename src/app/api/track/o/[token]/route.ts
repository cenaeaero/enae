import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

// Pixel de seguimiento de apertura: marca opened_at y devuelve un GIF 1x1.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const { data: r } = await supabaseAdmin
      .from("email_recipients").select("id, open_count, opened_at").eq("token", token).maybeSingle();
    if (r) {
      await supabaseAdmin.from("email_recipients").update({
        opened_at: r.opened_at || new Date().toISOString(),
        open_count: (r.open_count || 0) + 1,
      }).eq("id", r.id);
    }
  } catch { /* nunca romper el render del correo */ }

  return new NextResponse(new Uint8Array(PIXEL), {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
