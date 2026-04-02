"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type GradeItem = {
  id?: string;
  name: string;
  weight: number;
  sort_order: number;
  is_new?: boolean;
  is_auto?: boolean; // auto-generated from module exams
};

export default function EvaluacionesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = use(params);
  const [courseTitle, setCourseTitle] = useState("");
  const [items, setItems] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data: course } = await supabase
        .from("courses")
        .select("title")
        .eq("id", courseId)
        .single();
      if (course) setCourseTitle(course.title);

      // Load existing grade items
      const { data: existing } = await supabase
        .from("grade_items")
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order");

      if (existing && existing.length > 0) {
        setItems(existing.map((g: any) => ({
          id: g.id, name: g.name, weight: g.weight, sort_order: g.sort_order,
        })));
      } else {
        // Auto-generate from course_modules + Evaluacion Practica + Simulador DGAC
        const { data: modules } = await supabase
          .from("course_modules")
          .select("id, title, sort_order")
          .eq("course_id", courseId)
          .order("sort_order");

        if (modules && modules.length > 0) {
          const totalItems = modules.length + 2; // modules + practica + simulador
          const moduleWeight = Math.floor((70 / modules.length) * 100) / 100; // 70% for modules
          const practicaWeight = 20; // 20% evaluacion practica
          const simuladorWeight = Math.round((100 - moduleWeight * modules.length - practicaWeight) * 100) / 100; // rest for simulator

          const generated: GradeItem[] = [
            ...modules.map((mod: any, idx: number) => ({
              name: `Modulo ${idx + 1}: ${mod.title}`,
              weight: idx === modules.length - 1
                ? Math.round((70 - moduleWeight * (modules.length - 1)) * 100) / 100
                : moduleWeight,
              sort_order: idx,
              is_new: true,
              is_auto: true,
            })),
            {
              name: "Simulador Examen DGAC",
              weight: 10,
              sort_order: modules.length,
              is_new: true,
            },
            {
              name: "Evaluacion Practica de Vuelo",
              weight: 20,
              sort_order: modules.length + 1,
              is_new: true,
            },
          ];
          setItems(generated);
        }
      }
      setLoading(false);
    }
    load();
  }, [courseId]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { name: "", weight: 0, sort_order: prev.length, is_new: true },
    ]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof GradeItem, value: any) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  function redistributeWeights() {
    if (items.length === 0) return;
    const each = Math.round((100 / items.length) * 100) / 100;
    setItems((prev) =>
      prev.map((item, i) => ({
        ...item,
        weight: i === prev.length - 1
          ? Math.round((100 - each * (prev.length - 1)) * 100) / 100
          : each,
      }))
    );
  }

  async function regenerateFromModules() {
    const { data: modules } = await supabase
      .from("course_modules")
      .select("id, title, sort_order")
      .eq("course_id", courseId)
      .order("sort_order");

    if (!modules || modules.length === 0) {
      setMessage("No hay modulos definidos para este curso");
      return;
    }

    const moduleWeight = Math.floor((70 / modules.length) * 100) / 100;

    const generated: GradeItem[] = [
      ...modules.map((mod: any, idx: number) => ({
        name: `Modulo ${idx + 1}: ${mod.title}`,
        weight: idx === modules.length - 1
          ? Math.round((70 - moduleWeight * (modules.length - 1)) * 100) / 100
          : moduleWeight,
        sort_order: idx,
        is_new: true,
        is_auto: true,
      })),
      {
        name: "Simulador Examen DGAC",
        weight: 10,
        sort_order: modules.length,
        is_new: true,
      },
      {
        name: "Evaluacion Practica de Vuelo",
        weight: 20,
        sort_order: modules.length + 1,
        is_new: true,
      },
    ];
    setItems(generated);
    setMessage("Evaluaciones regeneradas desde modulos. Recuerda guardar.");
  }

  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0), 0);
  const totalRounded = Math.round(totalWeight * 100) / 100;

  async function saveAll() {
    setSaving(true);
    setMessage("");
    let hasError = false;

    // Delete removed items
    const { data: current } = await supabase
      .from("grade_items").select("id").eq("course_id", courseId);

    const keepIds = items.filter((i) => i.id).map((i) => i.id!);
    const toDelete = (current || []).filter((c: any) => !keepIds.includes(c.id)).map((c: any) => c.id);
    if (toDelete.length > 0) {
      const { error } = await supabase.from("grade_items").delete().in("id", toDelete);
      if (error) { console.error("Delete error:", error.message); hasError = true; }
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const payload = { course_id: courseId, name: item.name, weight: item.weight, sort_order: i };
      if (item.id && !item.is_new) {
        const { error } = await supabase.from("grade_items").update(payload).eq("id", item.id);
        if (error) { console.error("Update error:", error.message); hasError = true; }
      } else {
        const { data: inserted, error } = await supabase.from("grade_items").insert(payload).select().single();
        if (error) {
          console.error("Insert error:", error.message);
          hasError = true;
        } else if (inserted) {
          items[i].id = inserted.id;
          items[i].is_new = false;
        }
      }
    }

    setMessage(hasError ? "Hubo errores al guardar." : "Evaluaciones guardadas correctamente");
    setSaving(false);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex gap-4">
            <Link href={`/admin/cursos/${courseId}`} className="text-sm text-[#0072CE] hover:underline">← Volver al curso</Link>
            <Link href="/admin/calificaciones" className="text-sm text-[#0072CE] hover:underline">← Ir a Calificaciones</Link>
          </div>
          <h1 className="text-2xl font-bold text-[#003366] mt-1">Evaluaciones del Curso</h1>
          <p className="text-sm text-gray-500">{courseTitle}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={regenerateFromModules} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition">
            Regenerar desde Modulos
          </button>
          <button onClick={saveAll} disabled={saving} className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-5 py-2 rounded-lg text-sm font-medium transition">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.includes("error") || message.includes("Error") ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
          {message}
        </div>
      )}

      {/* Info box */}
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-800">
          <strong>Estructura de evaluacion:</strong> Cada modulo del LMS genera una nota automatica basada en sus examenes (aprobacion 80%).
          El <strong>Simulador DGAC</strong> consta de 100 preguntas con nota de aprobacion de 75%.
          La <strong>Evaluacion Practica</strong> es ingresada manualmente por el instructor al final del curso.
        </p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          Define las evaluaciones y su ponderacion. El total debe sumar 100%.
        </p>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${totalRounded === 100 ? "text-green-600" : "text-red-500"}`}>
            Total: {totalRounded}%
          </span>
          <button onClick={redistributeWeights} className="text-xs text-[#0072CE] hover:underline">
            Distribuir equitativo
          </button>
        </div>
      </div>

      {totalRounded !== 100 && items.length > 0 && (
        <div className="mb-3 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-lg text-xs">
          La ponderacion total debe sumar 100%. Actualmente suma {totalRounded}%.
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className={`rounded-lg border px-5 py-3 flex items-center gap-4 ${
            item.name.includes("Practica") ? "bg-orange-50 border-orange-200" :
            item.name.includes("DGAC") || item.name.includes("Simulador") ? "bg-purple-50 border-purple-200" :
            "bg-white border-gray-200"
          }`}>
            <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateItem(idx, "name", e.target.value)}
              className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm bg-white"
              placeholder="Nombre de la evaluacion"
            />
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">Pond.:</label>
              <input
                type="number"
                value={item.weight}
                onChange={(e) => updateItem(idx, "weight", parseFloat(e.target.value) || 0)}
                className="w-20 border border-gray-200 rounded px-2 py-1.5 text-sm text-center bg-white"
                min="0" max="100" step="0.01"
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
            {item.name.includes("Practica") && (
              <span className="text-xs text-orange-600 font-medium">Manual</span>
            )}
            {(item.name.includes("Modulo") || item.name.includes("DGAC")) && (
              <span className="text-xs text-blue-600 font-medium">Auto</span>
            )}
            <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
        ))}
      </div>

      <button onClick={addItem} className="mt-3 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#0072CE] hover:text-[#0072CE] transition">
        + Agregar evaluacion
      </button>
    </div>
  );
}
