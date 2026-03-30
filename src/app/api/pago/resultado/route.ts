import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { confirmTransaction } from "@/lib/transbank";
import { supabaseAdmin } from "@/lib/supabase-service";
import { sendAdminPaymentNotification } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function handlePaymentResult(token: string | null) {
  const successUrl = `${SITE_URL}/tpems/pago/exito`;
  const errorUrl = `${SITE_URL}/tpems/pago/error`;

  // No token = user cancelled
  if (!token) {
    return NextResponse.redirect(errorUrl, { status: 303 });
  }

  try {
    // Confirm transaction with Transbank
    const result = await confirmTransaction(token);

    console.log("Transbank result:", JSON.stringify(result));

    // Find payment by token
    const { data: payment, error: paymentErr } = await supabaseAdmin
      .from("payments")
      .select("id, registration_id, amount")
      .eq("tbk_token", token)
      .single();

    console.log("Payment lookup:", payment?.id, paymentErr?.message);

    if (!payment) {
      console.error("Payment not found for token:", token);
      return NextResponse.redirect(errorUrl, { status: 303 });
    }

    if (result.responseCode === 0) {
      // Payment approved
      await supabaseAdmin
        .from("payments")
        .update({ status: "approved", tbk_response: result })
        .eq("id", payment.id);

      await supabaseAdmin
        .from("registrations")
        .update({ status: "confirmed" })
        .eq("id", payment.registration_id);

      // Send admin notification
      try {
        const { data: reg } = await supabaseAdmin
          .from("registrations")
          .select("first_name, last_name, email, courses (title)")
          .eq("id", payment.registration_id)
          .single();

        if (reg) {
          const r = reg as any;
          await sendAdminPaymentNotification(
            `${r.first_name} ${r.last_name}`,
            r.email,
            r.courses?.title || "Curso",
            payment.amount
          );
        }
      } catch (e) {
        console.error("Email notification failed:", e);
      }

      const params = new URLSearchParams({
        order: result.buyOrder || "",
        amount: String(result.amount || payment.amount),
        card: result.cardNumber || "",
        auth: result.authorizationCode || "",
        date: result.transactionDate || new Date().toISOString(),
        installments: String(result.installmentsNumber || 0),
      });
      return NextResponse.redirect(`${successUrl}?${params.toString()}`, { status: 303 });
    } else {
      // Payment rejected
      console.log("Payment rejected, responseCode:", result.responseCode);
      await supabaseAdmin
        .from("payments")
        .update({ status: "rejected", tbk_response: result })
        .eq("id", payment.id);

      return NextResponse.redirect(errorUrl, { status: 303 });
    }
  } catch (error: any) {
    console.error("Payment confirmation error:", error?.message || error);
    return NextResponse.redirect(errorUrl, { status: 303 });
  }
}

// Transbank sends POST with token_ws in form data
export async function POST(request: NextRequest) {
  let token: string | null = null;

  try {
    const formData = await request.formData();
    token = formData.get("token_ws") as string;
  } catch {
    // If formData fails, try URL params
    token = request.nextUrl.searchParams.get("token_ws");
  }

  return handlePaymentResult(token);
}

// Transbank may also redirect via GET
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token_ws");
  return handlePaymentResult(token);
}
