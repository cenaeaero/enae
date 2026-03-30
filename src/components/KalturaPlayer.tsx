"use client";

import { useEffect, useRef } from "react";

type KalturaPlayerProps = {
  entryId: string;
  partnerId?: number;
  uiconfId?: number;
};

const PARTNER_ID = 4530803;
const UICONF_ID = 49725323;

export default function KalturaPlayer({
  entryId,
  partnerId = PARTNER_ID,
  uiconfId = UICONF_ID,
}: KalturaPlayerProps) {
  const containerId = `kaltura_player_${entryId.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!entryId) return;

    function embedPlayer() {
      if (typeof window !== "undefined" && (window as any).kWidget) {
        (window as any).kWidget.thumbEmbed({
          targetId: containerId,
          wid: `_${partnerId}`,
          uiconf_id: uiconfId,
          flashvars: {},
          cache_st: Date.now(),
          entry_id: entryId,
        });
      }
    }

    // Load Kaltura script if not loaded
    if (!scriptLoadedRef.current) {
      const existingScript = document.querySelector(
        `script[src*="kaltura.com/p/${partnerId}"]`
      );
      if (existingScript) {
        scriptLoadedRef.current = true;
        // Small delay to ensure kWidget is ready
        setTimeout(embedPlayer, 100);
      } else {
        const script = document.createElement("script");
        script.src = `https://cdnapisec.kaltura.com/p/${partnerId}/sp/${partnerId}00/embedIframeJs/uiconf_id/${uiconfId}/partner_id/${partnerId}`;
        script.async = true;
        script.onload = () => {
          scriptLoadedRef.current = true;
          setTimeout(embedPlayer, 100);
        };
        document.head.appendChild(script);
      }
    } else {
      embedPlayer();
    }
  }, [entryId, partnerId, uiconfId, containerId]);

  if (!entryId) {
    return (
      <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center">
        <p className="text-gray-500 text-sm">No hay video disponible</p>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-lg overflow-hidden">
      <div
        id={containerId}
        ref={containerRef}
        className="w-full aspect-video"
      />
    </div>
  );
}
