"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Payment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  tbk_response: any;
  course_title?: string;
};

export default function TransaccionesPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        setLoading(false);
        return;
      }

      // Get registration IDs for this user
      const { data: regs } = await supabase
        .from("registrations")
        .select("id")
        .eq("email", user.email);

      if (regs && regs.length > 0) {
        const regIds = regs.map((r) => r.id);

        const { data: payData } = await supabase
          .from("payments")
          .select(
            "id, amount, currency, status, created_at, tbk_response, registration_id, registrations (courses (title))"
          )
          .in("registration_id", regIds)
          .order("created_at", { ascending: false });

        if (payData) {
          setPayments(
            payData.map((p: any) => ({
              id: p.id,
              amount: p.amount,
              currency: p.currency,
              status: p.status,
              created_at: p.created_at,
              tbk_response: p.tbk_response,
              course_title: p.registrations?.courses?.title,
            }))
          );
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">Cargando...</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-light text-gray-800 mb-6">
        Mis Transacciones
      </h1>

      {payments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No tienes transacciones registradas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                  Fecha
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                  Curso
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase hidden sm:table-cell">
                  Orden
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase hidden sm:table-cell">
                  Tarjeta
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase hidden md:table-cell">
                  Autorizacion
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                  Monto
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(p.created_at).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium">
                    {p.course_title || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">
                    {p.tbk_response?.buyOrder || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">
                    {p.tbk_response?.cardNumber
                      ? "****" + p.tbk_response.cardNumber
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">
                    {p.tbk_response?.authorizationCode || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-800 text-right font-medium">
                    ${p.amount.toLocaleString("es-CL")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : p.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {p.status === "approved"
                        ? "Aprobado"
                        : p.status === "rejected"
                          ? "Rechazado"
                          : "Pendiente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
