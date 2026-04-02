"use client";

type Props = {
  topic: string;
  startTime: string;
  durationMinutes: number;
  joinUrl: string;
  status: string;
};

export default function ZoomMeetingCard({ topic, startTime, durationMinutes, joinUrl, status }: Props) {
  const start = new Date(startTime);
  const now = new Date();
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const isLive = now >= start && now <= end;
  const isPast = now > end;
  const isFuture = now < start;

  function formatDate(date: Date) {
    return date.toLocaleString("es-CL", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getTimeUntil() {
    const diff = start.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return `en ${Math.floor(hours / 24)} dias`;
    if (hours > 0) return `en ${hours}h ${mins}m`;
    return `en ${mins} minutos`;
  }

  return (
    <div className={`rounded-lg border p-4 ${isLive ? "border-green-400 bg-green-50" : isPast ? "border-gray-200 bg-gray-50" : "border-blue-200 bg-blue-50"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎥</span>
          <span className="text-sm font-medium text-gray-800">{topic}</span>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded ${
          isLive ? "bg-green-600 text-white" : isPast ? "bg-gray-400 text-white" : "bg-blue-600 text-white"
        }`}>
          {isLive ? "EN VIVO" : isPast ? "Finalizada" : "Programada"}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p>📅 {formatDate(start)}</p>
        <p>⏱ {durationMinutes} minutos</p>
        {isFuture && <p className="text-blue-700 font-medium">Inicia {getTimeUntil()}</p>}
      </div>

      {!isPast && joinUrl && (
        <a
          href={joinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            isLive
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isLive ? "Unirse Ahora" : "Unirse a la Sesion"}
        </a>
      )}

      {isPast && (
        <p className="mt-3 text-xs text-gray-400">Esta sesion ya finalizo</p>
      )}
    </div>
  );
}
