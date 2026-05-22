"use client";

import { useEffect, useMemo, useState } from "react";

type BillingCase = {
  id: string;
  company: string;
  company_id: string | null;
  quotation_number: string | null;
  quotation_date: string | null;
  quotation_amount: number | null;
  oc_number: string | null;
  oc_received_at: string | null;
  hes_number: string | null;
  hes_received_at: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_amount: number | null;
  payment_due_date: string | null;
  payment_received_at: string | null;
  payment_amount: number | null;
  payment_reference: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  courses?: { title: string; code: string | null } | null;
  sessions?: { dates: string; location: string } | null;
  billing_case_registrations?: { registration_id: string; registrations: { first_name: string; last_name: string; email: string } | null }[];
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador", quoted: "Cotizado", oc_pending: "Esperando O/C",
  hes_pending: "Esperando HES", to_invoice: "Por facturar", invoiced: "Facturado",
  paid: "Pagado", overdue: "Vencido", cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  quoted: "bg-blue-100 text-blue-700",
  oc_pending: "bg-amber-100 text-amber-700",
  hes_pending: "bg-orange-100 text-orange-700",
  to_invoice: "bg-purple-100 text-purple-700",
  invoiced: "bg-indigo-100 text-indigo-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function fmtCLP(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SupervisorFinanzasPage() {
  const [cases, setCases] = useState<BillingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("as_company");
    const suffix = q ? `?as_company=${q}` : "";
    (async () => {
      const data = await fetch(`/api/supervisor/finanzas${suffix}`).then((r) => r.json());
      setCases(data.cases || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return cases;
    if (filter === "pending") return cases.filter((c) => !["paid", "cancelled"].includes(c.status));
    return cases.filter((c) => c.status === filter);
  }, [cases, filter]);

  const totals = useMemo(() => {
    const t = { quoted: 0, invoiced: 0, paid: 0, overdue: 0, pending: 0 };
    for (const c of cases) {
      if (c.status === "paid") t.paid += c.payment_amount || c.invoice_amount || 0;
      else if (c.status === "overdue") t.overdue += c.invoice_amount || 0;
      else if (c.invoice_date) t.invoiced += c.invoice_amount || 0;
      else if (c.quotation_amount) t.quoted += c.quotation_amount;
      if (!["paid", "cancelled"].includes(c.status)) t.pending += c.invoice_amount || c.quotation_amount || 0;
    }
    return t;
  }, [cases]);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-[#003366] mb-2">Finanzas</h1>
      <p className="text-sm text-gray-500 mb-6">Cotizaciones, órdenes de compra, HES, facturas y pagos de tu(s) empresa(s).</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card label="Cotizado pendiente" value={fmtCLP(totals.quoted)} color="text-blue-700" />
        <Card label="Facturado por cobrar" value={fmtCLP(totals.invoiced)} color="text-indigo-700" />
        <Card label="Pagado acumulado" value={fmtCLP(totals.paid)} color="text-green-700" />
        <Card label="Vencido" value={fmtCLP(totals.overdue)} color={totals.overdue > 0 ? "text-red-700 font-bold" : "text-gray-500"} />
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {[
          { k: "all", label: "Todos" },
          { k: "pending", label: "Abiertos" },
          { k: "quoted", label: "Cotizados" },
          { k: "invoiced", label: "Facturados" },
          { k: "paid", label: "Pagados" },
          { k: "overdue", label: "Vencidos" },
        ].map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className={`text-xs px-3 py-1.5 rounded ${filter === f.k ? "bg-[#0072CE] text-white" : "bg-white border border-gray-300 text-gray-600"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400 text-center py-8">Cargando…</p> : filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-8 bg-white border border-gray-200 rounded">Sin casos en esta vista.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const isOpen = expanded === c.id;
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-lg">
                <button onClick={() => setExpanded(isOpen ? null : c.id)}
                  className="w-full text-left p-4 hover:bg-gray-50 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]?.toUpperCase()}
                      </span>
                      <p className="font-semibold text-[#003366]">{c.courses?.title || "—"}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {c.courses?.code ? `${c.courses.code} · ` : ""}
                      {c.sessions?.dates ? `${c.sessions.dates} · ` : ""}
                      {c.billing_case_registrations?.length || 0} alumno{(c.billing_case_registrations?.length || 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Cot. {c.quotation_number || "—"}</p>
                    <p className="font-bold text-gray-800">{fmtCLP(c.invoice_amount || c.quotation_amount)}</p>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4 text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Info label="N° Cotización" value={c.quotation_number || "—"} />
                      <Info label="Fecha cot." value={fmtDate(c.quotation_date)} />
                      <Info label="Monto cotizado" value={fmtCLP(c.quotation_amount)} />
                      <Info label="Estado" value={STATUS_LABELS[c.status] || c.status} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-gray-200 pt-3">
                      <Info label="N° O/C" value={c.oc_number || "—"} />
                      <Info label="O/C recibida" value={fmtDate(c.oc_received_at)} />
                      <Info label="N° HES" value={c.hes_number || "—"} />
                      <Info label="HES recibida" value={fmtDate(c.hes_received_at)} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-gray-200 pt-3">
                      <Info label="N° Factura" value={c.invoice_number || "—"} />
                      <Info label="Fecha factura" value={fmtDate(c.invoice_date)} />
                      <Info label="Monto factura" value={fmtCLP(c.invoice_amount)} />
                      <Info label="Vencimiento" value={fmtDate(c.payment_due_date)} valueClass={c.status === "overdue" ? "text-red-700 font-bold" : ""} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-gray-200 pt-3">
                      <Info label="Pago recibido" value={fmtDate(c.payment_received_at)} />
                      <Info label="Monto pagado" value={fmtCLP(c.payment_amount)} valueClass="text-green-700 font-bold" />
                      <Info label="Referencia" value={c.payment_reference || "—"} />
                      <Info label="" value="" />
                    </div>

                    {c.billing_case_registrations && c.billing_case_registrations.length > 0 && (
                      <div className="border-t border-gray-200 pt-3">
                        <p className="font-medium text-gray-500 uppercase text-[10px] mb-1">Alumnos del caso</p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                          {c.billing_case_registrations.map((bcr) => (
                            <li key={bcr.registration_id} className="text-gray-700">
                              • {bcr.registrations?.last_name}, {bcr.registrations?.first_name}
                              <span className="text-gray-400 ml-1">({bcr.registrations?.email})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.notes && (
                      <p className="border-t border-gray-200 pt-3 text-gray-600 italic">📝 {c.notes}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function Info({ label, value, valueClass = "" }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase">{label}</p>
      <p className={`text-gray-800 ${valueClass}`}>{value}</p>
    </div>
  );
}
