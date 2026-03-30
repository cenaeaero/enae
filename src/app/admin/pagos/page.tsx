"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Payment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  tbk_token: string | null;
  tbk_response: Record<string, any> | null;
  refund_amount: number | null;
  refunded_at: string | null;
  created_at: string;
  student_name?: string;
  student_email?: string;
  course_title?: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  refunded: "bg-purple-100 text-purple-800",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  refunded: "Devuelto",
};

export default function AdminPagosPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundConfirm, setRefundConfirm] = useState<string | null>(null);
  const [refundError, setRefundError] = useState("");

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    const { data, error } = await supabase
      .from("payments")
      .select(
        `
        id, amount, currency, status, tbk_token, tbk_response,
        refund_amount, refunded_at, created_at,
        registrations (first_name, last_name, email, courses (title))
      `
      )
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPayments(
        data.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency || "CLP",
          status: p.status,
          tbk_token: p.tbk_token,
          tbk_response: p.tbk_response,
          refund_amount: p.refund_amount,
          refunded_at: p.refunded_at,
          created_at: p.created_at,
          student_name: `${p.registrations?.first_name || ""} ${p.registrations?.last_name || ""}`.trim(),
          student_email: p.registrations?.email,
          course_title: p.registrations?.courses?.title,
        }))
      );
    }
    setLoading(false);
  }

  async function handleRefund(payment: Payment) {
    setRefundingId(payment.id);
    setRefundError("");

    const res = await fetch("/api/pago/devolucion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId: payment.id,
        amount: payment.amount,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setRefundError(data.error || "Error al procesar devolución");
      setRefundingId(null);
      return;
    }

    // Update local state
    setPayments((prev) =>
      prev.map((p) =>
        p.id === payment.id
          ? {
              ...p,
              status: "refunded",
              refund_amount: payment.amount,
              refunded_at: new Date().toISOString(),
            }
          : p
      )
    );
    setRefundingId(null);
    setRefundConfirm(null);
  }

  const filtered =
    filter === "all"
      ? payments
      : payments.filter((p) => p.status === filter);

  function formatAmount(amount: number, currency: string) {
    if (currency === "CLP") {
      return `$${amount.toLocaleString("es-CL")}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Summary stats
  const totalApproved = payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = payments
    .filter((p) => p.status === "refunded")
    .reduce((sum, p) => sum + (p.refund_amount || p.amount), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#003366] mb-6">Pagos</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Total Pagos
          </p>
          <p className="text-2xl font-bold text-gray-800">{payments.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Aprobados
          </p>
          <p className="text-2xl font-bold text-green-600">
            {formatAmount(totalApproved, "CLP")}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Devueltos
          </p>
          <p className="text-2xl font-bold text-purple-600">
            {formatAmount(totalRefunded, "CLP")}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Neto
          </p>
          <p className="text-2xl font-bold text-[#003366]">
            {formatAmount(totalApproved - totalRefunded, "CLP")}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: "all", label: "Todos" },
          { key: "approved", label: "Aprobados" },
          { key: "pending", label: "Pendientes" },
          { key: "rejected", label: "Rechazados" },
          { key: "refunded", label: "Devueltos" },
        ].map((f) => {
          const count =
            f.key === "all"
              ? payments.length
              : payments.filter((p) => p.status === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === f.key
                  ? "bg-[#003366] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {refundError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {refundError}
          <button
            onClick={() => setRefundError("")}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-400">No hay pagos registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 font-medium">Alumno</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">
                  Curso
                </th>
                <th className="px-4 py-3 font-medium">Monto</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">
                  Orden
                </th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">
                  Tarjeta
                </th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">
                  Fecha
                </th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => (
                <>
                  <tr
                    key={payment.id}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpandedId(
                        expandedId === payment.id ? null : payment.id
                      )
                    }
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">
                        {payment.student_name || "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {payment.student_email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-[180px] truncate">
                      {payment.course_title || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {formatAmount(payment.amount, payment.currency)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">
                      {payment.tbk_response?.buyOrder || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {payment.tbk_response?.cardNumber
                        ? `****${payment.tbk_response.cardNumber}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${statusColors[payment.status] || ""}`}
                      >
                        {statusLabels[payment.status] || payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                      {formatDate(payment.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {payment.status === "approved" && (
                        <>
                          {refundConfirm === payment.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRefund(payment);
                                }}
                                disabled={refundingId === payment.id}
                                className="text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-2 py-1 rounded transition"
                              >
                                {refundingId === payment.id
                                  ? "..."
                                  : "Confirmar"}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRefundConfirm(null);
                                }}
                                className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRefundConfirm(payment.id);
                              }}
                              className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded font-medium transition"
                            >
                              Devolver
                            </button>
                          )}
                        </>
                      )}
                      {payment.status === "refunded" && (
                        <span className="text-xs text-purple-500">
                          {payment.refund_amount
                            ? formatAmount(payment.refund_amount, payment.currency)
                            : "Devuelto"}
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {expandedId === payment.id && payment.tbk_response && (
                    <tr key={`${payment.id}-detail`} className="bg-gray-50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Orden de compra
                            </p>
                            <p className="font-mono text-gray-800">
                              {payment.tbk_response.buyOrder}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Código autorización
                            </p>
                            <p className="font-mono text-gray-800">
                              {payment.tbk_response.authorizationCode || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Tipo de pago
                            </p>
                            <p className="text-gray-800">
                              {payment.tbk_response.paymentTypeCode === "VD"
                                ? "Débito"
                                : payment.tbk_response.paymentTypeCode === "VN"
                                  ? "Crédito"
                                  : payment.tbk_response.paymentTypeCode || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Cuotas
                            </p>
                            <p className="text-gray-800">
                              {payment.tbk_response.installmentsNumber === 0
                                ? "Sin cuotas"
                                : `${payment.tbk_response.installmentsNumber} cuotas`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Tarjeta
                            </p>
                            <p className="font-mono text-gray-800">
                              ****{payment.tbk_response.cardNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Fecha transacción
                            </p>
                            <p className="text-gray-800">
                              {payment.tbk_response.transactionDate
                                ? formatDate(
                                    payment.tbk_response.transactionDate
                                  )
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              Response Code
                            </p>
                            <p className="text-gray-800">
                              {payment.tbk_response.responseCode}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">
                              VCI
                            </p>
                            <p className="text-gray-800">
                              {payment.tbk_response.vci || "—"}
                            </p>
                          </div>
                          {payment.refunded_at && (
                            <>
                              <div>
                                <p className="text-xs text-purple-500 uppercase">
                                  Monto devuelto
                                </p>
                                <p className="font-semibold text-purple-700">
                                  {formatAmount(
                                    payment.refund_amount || 0,
                                    payment.currency
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-purple-500 uppercase">
                                  Fecha devolución
                                </p>
                                <p className="text-purple-700">
                                  {formatDate(payment.refunded_at)}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
