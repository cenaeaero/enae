import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { refundTransaction } from "@/lib/transbank";

export async function POST(request: Request) {
  try {
    const { paymentId, amount } = await request.json();

    if (!paymentId || !amount) {
      return NextResponse.json(
        { error: "paymentId y amount son requeridos" },
        { status: 400 }
      );
    }

    // Verify admin
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Solo administradores pueden realizar devoluciones" },
        { status: 403 }
      );
    }

    // Get payment
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (!payment) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    if (payment.status !== "approved") {
      return NextResponse.json(
        { error: "Solo se pueden devolver pagos aprobados" },
        { status: 400 }
      );
    }

    if (!payment.tbk_token) {
      return NextResponse.json(
        { error: "No se encontró el token de Transbank para este pago" },
        { status: 400 }
      );
    }

    if (amount > payment.amount) {
      return NextResponse.json(
        { error: "El monto de devolución no puede ser mayor al monto del pago" },
        { status: 400 }
      );
    }

    // Call Transbank refund
    const refundResponse = await refundTransaction(payment.tbk_token, amount);

    // Update payment record
    const { error: updateError } = await supabaseAdmin
      .from("payments")
      .update({
        status: "refunded",
        refund_amount: amount,
        refund_response: refundResponse,
        refunded_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (updateError) {
      console.error("Error updating payment after refund:", updateError);
      return NextResponse.json(
        { error: "Devolución procesada pero error al actualizar registro: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      refundResponse,
    });
  } catch (error: any) {
    console.error("Refund error:", error);
    return NextResponse.json(
      { error: "Error al procesar la devolución: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
