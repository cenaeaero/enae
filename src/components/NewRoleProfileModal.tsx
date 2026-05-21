"use client";

import { useState } from "react";

type Props = {
  role: "instructor" | "supervisor" | "student" | "admin";
  title: string;
  companyId?: string | null;
  onClose: () => void;
  onCreated?: (profile: any) => void;
};

export default function NewRoleProfileModal({ role, title, companyId, onClose, onCreated }: Props) {
  const [form, setForm] = useState<any>({ role, company_id: companyId || null, send_credentials: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ password: string | null; email: string } | null>(null);

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  async function save() {
    setSaving(true); setError("");
    const res = await fetch("/api/admin/perfiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Error"); return; }
    setCreated({ password: data.tempPassword, email: data.profile?.email });
    onCreated?.(data.profile);
  }

  if (created) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold text-green-700">✓ {title} creado</h2>
          <div className="mt-4 space-y-2 text-sm">
            <p><strong>Email:</strong> {created.email}</p>
            {created.password ? (
              <>
                <p><strong>Clave temporal:</strong> <code className="bg-gray-100 px-2 py-0.5 rounded font-mono">{created.password}</code></p>
                <p className="text-xs text-gray-500">Se envió un email con estas credenciales. Si no llega, comparte la clave manualmente.</p>
              </>
            ) : (
              <p className="text-xs text-gray-500">El usuario ya existía. Solo se actualizó su rol y empresa.</p>
            )}
          </div>
          <div className="mt-6 text-right">
            <button onClick={onClose} className="px-4 py-2 bg-[#0072CE] text-white rounded text-sm font-semibold">Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#003366]">{title}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}
          <F label="Email *" value={form.email || ""} onChange={(v) => set("email", v)} type="email" />
          <div className="grid grid-cols-2 gap-3">
            <F label="Nombre *" value={form.first_name || ""} onChange={(v) => set("first_name", v)} />
            <F label="Apellido *" value={form.last_name || ""} onChange={(v) => set("last_name", v)} />
            <F label="RUT" value={form.rut || ""} onChange={(v) => set("rut", v)} />
            <F label="Teléfono" value={form.phone || ""} onChange={(v) => set("phone", v)} />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={form.send_credentials !== false} onChange={(e) => set("send_credentials", e.target.checked)} />
            Enviar email con credenciales (si es usuario nuevo)
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white text-sm font-semibold rounded">
            {saving ? "Creando…" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm"/>
    </div>
  );
}
