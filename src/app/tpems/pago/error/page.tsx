import Link from "next/link";

export default function PagoErrorPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-10 h-10 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Pago no procesado
      </h1>
      <p className="text-gray-500 mb-8">
        La transaccion fue rechazada o cancelada. Puedes intentar nuevamente
        desde tu dashboard.
      </p>
      <Link
        href="/tpems"
        className="inline-block bg-[#0072CE] hover:bg-[#005fa3] text-white font-medium px-6 py-3 rounded-lg transition"
      >
        Volver al Dashboard
      </Link>
    </div>
  );
}
