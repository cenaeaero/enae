import { NextResponse } from "next/server";
import { createPaddleTransaction } from "@/lib/paddle";
import { supabaseAdmin } from "@/lib/supabase-service";

// Crea el pago (pending) y la transacción Paddle para cobro internacional en USD.
// El cliente abre el overlay de Paddle.js con el transactionId devuelto.
export async function POST(request: Request) {
  try {
    const { registrationId } = await request.json();
    if (!registrationId) {
      return NextResponse.json({ error: "registrationId es requerido" }, { status: 400 });
    }

    // Cargar inscripción + curso + precio USD de la sesión.
    const { data: reg, error: regErr } = await supabaseAdmin
      .from("registrations")
      .select("id, email, first_name, last_name, session_id, courses (title), sessions (price_usd)")
      .eq("id", registrationId)
      .single();

    if (regErr || !reg) {
      return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
    }

    const r = reg as any;
    const priceUsd: number | null = r.sessions?.price_usd ?? null;
    const courseName: string = r.courses?.title || "Curso ENAE";

    if (!priceUsd || priceUsd <= 0) {
      return NextResponse.json(
        { error: "Este curso no tiene precio internacional (USD) configurado." },
        { status: 400 }
      );
    }

    // Registrar el pago pendiente (provider = paddle, monto en USD enteros).
    const { data: payment, error: payErr } = await supabaseAdmin
      .from("payments")
      .insert({
        registration_id: registrationId,
        amount: priceUsd,
        currency: "USD",
        provider: "paddle",
        status: "pending",
      })
      .select()
      .single();

    if (payErr || !payment) {
      return NextResponse.json(
        { error: "Error al crear pago: " + (payErr?.message || "") },
        { status: 400 }
      );
    }

    // Crear la transacción en Paddle con referencia cruzada al pago/inscripción.
    const { id: transactionId } = await createPaddleTransaction({
      amountUsd: priceUsd,
      courseName,
      customerEmail: r.email,
      customData: {
        registration_id: registrationId,
        payment_id: payment.id,
      },
    });

    await supabaseAdmin
      .from("payments")
      .update({ paddle_transaction_id: transactionId })
      .eq("id", payment.id);

    return NextResponse.json({ transactionId });
  } catch (error: any) {
    console.error("Paddle create error:", error?.message || error);
    return NextResponse.json(
      { error: "Error al iniciar el pago internacional: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
