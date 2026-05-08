"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Doc = {
  id: string;
  title: string;
  description: string | null;
  file_name: string | null;
  file_size: number | null;
  uploaded_at: string;
  is_active: boolean;
  sort_order: number;
};

function formatBytes(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function AdminBibliotecaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = use(params);
  const [courseTitle, setCourseTitle] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data: course } = await supabase.from("courses").select("title").eq("id", courseId).single();
    if (course) setCourseTitle(course.title);

    const res = await fetch(`/api/admin/biblioteca?course_id=${courseId}`);
    const json = await res.json();
    if (res.ok) setDocs(json.documents || []);
    else setMessage("Error: " + (json.error || res.statusText));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMessage("Selecciona un archivo PDF");
      return;
    }
    if (!title.trim()) {
      setMessage("Ingresa un título");
      return;
    }
    if (file.type && !file.type.includes("pdf")) {
      setMessage("Error: Solo se aceptan archivos PDF");
      return;
    }
    setUploading(true);
    setMessage("");

    try {
      // Paso 1: pedir URL firmada para subir directo al bucket
      const signRes = await fetch("/api/admin/biblioteca?action=sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, file_name: file.name }),
      });
      const signJson = await signRes.json();
      if (!signRes.ok) throw new Error(signJson.error || signRes.statusText);

      // Paso 2: subir el PDF directo al bucket (sin pasar por Vercel)
      const putRes = await fetch(signJson.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/pdf" },
        body: file,
      });
      if (!putRes.ok) throw new Error("Falló la subida al bucket: " + putRes.status);

      // Paso 3: registrar el documento en la BD
      const commitRes = await fetch("/api/admin/biblioteca?action=commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          path: signJson.path,
          title: title.trim(),
          description: description.trim() || null,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || "application/pdf",
        }),
      });
      const commitJson = await commitRes.json();
      if (!commitRes.ok) throw new Error(commitJson.error || commitRes.statusText);

      setMessage("Documento subido");
      setTitle("");
      setDescription("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err: any) {
      setMessage("Error: " + (err?.message || "subida fallida"));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: Doc) {
    if (!confirm(`¿Eliminar "${doc.title}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/admin/biblioteca?id=${doc.id}`, { method: "DELETE" });
    if (res.ok) load();
    else {
      const json = await res.json();
      setMessage("Error: " + (json.error || res.statusText));
    }
  }

  async function toggleActive(doc: Doc) {
    await fetch("/api/admin/biblioteca", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: doc.id, is_active: !doc.is_active }),
    });
    load();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/admin/cursos/${courseId}`} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Biblioteca del curso</h1>
          <p className="text-sm text-gray-500">{courseTitle}</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.startsWith("Error") ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
          {message}
        </div>
      )}

      {/* Upload form */}
      <form onSubmit={handleUpload} className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Subir documento PDF</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Manual del operador"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">Archivo PDF *</label>
            <input
              type="file"
              ref={fileRef}
              accept="application/pdf,.pdf"
              className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
              required
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs text-gray-500 uppercase mb-1">Descripción (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
            placeholder="Breve descripción del documento"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="px-5 py-2 bg-[#0072CE] hover:bg-[#005BA1] text-white text-sm font-medium rounded-lg disabled:opacity-50"
        >
          {uploading ? "Subiendo..." : "Subir documento"}
        </button>
      </form>

      {/* Document list */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Documentos del curso ({docs.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Cargando...</div>
        ) : docs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Aún no hay documentos cargados.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-5 py-2 font-medium">Título</th>
                <th className="text-left px-5 py-2 font-medium">Archivo</th>
                <th className="text-left px-5 py-2 font-medium">Tamaño</th>
                <th className="text-left px-5 py-2 font-medium">Subido</th>
                <th className="text-left px-5 py-2 font-medium">Estado</th>
                <th className="text-right px-5 py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t border-gray-100">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{d.title}</p>
                    {d.description && <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{d.file_name || "—"}</td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{formatBytes(d.file_size)}</td>
                  <td className="px-5 py-3 text-gray-600 text-xs">
                    {new Date(d.uploaded_at).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(d)}
                      className={`text-xs px-2 py-1 rounded ${d.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}
                    >
                      {d.is_active ? "Activo" : "Oculto"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(d)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
