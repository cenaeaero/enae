import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { sendCampaignBatch } from "@/lib/marketing-send";

// Vercel Cron — diario. Envía el lote del día (daily_batch) de cada campaña
// que aún tenga destinatarios pendientes, para no saturar la mensajería.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: campaigns } = await supabaseAdmin
    .from("email_campaigns").select("id, daily_batch").eq("status", "sending");

  const results: any[] = [];
  for (const c of campaigns || []) {
    const res = await sendCampaignBatch(c.id, c.daily_batch || 100);
    results.push({ campaign_id: c.id, ...res });
  }

  return NextResponse.json({ ok: true, campaigns_processed: results.length, results });
}
