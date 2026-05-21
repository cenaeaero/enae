import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false };
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("role").eq("email", user.email).maybeSingle();
  return { ok: profile?.role === "admin" };
}

function csvEscape(v: any): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { data } = await supabaseAdmin
    .from("billing_cases")
    .select(
      "id, company, status, quotation_number, quotation_date, quotation_amount, oc_number, oc_received_at, hes_number, hes_received_at, invoice_number, invoice_date, invoice_amount, payment_due_date, payment_received_at, payment_amount, notes, courses(title, code), sessions(dates)"
    )
    .order("created_at", { ascending: false });

  const headers = [
    "Empresa","Estado","Curso","Codigo","Sesion",
    "N Cotizacion","Fecha Cotizacion","Monto Cotizado",
    "N OC","OC recibida",
    "N HES","HES recibida",
    "N Factura","Fecha Factura","Monto Facturado",
    "Vencimiento","Fecha Pago","Monto Pagado","Notas",
  ];

  const rows = (data || []).map((c: any) => [
    c.company,
    c.status,
    c.courses?.title || "",
    c.courses?.code || "",
    c.sessions?.dates || "",
    c.quotation_number || "",
    c.quotation_date || "",
    c.quotation_amount ?? "",
    c.oc_number || "",
    c.oc_received_at ? c.oc_received_at.split("T")[0] : "",
    c.hes_number || "",
    c.hes_received_at ? c.hes_received_at.split("T")[0] : "",
    c.invoice_number || "",
    c.invoice_date || "",
    c.invoice_amount ?? "",
    c.payment_due_date || "",
    c.payment_received_at ? c.payment_received_at.split("T")[0] : "",
    c.payment_amount ?? "",
    (c.notes || "").replace(/\n/g, " "),
  ]);

  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="facturacion-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
