"use client";

import { useEffect, useState } from "react";

type Fee = {
  id: string;
  amount: number;
  status: string;
  proposed_by: string;
  approved_at: string | null;
  payment_date: string | null;
  payment_amount: number | null;
  payment_bank: string | null;
  payment_reference: string | null;
  receipt_file_url: string | null;
  notes: string | null;
  created_at: string;
  registrations?: { first_name: string; last_name: string; courses?: { title: string; code: string | null } | null } | null;
};

const STATUS_LABELS: Record<string, string> = {
  proposed: "Por aprobar",
  approved: "Aprobado · esperando pago",
  paid: "Pagado",
  rejected: "Rechazado",
};
const STATUS_COLORS: Record<string, string> = {
  proposed: "bg-amber-100 text-amber-800",
  approved: "bg-purple-100 text-purple-800",
  paid: "bg-green-100 text-green-800",
  rejected: "bg-gray-100 text-gray-500",
};

function fmtCLP(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

export default function HonorariosPage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const q = new URLSearchParams(window.location.search).get("as_instructor");
    const suffix = q ? `?as_instructor=${q}` : "";
    const res = await fetch(`/api/instructor/fees${suffix}`).then((r) => r.json());
    setFees(res.fees || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id);
    const res = await fetch("/api/instructor/fees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setBusy(null);
    setMsg(res.ok ? "✓ Listo. Admin notificado." : "Error");
    if (res.ok) load();
  }

  async function uploadReceipt(id: string, f: File) {
    setBusy(id);
    const fd = new FormData();
    fd.append("kind", "receipt");
    fd.append("id", id);
    fd.append("file", f);
    const res = await fetch("/api/instructor/upload", { method: "POST", body: fd });
    setBusy(null);
    if (res.ok) { setMsg("✓ Boleta subida"); load(); }
  }

  async function viewReceipt(path: string) {
    const res = await fetch(`/api/instructor/upload?bucket=instructor-receipts&path=${encodeURIComponent(path)}`).then((r) => r.json());
    if (res.url) window.open(res.url, "_blank");
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-[#003366] mb-4">Mis Honorarios</h1>
      <p className="text-xs text-gray-500 mb-4">
        El admin propone un monto, tú lo apruebas o rechazas. Una vez aprobado y pagado, sube tu boleta de honorarios.
      </p>
      {msg && <div className="mb-3 bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded text-sm">{msg}</div>}

      {loading ? <p className="text-gray-400">Cargando…</p> : fees.length === 0 ? (
        <p className="text-gray-400">Aún no tienes honorarios.</p>
      ) : (
        <div className="space-y-3">
          {fees.map((f) => (
            <div key={f.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#003366]">{f.registrations?.courses?.title || "—"}</p>
                  <p className="text-xs text-gray-500">{f.registrations?.first_name} {f.registrations?.last_name} · {f.registrations?.courses?.code || ""}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-2">{fmtCLP(f.amount)}</p>
                  {f.notes && <p className="text-xs text-gray-500 mt-1">📝 {f.notes}</p>}
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded ${STATUS_COLORS[f.status]}`}>{STATUS_LABELS[f.status]}</span>
              </div>

              {/* Datos del pago (cuando el admin los registra) */}
              {(f.payment_date || f.payment_bank) && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Info label="Fecha pago" value={f.payment_date || "—"} />
                  <Info label="Monto pagado" value={fmtCLP(f.payment_amount)} />
                  <Info label="Banco" value={f.payment_bank || "—"} />
                  <Info label="Referencia" value={f.payment_reference || "—"} />
                </div>
              )}

              {/* Acciones */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
                {f.status === "proposed" && (
                  <>
                    <button onClick={() => decide(f.id, "approve")} disabled={busy === f.id}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded">Aprobar</button>
                    <button onClick={() => decide(f.id, "reject")} disabled={busy === f.id}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded">Rechazar</button>
                  </>
                )}
                {(f.status === "approved" || f.status === "paid") && (
                  <label className="text-xs cursor-pointer text-[#0072CE] hover:underline">
                    📎 {f.receipt_file_url ? "Cambiar boleta" : "Subir boleta de honorarios"}
                    <input type="file" accept="application/pdf,image/*" className="hidden"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadReceipt(f.id, file); }} />
                  </label>
                )}
                {f.receipt_file_url && (
                  <button onClick={() => viewReceipt(f.receipt_file_url!)} className="text-xs text-[#0072CE] hover:underline">Ver boleta</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase">{label}</p>
      <p className="text-xs text-gray-800">{value}</p>
    </div>
  );
}
