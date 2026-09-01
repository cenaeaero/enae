"use client";

import { useEffect } from "react";

// Widget de Chatwoot (soporte / chatbot). Se activa solo si están definidas las
// variables de entorno; sin token no renderiza nada (seguro por defecto).
//   NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN  → token del inbox "Website" de ENAE en Chatwoot
//   NEXT_PUBLIC_CHATWOOT_BASE_URL       → URL de tu Chatwoot (app.chatwoot.com o self-host)
export default function ChatwootWidget() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN;
    const baseUrl = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL || "https://app.chatwoot.com";
    if (!token) return;
    // Evita doble carga (navegación SPA / StrictMode)
    if ((window as any).chatwootSDK || document.getElementById("chatwoot-sdk")) return;

    (window as any).chatwootSettings = {
      locale: "es",
      position: "right",
      type: "standard",
      launcherTitle: "¿Necesitas ayuda?",
    };

    const script = document.createElement("script");
    script.id = "chatwoot-sdk";
    script.src = `${baseUrl}/packs/js/sdk.js`;
    script.defer = true;
    script.async = true;
    script.onload = () => {
      (window as any).chatwootSDK?.run({ websiteToken: token, baseUrl });
    };
    document.body.appendChild(script);
  }, []);

  return null;
}
