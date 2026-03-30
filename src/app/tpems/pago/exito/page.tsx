"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function PagoExitoContent() {
  const params = useSearchParams();

  const order = params.get("order") || "";
  const amount = params.get("amount") || "";
  const card = params.get("card") || "";
  const auth = params.get("auth") || "";
  const date = params.get("date") || "";
  const installments = params.get("installments") || "0";

  const formattedDate = date
    ? new Date(date).toLocaleString("es-CL", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "";

  const formattedAmount = amount
    ? `$${parseInt(amount).toLocaleString("es-CL")}`
    : "";

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Success icon */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">
          Pago realizado con exito
        </h1>
        <p className="text-gray-500 mt-1">
          Tu inscripcion ha sido confirmada.
        </p>
      </div>

      {/* Transaction details */}
      {order && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          <div className="bg-[#003366] text-white px-6 py-3">
            <h2 className="font-medium text-sm">Comprobante de Pago</h2>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-6 py-3 text-gray-500">Orden de compra</td>
                <td className="px-6 py-3 text-gray-800 text-right font-mono">
                  {order}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-gray-500">Monto</td>
                <td className="px-6 py-3 text-gray-800 text-right font-bold">
                  {formattedAmount} CLP
                </td>
              </tr>
              {card && (
                <tr>
                  <td className="px-6 py-3 text-gray-500">Tarjeta</td>
                  <td className="px-6 py-3 text-gray-800 text-right font-mono">
                    **** **** **** {card}
                  </td>
                </tr>
              )}
              {auth && (
                <tr>
                  <td className="px-6 py-3 text-gray-500">
                    Codigo autorizacion
                  </td>
                  <td className="px-6 py-3 text-gray-800 text-right font-mono">
                    {auth}
                  </td>
                </tr>
              )}
              {installments && installments !== "0" && (
                <tr>
                  <td className="px-6 py-3 text-gray-500">Cuotas</td>
                  <td className="px-6 py-3 text-gray-800 text-right">
                    {installments}
                  </td>
                </tr>
              )}
              {formattedDate && (
                <tr>
                  <td className="px-6 py-3 text-gray-500">Fecha</td>
                  <td className="px-6 py-3 text-gray-800 text-right">
                    {formattedDate}
                  </td>
                </tr>
              )}
              <tr>
                <td className="px-6 py-3 text-gray-500">Estado</td>
                <td className="px-6 py-3 text-right">
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                    Aprobado
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="text-center space-y-3">
        <Link
          href="/tpems"
          className="inline-block bg-[#0072CE] hover:bg-[#005fa3] text-white font-medium px-6 py-3 rounded-lg transition"
        >
          Ir al Dashboard
        </Link>
        <p className="text-xs text-gray-400">
          Recibiras un email de confirmacion en tu correo.
        </p>
      </div>
    </div>
  );
}

export default function PagoExitoPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      }
    >
      <PagoExitoContent />
    </Suspense>
  );
}
