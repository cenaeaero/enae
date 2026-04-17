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

  async function loadItems() {
    const { data: course } = await supabase
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single();
    if (course) setCourseTitle(course.title);

    const { data: existing } = await supabase
      .from("grade_items")
      .select("*")
      .eq("course_id", courseId)
      .order("sort_order");

    setItems((existing || []).map((g: any) => ({
      id: g.id, name: g.name, weight: g.weight, sort_order: g.sort_order,
    })));
    setLoading(false);
  }

  useEffect(() => { loadItems(); }, [courseId]);

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
    // First, delete ALL existing grade items for this course
    await supabase.from("grade_items").delete().eq("course_id", courseId);

    const { data: modules } = await supabase
      .from("course_modules")
      .select("id, title, sort_order")
      .eq("course_id", courseId)
      .order("sort_order");

    if (!modules || modules.length === 0) {
      setItems([]);
      setMessage("No hay modulos definidos para este curso");
      return;
    }

    // Check which modules have exams
    const { data: activities } = await supabase
      .from("module_activities")
      .select("id, module_id, type")
      .in("module_id", modules.map((m: any) => m.id))
      .eq("type", "exam");

    const { data: exams } = activities && activities.length > 0
      ? await supabase
          .from("exams")
          .select("id, activity_id")
          .in("activity_id", activities.map((a: any) => a.id))
      : { data: [] };

    const modulesWithExams = modules.filter((mod: any) => {
      const modActivities = (activities || []).filter((a: any) => a.module_id === mod.id);
      return modActivities.some((a: any) => (exams || []).some((e: any) => e.activity_id === a.id));
    });

    const targetModules = modulesWithExams.length > 0 ? modulesWithExams : modules;
    const moduleWeight = Math.floor((100 / targetModules.length) * 100) / 100;

    // Insert directly into DB to avoid duplication issues
    const generated: GradeItem[] = [];
    for (let idx = 0; idx < targetModules.length; idx++) {
      const mod = targetModules[idx];
      const weight = idx === targetModules.length - 1
        ? Math.round((100 - moduleWeight * (targetModules.length - 1)) * 100) / 100
        : moduleWeight;
      const { data: inserted } = await supabase
        .from("grade_items")
        .insert({
          course_id: courseId,
          name: `Modulo ${modules.indexOf(mod) + 1}: ${mod.title}`,
          weight,
          sort_order: idx,
        })
        .select()
        .single();
      if (inserted) {
        generated.push({ id: inserted.id, name: inserted.name, weight: inserted.weight, sort_order: idx, is_auto: true });
      }
    }
    setItems(generated);

    const msg = modulesWithExams.length > 0
      ? `${modulesWithExams.length} evaluacion(es) generadas desde módulos con examen.`
      : "No se encontraron examenes. Se generaron items para todos los modulos.";
    setMessage(msg);
  }

  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0), 0);
  const totalRounded = Math.round(totalWeight * 100) / 100;

  async function saveAll() {
    setSaving(true);
    setMessage("");

    try {
      // Simple strategy: update existing items, insert new ones, delete removed ones
      const { data: dbItems } = await supabase.from("grade_items").select("id").eq("course_id", courseId);
      const currentDbIds = (dbItems || []).map((d: any) => d.id);
      const keepIds = items.filter((i) => i.id).map((i) => i.id!);

      // Delete items no longer in the list
      const toDelete = currentDbIds.filter((dbId: string) => !keepIds.includes(dbId));
      if (toDelete.length > 0) {
        await supabase.from("grade_items").delete().in("id", toDelete);
      }

      // Update or insert each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const payload = { course_id: courseId, name: item.name, weight: item.weight, sort_order: i };

        if (item.id && currentDbIds.includes(item.id)) {
          // Exists in DB — update
          await supabase.from("grade_items").update(payload).eq("id", item.id);
        } else if (item.id) {
          // Has id but not in current DB (was inserted by regenerate) — skip, already in DB
        } else {
          // New item without id — insert
          const { data: inserted } = await supabase.from("grade_items").insert(payload).select().single();
          if (inserted) items[i].id = inserted.id;
        }
      }

      // Auto-link grade_items to exams based on module matching
      await linkGradeItemsToExams();

      // Reload from DB to ensure state matches reality
      await loadItems();
      setMessage("Evaluaciones guardadas correctamente");
    } catch (err: any) {
      setMessage("Error al guardar: " + (err.message || "desconocido"));
    }
    setSaving(false);
  }

  // Link grade_items to exams via module title matching
  async function linkGradeItemsToExams() {
    // Get current grade_items
    const { data: currentItems } = await supabase
      .from("grade_items")
      .select("id, name")
      .eq("course_id", courseId);

    if (!currentItems || currentItems.length === 0) return;

    // Get all modules of this course
    const { data: modules } = await supabase
      .from("course_modules")
      .select("id, title, sort_order")
      .eq("course_id", courseId)
      .order("sort_order");

    if (!modules || modules.length === 0) return;

    // Get all exam activities in these modules
    const { data: activities } = await supabase
      .from("module_activities")
      .select("id, module_id, type")
      .in("module_id", modules.map((m: any) => m.id))
      .eq("type", "exam");

    if (!activities || activities.length === 0) return;

    // Get all exams linked to these activities
    const { data: exams } = await supabase
      .from("exams")
      .select("id, activity_id")
      .in("activity_id", activities.map((a: any) => a.id));

    if (!exams || exams.length === 0) return;

    // For each exam, find the corresponding grade_item by module matching
    for (const exam of exams) {
      const activity = activities.find((a: any) => a.id === exam.activity_id);
      if (!activity) continue;
      const moduleOfExam = modules.find((m: any) => m.id === activity.module_id);
      if (!moduleOfExam) continue;

      const moduleIdx = modules.findIndex((m: any) => m.id === moduleOfExam.id);
      const modNumStr = `modulo ${moduleIdx + 1}`;

      // Find grade_item matching by module title OR "Modulo N"
      const matchingItem = currentItems.find((gi: any) => {
        const nameLower = gi.name.toLowerCase();
        const titleLower = moduleOfExam.title.toLowerCase();
        return nameLower.includes(titleLower) || nameLower.includes(modNumStr);
      });

      if (matchingItem) {
        await supabase
          .from("exams")
          .update({ grade_item_id: matchingItem.id })
          .eq("id", exam.id);
      }
    }
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
          Usa <strong>+ Agregar evaluacion</strong> para incluir evaluaciones adicionales como simuladores o practicas si el curso lo requiere.
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
