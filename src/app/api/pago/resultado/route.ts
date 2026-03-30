import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { confirmTransaction } from "@/lib/transbank";
import { supabaseAdmin } from "@/lib/supabase-service";
import { sendAdminPaymentNotification } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get("token_ws") as string;

    // Transbank aborted by user
    if (!token) {
      return NextResponse.redirect(new URL("/tpems/pago/error", SITE_URL));
    }

    // Confirm transaction with Transbank
    const result = await confirmTransaction(token);

    // Find payment by token
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, registration_id, amount")
      .eq("tbk_token", token)
      .single();

    if (!payment) {
      return NextResponse.redirect(new URL("/tpems/pago/error", SITE_URL));
    }

    if (result.responseCode === 0) {
      // Payment approved
      await supabaseAdmin
        .from("payments")
        .update({
          status: "approved",
          tbk_response: result,
        })
        .eq("id", payment.id);

      // Update registration status to confirmed
      await supabaseAdmin
        .from("registrations")
        .update({ status: "confirmed" })
        .eq("id", payment.registration_id);

      // Get student and course info for email
      const { data: reg } = await supabaseAdmin
        .from("registrations")
        .select("first_name, last_name, email, courses (title)")
        .eq("id", payment.registration_id)
        .single();

      if (reg) {
        const r = reg as any;
        try {
          await sendAdminPaymentNotification(
            `${r.first_name} ${r.last_name}`,
            r.email,
            r.courses?.title || "Curso",
            payment.amount
          );
        } catch (e) {
          console.error("Failed to send payment notification:", e);
        }
      }

      return NextResponse.redirect(new URL("/tpems/pago/exito", SITE_URL));
    } else {
      // Payment rejected
      await supabaseAdmin
        .from("payments")
        .update({
          status: "rejected",
          tbk_response: result,
        })
        .eq("id", payment.id);

      return NextResponse.redirect(new URL("/tpems/pago/error", SITE_URL));
    }
  } catch (error) {
    console.error("Payment result error:", error);
    return NextResponse.redirect(new URL("/tpems/pago/error", SITE_URL));
  }
}

// Transbank can also send GET for some flows
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/tpems/pago/error", SITE_URL));
}
