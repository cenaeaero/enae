"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Muestra un código QR grande para proyectar/compartir, con opciones de
// descarga (PNG) y pantalla completa. Ideal para que los alumnos escaneen y
// accedan a una actividad del LMS o al link de la clase.
export default function QRDisplay({ value, title, subtitle, onClose }: {
  value: string;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [full, setFull] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(value, { width: 900, margin: 2, errorCorrectionLevel: "M" })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [value]);

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR-${(title || "acceso").replace(/[^\p{L}\p{N}]+/gu, "-")}.png`;
    a.click();
  }

  const card = (big: boolean) => (
    <div className={`bg-white rounded-lg ${big ? "p-8" : "p-5 border border-gray-200"} text-center`}>
      {title && <h3 className={`font-bold text-[#003366] ${big ? "text-3xl mb-2" : "text-base mb-1"}`}>{title}</h3>}
      {subtitle && <p className={`text-gray-500 ${big ? "text-lg mb-4" : "text-xs mb-3"}`}>{subtitle}</p>}
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="Código QR" className={`mx-auto ${big ? "w-[min(70vh,70vw)]" : "w-56"} h-auto`} />
      ) : (
        <p className="text-sm text-gray-400 py-10">Generando QR…</p>
      )}
      <p className={`text-gray-400 break-all ${big ? "text-sm mt-4" : "text-[11px] mt-2"}`}>{value}</p>
    </div>
  );

  if (full) {
    return (
      <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center p-6" onClick={() => setFull(false)}>
        {card(true)}
        <p className="text-xs text-gray-400 mt-6">Toca la pantalla para salir de pantalla completa</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {card(false)}
        <div className="flex justify-center gap-2 mt-3">
          <button onClick={() => setFull(true)} className="text-sm bg-[#003366] hover:bg-[#00254d] text-white font-medium px-4 py-2 rounded">🔳 Pantalla completa</button>
          <button onClick={download} className="text-sm bg-[#0072CE] hover:bg-[#005fa3] text-white font-medium px-4 py-2 rounded">⬇️ Descargar PNG</button>
          {onClose && <button onClick={onClose} className="text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded">Cerrar</button>}
        </div>
      </div>
    </div>
  );
}
