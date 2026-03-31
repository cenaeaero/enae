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
  const regId = params.get("regId") || "";
  const moodleEnrolled = params.get("moodle") === "1";

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

      {/* Next steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
        <h3 className="font-semibold text-[#003366] mb-2">Siguientes pasos</h3>
        <ol className="text-sm text-gray-700 space-y-1.5 list-decimal pl-5">
          <li>Recibirás un email de confirmación con los detalles del pago</li>
          <li>Tu inscripción ha sido confirmada y puedes acceder al curso</li>
          {moodleEnrolled ? (
            <li><strong>Ya estas inscrito en la plataforma LMS.</strong> Revisa tu correo para los datos de acceso a <a href="https://cursos.enae.cl" className="text-[#0072CE] underline" target="_blank">cursos.enae.cl</a></li>
          ) : (
            <li>Ingresa a la plataforma LMS para comenzar tu formación</li>
          )}
        </ol>
      </div>

      {/* Moodle direct access */}
      {moodleEnrolled && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-5 mb-6">
          <h3 className="font-semibold text-[#F57C00] mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Acceso inmediato al curso
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            Tu cuenta en la plataforma LMS ya está lista. Hemos enviado tus credenciales de acceso a tu correo electrónico.
          </p>
          <a
            href="https://cursos.enae.cl/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#F57C00] hover:bg-[#E65100] text-white font-semibold px-5 py-2.5 rounded-lg transition text-sm"
          >
            Ir a cursos.enae.cl
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </div>
      )}

      <div className="text-center space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {regId ? (
            <Link
              href={`/tpems/curso/${regId}`}
              className="inline-flex items-center justify-center gap-2 bg-[#F57C00] hover:bg-[#E65100] text-white font-semibold px-6 py-3 rounded-lg transition"
            >
              Ver mi Curso
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          ) : (
            <a
              href="https://cursos.enae.cl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#F57C00] hover:bg-[#E65100] text-white font-semibold px-6 py-3 rounded-lg transition"
            >
              Iniciar Curso en LMS
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          )}
          <Link
            href="/tpems"
            className="inline-flex items-center justify-center gap-2 bg-[#0072CE] hover:bg-[#005fa3] text-white font-medium px-6 py-3 rounded-lg transition"
          >
            Ir al Portal Alumno
          </Link>
        </div>
        <p className="text-xs text-gray-400">
          Recibirás un email de confirmación en tu correo.
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
