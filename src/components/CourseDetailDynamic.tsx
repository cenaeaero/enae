"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type DbCourse = {
  title: string;
  description: string;
  goal: string | null;
  objectives: string[] | null;
  modules: string[] | null;
  target_audience: string[] | null;
  prerequisites: string[] | null;
  image_url: string | null;
  duration: string;
  modality: string;
  level: string;
  language: string;
};

export function useDynamicCourse(courseCode?: string, courseTitle?: string) {
  const [dbCourse, setDbCourse] = useState<DbCourse | null>(null);

  useEffect(() => {
    async function load() {
      let data = null;

      if (courseCode) {
        const res = await supabase
          .from("courses")
          .select("title, description, goal, objectives, modules, target_audience, prerequisites, image_url, duration, modality, level, language")
          .eq("code", courseCode)
          .single();
        data = res.data;
      }

      if (!data && courseTitle) {
        const res = await supabase
          .from("courses")
          .select("title, description, goal, objectives, modules, target_audience, prerequisites, image_url, duration, modality, level, language")
          .eq("title", courseTitle)
          .single();
        data = res.data;
      }

      if (data) setDbCourse(data as DbCourse);
    }
    load();
  }, [courseCode, courseTitle]);

  return dbCourse;
}

export function DynamicImage({ courseCode, courseTitle, fallback }: { courseCode?: string; courseTitle?: string; fallback: React.ReactNode }) {
  const db = useDynamicCourse(courseCode, courseTitle);

  if (db?.image_url) {
    return (
      <img
        src={db.image_url}
        alt={db.title}
        className="w-full h-full object-cover rounded-lg"
      />
    );
  }

  return <>{fallback}</>;
}

export function DynamicObjectives({ courseCode, courseTitle, staticObjectives }: { courseCode?: string; courseTitle?: string; staticObjectives?: string[] }) {
  const db = useDynamicCourse(courseCode, courseTitle);
  const objectives = db?.objectives || staticObjectives;

  if (!objectives || objectives.length === 0) return null;

  return (
    <ul className="space-y-2">
      {objectives.map((obj, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
          <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {obj}
        </li>
      ))}
    </ul>
  );
}

export function DynamicModules({ courseCode, courseTitle, staticModules }: { courseCode?: string; courseTitle?: string; staticModules?: string[] }) {
  const db = useDynamicCourse(courseCode, courseTitle);
  const modules = db?.modules || staticModules;

  if (!modules || modules.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {modules.map((mod, i) => (
        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2.5">
          <span className="w-6 h-6 bg-[#003366] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
            {i + 1}
          </span>
          <span className="text-sm text-gray-700">{mod}</span>
        </div>
      ))}
    </div>
  );
}

export function DynamicPrerequisites({ courseCode, courseTitle, staticPrereqs }: { courseCode?: string; courseTitle?: string; staticPrereqs?: string[] }) {
  const db = useDynamicCourse(courseCode, courseTitle);
  const prereqs = db?.prerequisites || staticPrereqs;

  if (!prereqs || prereqs.length === 0) return null;

  return (
    <ul className="space-y-2">
      {prereqs.map((p, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
          <span className="text-[#0072CE] font-bold">•</span>
          {p}
        </li>
      ))}
    </ul>
  );
}
