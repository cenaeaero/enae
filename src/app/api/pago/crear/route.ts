import { NextResponse } from "next/server";
import { createTransaction } from "@/lib/transbank";
import { supabaseAdmin } from "@/lib/supabase-service";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(request: Request) {
  try {
    const { registrationId, amount } = await request.json();

    if (!registrationId || !amount) {
      return NextResponse.json(
        { error: "registrationId y amount son requeridos" },
        { status: 400 }
      );
    }

    const buyOrder = `E${Date.now()}`;
    const sessionId = registrationId;
    const returnUrl = `${SITE_URL}/api/pago/resultado`;

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        registration_id: registrationId,
        amount: parseInt(amount),
        status: "pending",
      })
      .select()
      .single();

    if (paymentError) {
      return NextResponse.json(
        { error: "Error al crear pago: " + paymentError.message },
        { status: 400 }
      );
    }

    // Create Transbank transaction
    const { token, url } = await createTransaction(
      parseInt(amount),
      buyOrder,
      sessionId,
      returnUrl
    );

    // Update payment with token
    await supabaseAdmin
      .from("payments")
      .update({ tbk_token: token })
      .eq("id", payment.id);

    return NextResponse.json({ token, url });
  } catch (error: any) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: "Error al crear transaccion: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
