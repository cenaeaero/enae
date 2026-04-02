"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Stats = {
  totalCourses: number;
  totalStudents: number;
  pendingRegistrations: number;
  confirmedRegistrations: number;
  completedRegistrations: number;
  pendingPayments: number;
  approvedPayments: number;
  pendingGrades: number;
  pendingDiplomas: number;
  totalDiplomas: number;
};

type ActiveStudent = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  course: string;
  status: string;
  created_at: string;
};

type RecentItem = {
  id: string;
  name: string;
  email: string;
  course: string;
  date: string;
  type: "registration" | "payment";
  status: string;
};

type PendingAction = {
  id: string;
  name: string;
  course: string;
  type: "grade" | "diploma";
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalCourses: 0, totalStudents: 0, pendingRegistrations: 0,
    confirmedRegistrations: 0, completedRegistrations: 0,
    pendingPayments: 0, approvedPayments: 0, pendingGrades: 0,
    pendingDiplomas: 0, totalDiplomas: 0,
  });
  const [recentRegistrations, setRecentRegistrations] = useState<RecentItem[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentItem[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [activeStudents, setActiveStudents] = useState<ActiveStudent[]>([]);
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Counts
      const [courses, students, regs, payments, diplomas] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("registrations").select("id, status, grade_status"),
        supabase.from("payments").select("id, status"),
        supabase.from("diplomas").select("id", { count: "exact", head: true }),
      ]);

      const regData = regs.data || [];
      const payData = payments.data || [];

      // Pending grades: confirmed registrations without grade_status or grade_status = 'pending'
      const needGrading = regData.filter(
        (r: any) => r.status === "completed" && (!r.grade_status || r.grade_status === "pending")
      );

      // Pending diplomas: grade_status = 'approved' but no diploma
      const approvedRegs = regData.filter((r: any) => r.grade_status === "approved");
      let pendingDiplomaCount = 0;
      if (approvedRegs.length > 0) {
        const { data: existingDiplomas } = await supabase
          .from("diplomas")
          .select("registration_id");
        const diplomaRegIds = (existingDiplomas || []).map((d: any) => d.registration_id);
        pendingDiplomaCount = approvedRegs.filter(
          (r: any) => !diplomaRegIds.includes(r.id)
        ).length;
      }

      setStats({
        totalCourses: courses.count || 0,
        totalStudents: students.count || 0,
        pendingRegistrations: regData.filter((r: any) => r.status === "pending").length,
        confirmedRegistrations: regData.filter((r: any) => r.status === "confirmed").length,
        completedRegistrations: regData.filter((r: any) => r.status === "completed").length,
        pendingPayments: payData.filter((p: any) => p.status === "pending").length,
        approvedPayments: payData.filter((p: any) => p.status === "approved").length,
        pendingGrades: needGrading.length,
        pendingDiplomas: pendingDiplomaCount,
        totalDiplomas: diplomas.count || 0,
      });

      // Recent registrations (last 5)
      const { data: recentRegs } = await supabase
        .from("registrations")
        .select("id, first_name, last_name, email, status, created_at, courses(title)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentRegs) {
        setRecentRegistrations(
          recentRegs.map((r: any) => ({
            id: r.id,
            name: `${r.first_name} ${r.last_name}`,
            email: r.email,
            course: r.courses?.title || "",
            date: r.created_at,
            type: "registration",
            status: r.status,
          }))
        );
      }

      // Recent payments (last 5)
      const { data: recentPay } = await supabase
        .from("payments")
        .select("id, amount, status, created_at, registrations(first_name, last_name, email, courses(title))")
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentPay) {
        setRecentPayments(
          recentPay.map((p: any) => ({
            id: p.id,
            name: `${p.registrations?.first_name || ""} ${p.registrations?.last_name || ""}`.trim(),
            email: p.registrations?.email || "",
            course: p.registrations?.courses?.title || "",
            date: p.created_at,
            type: "payment",
            status: `${p.status} - $${(p.amount || 0).toLocaleString("es-CL")}`,
          }))
        );
      }

      // Pending actions: need grading + need diploma
      const actions: PendingAction[] = [];

      // Students needing grades (completed but no grades)
      const { data: needGradeRegs } = await supabase
        .from("registrations")
        .select("id, first_name, last_name, courses(title)")
        .eq("status", "completed")
        .or("grade_status.is.null,grade_status.eq.pending")
        .limit(10);

      if (needGradeRegs) {
        needGradeRegs.forEach((r: any) => {
          actions.push({
            id: r.id,
            name: `${r.first_name} ${r.last_name}`,
            course: r.courses?.title || "",
            type: "grade",
          });
        });
      }

      // Students needing diplomas
      if (approvedRegs.length > 0) {
        const { data: existingDiplomas } = await supabase
          .from("diplomas")
          .select("registration_id");
        const diplomaRegIds = (existingDiplomas || []).map((d: any) => d.registration_id);
        const needDiploma = approvedRegs.filter(
          (r: any) => !diplomaRegIds.includes(r.id)
        );

        if (needDiploma.length > 0) {
          const { data: diplomaRegs } = await supabase
            .from("registrations")
            .select("id, first_name, last_name, courses(title)")
            .in("id", needDiploma.map((r: any) => r.id));

          if (diplomaRegs) {
            diplomaRegs.forEach((r: any) => {
              actions.push({
                id: r.id,
                name: `${r.first_name} ${r.last_name}`,
                course: r.courses?.title || "",
                type: "diploma",
              });
            });
          }
        }
      }

      setPendingActions(actions);

      // Active students (pending + confirmed only)
      const { data: activeRegs } = await supabase
        .from("registrations")
        .select("id, first_name, last_name, email, status, created_at, courses(title)")
        .in("status", ["pending", "confirmed"])
        .order("created_at", { ascending: false });

      if (activeRegs) {
        setActiveStudents(
          activeRegs.map((r: any) => ({
            id: r.id,
            first_name: r.first_name,
            last_name: r.last_name,
            email: r.email,
            course: r.courses?.title || "",
            status: r.status,
            created_at: r.created_at,
          }))
        );
      }

      setLoading(false);
    }
    load();
  }, []);

  async function updateStudentStatus(id: string, newStatus: string) {
    setUpdatingStudentId(id);
    try {
      const res = await fetch("/api/admin/registros", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        // Remove from active list if no longer pending/confirmed
        if (newStatus !== "pending" && newStatus !== "confirmed") {
          setActiveStudents((prev) => prev.filter((s) => s.id !== id));
        } else {
          setActiveStudents((prev) =>
            prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
          );
        }
      }
    } catch {}
    setUpdatingStudentId(null);
  }

  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Cargando dashboard...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#003366] mb-6">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Cursos Activos" value={stats.totalCourses} color="text-[#003366]" href="/admin/cursos" />
        <StatCard label="Alumnos" value={stats.totalStudents} color="text-[#0072CE]" href="/admin/perfiles" />
        <StatCard label="Registros Pendientes" value={stats.pendingRegistrations} color="text-yellow-600" href="/admin/registros" />
        <StatCard label="Pagos Recibidos" value={stats.approvedPayments} color="text-green-600" href="/admin/pagos" />
        <StatCard label="Diplomas Emitidos" value={stats.totalDiplomas} color="text-purple-600" href="/admin/diplomas" />
      </div>

      {/* Pending actions */}
      {pendingActions.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-5 mb-6">
          <h2 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            Acciones Pendientes ({pendingActions.length})
          </h2>
          <div className="space-y-2">
            {pendingActions.map((action, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-orange-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">{action.name}</p>
                  <p className="text-xs text-gray-500">{action.course}</p>
                </div>
                <Link
                  href={action.type === "grade" ? "/admin/calificaciones" : "/admin/diplomas"}
                  className={`text-xs font-medium px-3 py-1.5 rounded transition ${
                    action.type === "grade"
                      ? "bg-[#F57C00] hover:bg-[#E65100] text-white"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  {action.type === "grade" ? "Calificar" : "Emitir Diploma"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active students table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Alumnos Activos
            <span className="ml-2 text-xs font-normal text-gray-400">
              Pendientes y Confirmados ({activeStudents.length})
            </span>
          </h2>
          <Link href="/admin/registros" className="text-xs text-[#0072CE] hover:underline">Ver todos</Link>
        </div>
        {activeStudents.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No hay alumnos activos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-2.5 font-medium">Nombre</th>
                  <th className="px-4 py-2.5 font-medium hidden md:table-cell">Email</th>
                  <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Curso</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {activeStudents.map((s) => (
                  <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm">
                      <Link href={`/admin/registros/${s.id}`} className="text-[#0072CE] hover:underline font-medium">
                        {s.first_name} {s.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 hidden md:table-cell">{s.email}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 hidden sm:table-cell max-w-[200px] truncate">{s.course}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[s.status] || "bg-gray-100 text-gray-600"}`}>
                        {s.status === "pending" ? "Pendiente" : "Confirmado"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={s.status}
                        onChange={(e) => updateStudentStatus(s.id, e.target.value)}
                        disabled={updatingStudentId === s.id}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0072CE] disabled:opacity-50"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="completed">Completado</option>
                        <option value="rejected">Rechazado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent registrations */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Nuevos Registros</h2>
            <Link href="/admin/registros" className="text-xs text-[#0072CE] hover:underline">Ver todos</Link>
          </div>
          {recentRegistrations.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Sin registros recientes</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentRegistrations.map((item) => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.course}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[item.status] || "bg-gray-100 text-gray-600"}`}>
                      {item.status === "pending" ? "Pendiente" : item.status === "confirmed" ? "Confirmado" : item.status}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatTimeAgo(item.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Últimos Pagos</h2>
            <Link href="/admin/pagos" className="text-xs text-[#0072CE] hover:underline">Ver todos</Link>
          </div>
          {recentPayments.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Sin pagos recientes</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentPayments.map((item) => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.course}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">{item.status.split(" - ")[1]}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatTimeAgo(item.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <h2 className="text-lg font-semibold text-[#003366] mb-4">Acciones Rápidas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickAction href="/admin/inscripcion" icon="✏️" label="Inscribir Alumnos" desc="Inscripción manual o masiva" />
        <QuickAction href="/admin/calificaciones" icon="🎓" label="Calificaciones" desc="Ingresar notas de alumnos" />
        <QuickAction href="/admin/diplomas" icon="📜" label="Diplomas" desc="Emitir certificados" />
        <QuickAction href="/admin/cursos/nuevo" icon="➕" label="Nuevo Curso" desc="Crear curso en catálogo" />
      </div>
    </div>
  );
}

function StatCard({ label, value, color, href }: { label: string; value: number; color: string; href: string }) {
  return (
    <Link href={href} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-[#0072CE] hover:shadow-sm transition">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${color} mt-1`}>{value}</div>
    </Link>
  );
}

function QuickAction({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-[#0072CE] hover:shadow-md transition group">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-semibold text-sm text-[#003366] group-hover:text-[#0072CE]">{label}</h3>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </Link>
  );
}
