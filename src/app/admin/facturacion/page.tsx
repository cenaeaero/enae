"use client";

import { useEffect, useState, useMemo } from "react";
import CompanyPicker, { type Company } from "@/components/CompanyPicker";

type BillingCase = {
  id: string;
  company: string;
  course_id: string | null;
  session_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  quotation_number: string | null;
  quotation_date: string | null;
  quotation_amount: number | null;
  quotation_sent_at: string | null;
  quotation_file_url: string | null;
  oc_number: string | null;
  oc_received_at: string | null;
  oc_file_url: string | null;
  hes_number: string | null;
  hes_received_at: string | null;
  hes_file_url: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_amount: number | null;
  invoice_file_url: string | null;
  payment_due_date: string | null;
  payment_received_at: string | null;
  payment_amount: number | null;
  payment_reference: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  courses?: { title: string; code: string | null } | null;
  sessions?: { dates: string; location: string } | null;
  billing_case_registrations?: {
    registration_id: string;
    registrations: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      status: string;
      grade_status: string | null;
      final_score: number | null;
    } | null;
  }[];
};

type Summary = {
  company: string;
  open_cases: number;
  paid_cases: number;
  overdue_cases: number;
  amount_receivable: number;
  amount_overdue: number;
  amount_collected: number;
  amount_pipeline: number;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  quoted: "Cotizado",
  oc_pending: "Esperando O/C",
  hes_pending: "Esperando HES",
  to_invoice: "Por facturar",
  invoiced: "Facturado",
  paid: "Pagado",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  quoted: "bg-blue-50 text-blue-700 border-blue-200",
  oc_pending: "bg-amber-50 text-amber-700 border-amber-200",
  hes_pending: "bg-orange-50 text-orange-700 border-orange-200",
  to_invoice: "bg-purple-50 text-purple-700 border-purple-200",
  invoiced: "bg-indigo-50 text-indigo-700 border-indigo-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-400 border-gray-200",
};

const PIPELINE_ORDER = [
  "quoted",
  "oc_pending",
  "hes_pending",
  "to_invoice",
  "invoiced",
  "paid",
  "overdue",
];

function fmtCLP(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return d.split("T")[0];
}

export default function AdminFacturacionPage() {
  const [cases, setCases] = useState<BillingCase[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pipeline" | "company" | "overdue">("pipeline");
  const [editing, setEditing] = useState<BillingCase | null>(null);
  const [filterCompany, setFilterCompany] = useState("");

  async function load() {
    setLoading(true);
    const [casesRes, summaryRes] = await Promise.all([
      fetch("/api/admin/facturacion?view=cases").then((r) => r.json()),
      fetch("/api/admin/facturacion?view=summary").then((r) => r.json()),
    ]);
    setCases(casesRes.cases || []);
    setSummary(summaryRes.summary || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredCases = useMemo(() => {
    if (!filterCompany) return cases;
    const f = filterCompany.toLowerCase();
    return cases.filter((c) => c.company.toLowerCase().includes(f));
  }, [cases, filterCompany]);

  const overdueCases = useMemo(
    () => filteredCases.filter((c) => c.status === "overdue"),
    [filteredCases]
  );

  const totalsByStatus = useMemo(() => {
    const t: Record<string, { count: number; amount: number }> = {};
    for (const c of filteredCases) {
      t[c.status] ||= { count: 0, amount: 0 };
      t[c.status].count++;
      t[c.status].amount += c.invoice_amount || c.quotation_amount || 0;
    }
    return t;
  }, [filteredCases]);

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Cargando facturación…</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Facturación B2B</h1>
          <p className="text-sm text-gray-500">Cotización → O/C → HES → Factura → Pago. Vencimiento por defecto: 30 días.</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/facturacion/export"
            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Exportar CSV
          </a>
          <button
            onClick={() => setEditing({ id: "", company: "" } as any)}
            className="inline-flex items-center gap-1.5 bg-[#0072CE] hover:bg-[#005fa3] text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            + Nuevo caso
          </button>
        </div>
      </div>

      {/* Filtro empresa */}
      <input
        type="text"
        placeholder="Filtrar por empresa…"
        value={filterCompany}
        onChange={(e) => setFilterCompany(e.target.value)}
        className="mb-4 w-full sm:max-w-xs py-2 px-3 border border-gray-300 rounded-lg text-sm"
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { key: "pipeline", label: "Pipeline" },
          { key: "company", label: "Por Empresa" },
          { key: "overdue", label: `Vencidos (${overdueCases.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.key ? "border-[#0072CE] text-[#0072CE]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* PIPELINE */}
      {tab === "pipeline" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PIPELINE_ORDER.map((status) => {
            const items = filteredCases.filter((c) => c.status === status);
            const t = totalsByStatus[status] || { count: 0, amount: 0 };
            return (
              <div key={status} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded border ${STATUS_COLORS[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="text-xs text-gray-500">{t.count} · {fmtCLP(t.amount)}</span>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Sin casos</p>
                  ) : (
                    items.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setEditing(c)}
                        className="block w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-[#0072CE] transition"
                      >
                        <p className="font-semibold text-sm text-[#003366] truncate">{c.company}</p>
                        <p className="text-xs text-gray-500 truncate">{c.courses?.title || "—"}</p>
                        <p className="text-xs text-gray-400 mt-1">{c.sessions?.dates || ""}</p>
                        <div className="flex justify-between mt-2 text-xs">
                          <span className="text-gray-500">{c.billing_case_registrations?.length || 0} alumnos</span>
                          <span className="font-semibold text-gray-700">{fmtCLP(c.invoice_amount || c.quotation_amount)}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POR EMPRESA */}
      {tab === "company" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3 text-right">Abiertos</th>
                <th className="px-4 py-3 text-right">Pagados</th>
                <th className="px-4 py-3 text-right text-red-600">Vencidos</th>
                <th className="px-4 py-3 text-right">Pipeline (cotizado)</th>
                <th className="px-4 py-3 text-right">Por cobrar</th>
                <th className="px-4 py-3 text-right text-red-600">Vencido</th>
                <th className="px-4 py-3 text-right">Cobrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary
                .filter((s) => !filterCompany || s.company.toLowerCase().includes(filterCompany.toLowerCase()))
                .map((s) => (
                  <tr key={s.company} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-[#003366]">{s.company}</td>
                    <td className="px-4 py-3 text-right">{s.open_cases}</td>
                    <td className="px-4 py-3 text-right">{s.paid_cases}</td>
                    <td className={`px-4 py-3 text-right ${s.overdue_cases > 0 ? "text-red-600 font-bold" : ""}`}>{s.overdue_cases}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtCLP(s.amount_pipeline)}</td>
                    <td className="px-4 py-3 text-right">{fmtCLP(s.amount_receivable)}</td>
                    <td className={`px-4 py-3 text-right ${s.amount_overdue > 0 ? "text-red-600 font-bold" : ""}`}>{fmtCLP(s.amount_overdue)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmtCLP(s.amount_collected)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VENCIDOS */}
      {tab === "overdue" && (
        <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
          {overdueCases.length === 0 ? (
            <p className="p-8 text-center text-gray-400">Sin facturas vencidas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-red-50 text-left text-xs text-red-700 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Curso</th>
                  <th className="px-4 py-3">N° Factura</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-right">Días vencido</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overdueCases.map((c) => {
                  const days = c.payment_due_date
                    ? Math.floor((Date.now() - new Date(c.payment_due_date).getTime()) / 86400000)
                    : 0;
                  return (
                    <tr key={c.id} className="hover:bg-red-50">
                      <td className="px-4 py-3 font-semibold">{c.company}</td>
                      <td className="px-4 py-3 text-gray-600">{c.courses?.title || "—"}</td>
                      <td className="px-4 py-3">{c.invoice_number || "—"}</td>
                      <td className="px-4 py-3">{fmtDate(c.payment_due_date)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmtCLP(c.invoice_amount)}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-bold">{days}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setEditing(c)} className="text-xs text-[#0072CE] hover:underline">
                          Abrir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <CaseEditor
          billingCase={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// Modal de edición de caso
// =============================================================================

function CaseEditor({
  billingCase,
  onClose,
  onSaved,
}: {
  billingCase: BillingCase;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !billingCase.id;
  const [form, setForm] = useState<any>({ ...billingCase });
  const [pickedCompany, setPickedCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);

  function setField(k: string, v: any) {
    setForm((prev: any) => ({ ...prev, [k]: v }));
  }

  // Al abrir un caso existente con company_id, traer datos completos de la empresa
  useEffect(() => {
    if (!billingCase.id || !form.company_id) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/empresas?q=${encodeURIComponent(form.company || "")}`);
      const data = await res.json();
      if (cancelled) return;
      const c = (data.companies || []).find((x: Company) => x.id === form.company_id);
      if (c) setPickedCompany(c);
    })();
    return () => { cancelled = true; };
  }, [billingCase.id]);

  // Cuando se elige (o cambia) la empresa: sobrescribe contacto con el de la empresa
  function applyCompany(c: Company | null) {
    setPickedCompany(c);
    if (c) {
      setField("company_id", c.id);
      setField("company", c.name);
      // Sobrescribe SIEMPRE con los datos de la empresa elegida (si tiene)
      setField("contact_name",  c.contact_name  || "");
      setField("contact_email", c.contact_email || "");
      setField("contact_phone", c.contact_phone || "");
    } else {
      setField("company_id", null);
      setField("company", "");
    }
  }

  async function save() {
    setSaving(true);
    setError("");

    const payload = { ...form };
    // Limpiar joins que no son columnas
    delete payload.courses;
    delete payload.sessions;
    delete payload.billing_case_registrations;
    delete payload.created_at;

    if (!payload.company) {
      setError("Empresa es requerida.");
      setSaving(false);
      return;
    }

    const method = isNew ? "POST" : "PATCH";
    const res = await fetch("/api/admin/facturacion", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al guardar");
      setSaving(false);
      return;
    }
    onSaved();
  }

  async function uploadFile(kind: string, file: File) {
    if (!form.id) {
      setError("Guarda el caso antes de adjuntar archivos.");
      return;
    }
    setUploadingKind(kind);
    const fd = new FormData();
    fd.append("case_id", form.id);
    fd.append("kind", kind);
    fd.append("file", file);
    const res = await fetch("/api/admin/facturacion/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploadingKind(null);
    if (!res.ok) {
      setError(data.error || "Error al subir archivo");
      return;
    }
    setField(`${kind === "quotation" ? "quotation" : kind === "oc" ? "oc" : kind === "hes" ? "hes" : "invoice"}_file_url`, data.path);
  }

  async function viewFile(path: string) {
    const res = await fetch(`/api/admin/facturacion/upload?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#003366]">
            {isNew ? "Nuevo caso" : `Caso · ${form.company}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
          )}

          {/* Empresa + contacto */}
          <Section title="Empresa y contacto">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Empresa *</label>
              <CompanyPicker value={pickedCompany} onChange={applyCompany} />
              {pickedCompany && (
                <div className="mt-2 text-[11px] text-gray-500 space-y-0.5">
                  {pickedCompany.rut && <p>RUT: <span className="font-mono">{pickedCompany.rut}</span></p>}
                  {pickedCompany.address && <p>📍 {pickedCompany.address}{pickedCompany.city ? `, ${pickedCompany.city}` : ""}</p>}
                  {(pickedCompany.phone || pickedCompany.email) && (
                    <p>{pickedCompany.phone ? `☎ ${pickedCompany.phone}` : ""}{pickedCompany.phone && pickedCompany.email ? " · " : ""}{pickedCompany.email || ""}</p>
                  )}
                  {!pickedCompany.contact_name && !pickedCompany.contact_email && !pickedCompany.contact_phone && (
                    <p className="text-amber-600">⚠ Esta empresa no tiene contacto registrado. <a href={`/admin/empresas`} target="_blank" className="underline">Completarlo</a></p>
                  )}
                </div>
              )}
            </div>
            <Field label="Contacto" value={form.contact_name || ""} onChange={(v) => setField("contact_name", v)} />
            <Field label="Email contacto" value={form.contact_email || ""} onChange={(v) => setField("contact_email", v)} type="email" />
            <Field label="Teléfono" value={form.contact_phone || ""} onChange={(v) => setField("contact_phone", v)} />
          </Section>

          {/* Cotización */}
          <Section title="Cotización">
            <Field label="N° Cotización" value={form.quotation_number || ""} onChange={(v) => setField("quotation_number", v)} />
            <Field label="Fecha" value={form.quotation_date || ""} onChange={(v) => setField("quotation_date", v)} type="date" />
            <Field label="Monto (exento)" value={form.quotation_amount ?? ""} onChange={(v) => setField("quotation_amount", v ? Number(v) : null)} type="number" />
            <Field label="Enviada (timestamp)" value={form.quotation_sent_at || ""} onChange={(v) => setField("quotation_sent_at", v || null)} type="datetime-local" />
            <FileField label="PDF" path={form.quotation_file_url} onUpload={(f) => uploadFile("quotation", f)} onView={viewFile} uploading={uploadingKind === "quotation"} />
          </Section>

          {/* O/C */}
          <Section title="Orden de Compra recibida">
            <Field label="N° O/C" value={form.oc_number || ""} onChange={(v) => setField("oc_number", v)} />
            <Field label="Recibida" value={form.oc_received_at || ""} onChange={(v) => setField("oc_received_at", v || null)} type="datetime-local" />
            <FileField label="PDF O/C" path={form.oc_file_url} onUpload={(f) => uploadFile("oc", f)} onView={viewFile} uploading={uploadingKind === "oc"} />
          </Section>

          {/* HES */}
          <Section title="HES recibida">
            <Field label="N° HES" value={form.hes_number || ""} onChange={(v) => setField("hes_number", v)} />
            <Field label="Recibida" value={form.hes_received_at || ""} onChange={(v) => setField("hes_received_at", v || null)} type="datetime-local" />
            <FileField label="PDF HES" path={form.hes_file_url} onUpload={(f) => uploadFile("hes", f)} onView={viewFile} uploading={uploadingKind === "hes"} />
          </Section>

          {/* Factura */}
          <Section title="Factura emitida (exenta)">
            <Field label="N° Factura" value={form.invoice_number || ""} onChange={(v) => setField("invoice_number", v)} />
            <Field label="Fecha factura" value={form.invoice_date || ""} onChange={(v) => setField("invoice_date", v)} type="date" />
            <Field label="Monto" value={form.invoice_amount ?? ""} onChange={(v) => setField("invoice_amount", v ? Number(v) : null)} type="number" />
            <Field label="Vencimiento" value={form.payment_due_date || ""} onChange={(v) => setField("payment_due_date", v)} type="date" hint="Default: factura + 30 días" />
            <FileField label="PDF Factura" path={form.invoice_file_url} onUpload={(f) => uploadFile("invoice", f)} onView={viewFile} uploading={uploadingKind === "invoice"} />
          </Section>

          {/* Pago */}
          <Section title="Pago recibido">
            <Field label="Fecha pago" value={form.payment_received_at || ""} onChange={(v) => setField("payment_received_at", v || null)} type="datetime-local" />
            <Field label="Monto pagado" value={form.payment_amount ?? ""} onChange={(v) => setField("payment_amount", v ? Number(v) : null)} type="number" />
            <Field label="Referencia" value={form.payment_reference || ""} onChange={(v) => setField("payment_reference", v)} hint="Nº transferencia / cheque" />
          </Section>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
            <textarea
              rows={3}
              value={form.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
            />
          </div>

          {/* Alumnos */}
          {!isNew && form.billing_case_registrations && form.billing_case_registrations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#003366] mb-2">Alumnos en este caso ({form.billing_case_registrations.length})</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Alumno</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                      <th className="px-3 py-2 text-right">Nota Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {form.billing_case_registrations.map((bcr: any) => {
                      const r = bcr.registrations;
                      if (!r) return null;
                      const completed = r.status === "completed" && (r.grade_status === "approved");
                      return (
                        <tr key={bcr.registration_id}>
                          <td className="px-3 py-2">{r.first_name} {r.last_name}</td>
                          <td className="px-3 py-2 text-gray-500">{r.email}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${completed ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {completed ? "Capacitado" : r.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">{r.final_score != null ? `${r.final_score}%` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white text-sm font-semibold rounded"
          >
            {saving ? "Guardando…" : isNew ? "Crear caso" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-[#003366] mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", hint,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  // Para datetime-local hay que recortar a "YYYY-MM-DDTHH:mm"
  const displayValue =
    type === "datetime-local" && typeof value === "string" && value.length > 16 ? value.slice(0, 16) : value;
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={displayValue as any}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-2 px-3 border border-gray-300 rounded text-sm"
      />
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function FileField({
  label, path, onUpload, onView, uploading,
}: {
  label: string;
  path: string | null;
  onUpload: (f: File) => void;
  onView: (path: string) => void;
  uploading: boolean;
}) {
  return (
    <div className="sm:col-span-2">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
          className="text-xs flex-1"
        />
        {uploading && <span className="text-xs text-gray-400">Subiendo…</span>}
        {path && !uploading && (
          <button
            type="button"
            onClick={() => onView(path)}
            className="text-xs text-[#0072CE] hover:underline"
          >
            Ver
          </button>
        )}
      </div>
    </div>
  );
}
