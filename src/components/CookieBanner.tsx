"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("enae-cookie-consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem("enae-cookie-consent", "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("enae-cookie-consent", "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-gray-700">
            Utilizamos cookies esenciales para el funcionamiento del sitio y la
            autenticación del portal de alumnos.{" "}
            <Link
              href="/privacidad"
              className="text-[#0072CE] hover:underline"
            >
              Política de Privacidad
            </Link>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Rechazar
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm bg-[#003366] text-white rounded-lg hover:bg-[#004B87] transition font-medium"
          >
            Aceptar cookies
          </button>
        </div>
      </div>
    </div>
  );
}
