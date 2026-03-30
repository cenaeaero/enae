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

      const { data } = await supabase
        .from("grade_items")
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order");

      if (data) {
        setItems(
          data.map((g: any) => ({
            id: g.id,
            name: g.name,
            weight: g.weight,
            sort_order: g.sort_order,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, [courseId]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { name: "", weight: 1, sort_order: prev.length, is_new: true },
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

  async function saveAll() {
    setSaving(true);
    setMessage("");

    // Delete removed items
    const { data: current } = await supabase
      .from("grade_items")
      .select("id")
      .eq("course_id", courseId);

    const keepIds = items.filter((i) => i.id).map((i) => i.id!);
    const toDelete = (current || [])
      .filter((c: any) => !keepIds.includes(c.id))
      .map((c: any) => c.id);

    if (toDelete.length > 0) {
      await supabase.from("grade_items").delete().in("id", toDelete);
    }

    // Upsert items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const data = {
        course_id: courseId,
        name: item.name,
        weight: item.weight,
        sort_order: i,
      };

      if (item.id && !item.is_new) {
        await supabase.from("grade_items").update(data).eq("id", item.id);
      } else {
        const { data: inserted } = await supabase
          .from("grade_items")
          .insert(data)
          .select()
          .single();
        if (inserted) {
          items[i].id = inserted.id;
          items[i].is_new = false;
        }
      }
    }

    setMessage("Evaluaciones guardadas correctamente");
    setSaving(false);
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/admin/cursos/${courseId}`}
            className="text-sm text-[#0072CE] hover:underline"
          >
            ← Volver al curso
          </Link>
          <h1 className="text-2xl font-bold text-[#003366] mt-1">
            Evaluaciones del Curso
          </h1>
          <p className="text-sm text-gray-500">{courseTitle}</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      {message && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">
        Define las evaluaciones (exámenes, prácticos, etc.) y su peso para el
        promedio ponderado. La nota final se calcula automáticamente.
      </p>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg border border-gray-200 px-5 py-3 flex items-center gap-4"
          >
            <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateItem(idx, "name", e.target.value)}
              className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm"
              placeholder="Nombre de la evaluación"
            />
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">Peso:</label>
              <input
                type="number"
                value={item.weight}
                onChange={(e) =>
                  updateItem(idx, "weight", parseFloat(e.target.value) || 1)
                }
                className="w-16 border border-gray-200 rounded px-2 py-1.5 text-sm text-center"
                min="0.1"
                step="0.1"
              />
            </div>
            <button
              onClick={() => removeItem(idx)}
              className="text-red-400 hover:text-red-600 text-sm"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        className="mt-3 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#0072CE] hover:text-[#0072CE] transition"
      >
        + Agregar evaluación
      </button>
    </div>
  );
}
