import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { sendPaymentReminder } from "@/lib/email";

// Vercel Cron — runs daily
// Sends a friendly reminder email to students who:
// - self-registered (source = 'self')
// - registered ≥ 2 days ago
// - are still in "pending" status (haven't paid)
// - haven't received the reminder yet
export async function GET(request: Request) {
  // Simple auth via Vercel Cron secret (set in env: CRON_SECRET)
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Find self-registered pending students older than 2 days with no reminder sent
    const { data: candidates, error } = await supabaseAdmin
      .from("registrations")
      .select("id, first_name, last_name, email, created_at, session_id, courses(title), sessions(fee)")
      .eq("status", "pending")
      .eq("source", "self")
      .is("payment_reminder_sent_at", null)
      .lte("created_at", twoDaysAgo.toISOString());

    if (error) {
      console.error("[cron-recordatorio] DB error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const reg of candidates || []) {
      const r = reg as any;
      const studentName = `${r.first_name} ${r.last_name}`.trim();
      const courseName = r.courses?.title || "tu curso";
      const amount = r.sessions?.fee || null;

      try {
        await sendPaymentReminder(r.email, studentName, courseName, r.id, amount);

        // Mark as sent
        await supabaseAdmin
          .from("registrations")
          .update({ payment_reminder_sent_at: new Date().toISOString() })
          .eq("id", r.id);

        results.push({ email: r.email, success: true });
        console.log(`[cron-recordatorio] Sent to ${r.email}`);
      } catch (err: any) {
        console.error(`[cron-recordatorio] Failed for ${r.email}:`, err?.message);
        results.push({ email: r.email, success: false, error: err?.message });
      }
    }

    return NextResponse.json({
      processed: (candidates || []).length,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (err: any) {
    console.error("[cron-recordatorio] Error:", err?.message);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
