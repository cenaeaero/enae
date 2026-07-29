import { NextResponse } from "next/server";
import { verifyPaddleSignature } from "@/lib/paddle";
import { supabaseAdmin } from "@/lib/supabase-service";
import {
  sendAdminPaymentNotification,
  sendStudentPaymentReceipt,
  sendStudentCourseAccess,
} from "@/lib/email";

// Webhook de Paddle Billing. Confirma el pago internacional (USD).
// Configurar la URL en Paddle → Developer Tools → Notifications:
//   https://www.enae.cl/api/pago/paddle/webhook   (evento: transaction.completed)
export async function POST(request: Request) {
  // Leer el cuerpo crudo: la firma se calcula sobre el texto exacto.
  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature");

  if (!verifyPaddleSignature(rawBody, signature)) {
    console.error("Paddle webhook: firma inválida");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Solo nos interesa la transacción completada (dinero capturado).
  if (event?.event_type !== "transaction.completed") {
    return NextResponse.json({ ok: true, ignored: event?.event_type });
  }

  try {
    const data = event.data || {};
    const custom = data.custom_data || {};
    const paymentId: string | undefined = custom.payment_id;
    const registrationId: string | undefined = custom.registration_id;
    const txnId: string | undefined = data.id;

    // Localizar el pago por payment_id (o por el id de transacción como respaldo).
    let payment: any = null;
    if (paymentId) {
      const { data: p } = await supabaseAdmin
        .from("payments")
        .select("id, registration_id, amount, status")
        .eq("id", paymentId)
        .maybeSingle();
      payment = p;
    }
    if (!payment && txnId) {
      const { data: p } = await supabaseAdmin
        .from("payments")
        .select("id, registration_id, amount, status")
        .eq("paddle_transaction_id", txnId)
        .maybeSingle();
      payment = p;
    }

    if (!payment) {
      console.error("Paddle webhook: pago no encontrado", { paymentId, txnId });
      // 200 para que Paddle no reintente indefinidamente por un pago inexistente.
      return NextResponse.json({ ok: true, warning: "payment not found" });
    }

    // Idempotencia: si ya se procesó, no reenviar correos.
    if (payment.status === "approved") {
      return NextResponse.json({ ok: true, already: true });
    }

    await supabaseAdmin
      .from("payments")
      .update({ status: "approved", paddle_response: data })
      .eq("id", payment.id);

    await supabaseAdmin
      .from("registrations")
      .update({ status: "confirmed" })
      .eq("id", payment.registration_id);

    // Notificaciones (mismos correos que el flujo Transbank).
    try {
      const { data: reg } = await supabaseAdmin
        .from("registrations")
        .select("first_name, last_name, email, courses (title)")
        .eq("id", payment.registration_id)
        .single();

      if (reg) {
        const r = reg as any;
        const studentName = `${r.first_name} ${r.last_name}`;
        const courseName = r.courses?.title || "Curso";

        await sendAdminPaymentNotification(studentName, r.email, courseName, payment.amount);
        await sendStudentPaymentReceipt(r.email, studentName, courseName, {
          buyOrder: txnId || "",
          amount: payment.amount,
          currency: "USD",
          cardNumber: "",
          authorizationCode: "",
          installments: 0,
          date: data.billed_at || new Date().toISOString(),
        });
        await sendStudentCourseAccess(r.email, studentName, courseName);
      }
    } catch (e) {
      console.error("Paddle webhook: fallo enviando correos:", e);
    }

    return NextResponse.json({ ok: true, registration: registrationId });
  } catch (error: any) {
    console.error("Paddle webhook error:", error?.message || error);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
