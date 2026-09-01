"use client";

import { useEffect } from "react";

// Chat de soporte "Rebecca" (Chatwoot), igual al de uascontrol.
// El token del sitio web NO es secreto (va en el cliente), así que viene por
// defecto; puede sobrescribirse con variables de entorno si algún día cambia.
const TOKEN = process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN || "rtNogAFccsJfmRmh5ddbbGnh";
const BASE_URL = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL || "https://soporte.uascontrol.io";

export default function ChatwootWidget() {
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
      aria-label="Hablar con Rebecca"
      onClick={openChat}
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
          padding: "10px 34px 10px 16px",
          borderRadius: 22,
          marginRight: -26,
          boxShadow: "0 3px 12px rgba(0,0,0,.25)",
          whiteSpace: "nowrap",
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
