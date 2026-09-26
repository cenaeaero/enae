"use client";

import { useEffect, useState } from "react";

// Chat de soporte "Rebecca" (Chatwoot), igual al de uascontrol.
// El token del sitio web NO es secreto (va en el cliente), así que viene por
// defecto; puede sobrescribirse con variables de entorno si algún día cambia.
const TOKEN = process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN || "rtNogAFccsJfmRmh5ddbbGnh";
const BASE_URL = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL || "https://soporte.uascontrol.io";

export default function ChatwootWidget() {
  // El texto "Hablar con Rebecca" permanece oculto y sólo se despliega al pasar
  // el mouse (o al enfocar con teclado); por defecto se ve sólo el avatar.
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!TOKEN) return;
    if ((window as any).chatwootSDK || document.getElementById("chatwoot-sdk")) return;

    // Ocultamos la burbuja por defecto: usamos el launcher propio "Rebecca".
    (window as any).chatwootSettings = { hideMessageBubble: true, position: "right", locale: "es" };

    const script = document.createElement("script");
    script.id = "chatwoot-sdk";
    script.src = `${BASE_URL}/packs/js/sdk.js`;
    script.defer = true;
    script.async = true;
    script.onload = () => {
      (window as any).chatwootSDK?.run({ websiteToken: TOKEN, baseUrl: BASE_URL });
    };
    document.body.appendChild(script);
  }, []);

  function openChat() {
    const cw = (window as any).$chatwoot;
    if (cw) cw.toggle("open");
  }

  if (!TOKEN) return null;

  return (
    <div
      id="rebecca-launcher"
      role="button"
      tabIndex={0}
      aria-label="Hablar con Rebecca"
      onClick={openChat}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openChat(); } }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      style={{
        position: "fixed",
        right: 22,
        bottom: 22,
        zIndex: 2147482000,
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <span
        style={{
          background: "#0f6cbd",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          // Colapsado por defecto: sin ancho, sin padding y transparente; se
          // despliega suavemente al hover/focus. Así sólo se ve el avatar.
          maxWidth: expanded ? 220 : 0,
          opacity: expanded ? 1 : 0,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: expanded ? 16 : 0,
          paddingRight: expanded ? 34 : 0,
          marginRight: expanded ? -26 : 0,
          borderRadius: 22,
          boxShadow: expanded ? "0 3px 12px rgba(0,0,0,.25)" : "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          pointerEvents: "none",
          transition: "max-width .25s ease, opacity .2s ease, padding .25s ease, margin .25s ease",
        }}
      >
        Hablar con Rebecca
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/rebecca-chat.png"
        width={66}
        height={66}
        alt="Rebecca"
        style={{ borderRadius: "50%", boxShadow: "0 3px 12px rgba(0,0,0,.3)", display: "block" }}
      />
    </div>
  );
}
