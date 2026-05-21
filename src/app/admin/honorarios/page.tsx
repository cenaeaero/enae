"use client";

import { useEffect, useMemo, useState } from "react";

type Fee = any;

const STATUS_LABELS: Record<string, string> = {
  proposed: "Propuesto",
  approved: "Aprobado · por pagar",
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

export default function AdminHonorariosPage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Fee | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/instructor-fees").then((r) => r.json());
    setFees(res.fees || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return fees;
    return fees.filter((f) => f.status === filter);
  }, [fees, filter]);

  const totals = useMemo(() => {
    const t = { proposed: 0, approved: 0, paid: 0 };
    for (const f of fees) {
      if (f.status === "proposed") t.proposed += f.amount;
      if (f.status === "approved") t.approved += f.amount;
      if (f.status === "paid")     t.paid     += (f.payment_amount || f.amount);
    }
    return t;
  }, [fees]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Honorarios de instructores</h1>
          <p className="text-sm text-gray-500">Propón un monto, el instructor aprueba o rechaza. Una vez pagado, registra los datos.</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="bg-[#0072CE] hover:bg-[#005fa3] text-white text-sm font-semibold px-4 py-2 rounded">
          + Nuevo honorario
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Card label="Por aprobar (propuesto)" value={fmtCLP(totals.proposed)} color="text-amber-700" />
        <Card label="Aprobado · por pagar"    value={fmtCLP(totals.approved)} color="text-purple-700" />
        <Card label="Pagado (acumulado)"      value={fmtCLP(totals.paid)}     color="text-green-700" />
      </div>

      <div className="flex gap-1 mb-4">
        {["all","proposed","approved","paid","rejected"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded ${filter === s ? "bg-[#0072CE] text-white" : "bg-white border border-gray-300 text-gray-600"}`}>
            {s === "all" ? "Todos" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400">Cargando…</p> : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Instructor</th>
                <th className="text-left px-4 py-3">Alumno · Curso</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => setEditing(f)}>
                  <td className="px-4 py-3 font-medium text-[#003366]">{f.instructor_email}</td>
                  <td className="px-4 py-3 text-xs">
                    <p>{f.registrations?.first_name} {f.registrations?.last_name}</p>
                    <p className="text-gray-400">{f.registrations?.courses?.title}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{fmtCLP(f.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLORS[f.status]}`}>{STATUS_LABELS[f.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {f.payment_date ? `${f.payment_date} · ${fmtCLP(f.payment_amount)}` : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin honorarios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <FeeForm initial={null} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />
      )}
      {editing && (
        <FeeForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function FeeForm({ initial, onClose, onSaved }: { initial: Fee | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !initial;
  const [form, setForm] = useState<any>(initial || { amount: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  async function save() {
    setSaving(true); setError("");
    const method = isNew ? "POST" : "PATCH";
    const payload = isNew ? form : { id: initial.id, ...form };
    const res = await fetch("/api/admin/instructor-fees", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Error"); return; }
    onSaved();
  }

  async function viewReceipt() {
    if (!initial?.receipt_file_url) return;
    const res = await fetch(`/api/instructor/upload?bucket=instructor-receipts&path=${encodeURIComponent(initial.receipt_file_url)}`).then((r) => r.json());
    if (res.url) window.open(res.url, "_blank");
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#003366]">{isNew ? "Nuevo honorario" : "Editar honorario"}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <F label="Email instructor *" value={form.instructor_email || ""} onChange={(v: string) => set("instructor_email", v)} disabled={!isNew} />
            <F label="Monto (CLP)"        value={form.amount?.toString() || ""} onChange={(v: string) => set("amount", v ? Number(v) : 0)} type="number" />
            <F label="Registration ID (opcional)" value={form.registration_id || ""} onChange={(v: string) => set("registration_id", v)} cls="col-span-2"/>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notas</label>
            <textarea rows={2} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm"/>
          </div>

          {!isNew && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Datos de pago (cuando se pague)</p>
              <div className="grid grid-cols-2 gap-3">
                <F label="Fecha pago"      value={form.payment_date || ""}      onChange={(v: string) => set("payment_date", v)} type="date" />
                <F label="Monto pagado"    value={form.payment_amount?.toString() || ""} onChange={(v: string) => set("payment_amount", v ? Number(v) : null)} type="number" />
                <F label="Banco"           value={form.payment_bank || ""}      onChange={(v: string) => set("payment_bank", v)} />
                <F label="Referencia"      value={form.payment_reference || ""} onChange={(v: string) => set("payment_reference", v)} />
              </div>
              {initial?.receipt_file_url && (
                <p className="text-xs mt-2">
                  Boleta del instructor: <button onClick={viewReceipt} className="text-[#0072CE] hover:underline">Ver</button>
                </p>
              )}
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white text-sm font-semibold rounded">
            {saving ? "Guardando…" : isNew ? "Proponer" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text", cls = "", disabled, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; cls?: string; disabled?: boolean; placeholder?: string;
}) {
  return (
    <div className={cls}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} disabled={disabled} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-100"/>
    </div>
  );
}
