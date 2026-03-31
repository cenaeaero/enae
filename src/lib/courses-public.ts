import { supabase } from "./supabase";
import type { Course } from "@/data/courses";

type DbCourseRow = {
  id: string;
  code: string | null;
  title: string;
  description: string;
  area: string;
  area_slug: string;
  subarea: string | null;
  level: string;
  duration: string;
  modality: "Presencial" | "Híbrido" | "Online";
  language: string;
  goal: string | null;
  objectives: string[] | null;
  modules: string[] | null;
  target_audience: string[] | null;
  prerequisites: string[] | null;
  is_active: boolean;
  image_url: string | null;
  sessions: {
    dates: string;
    location: string;
    modality: string;
    fee: string | null;
    seats: number | null;
    is_active: boolean;
  }[];
};

function mapDbCourseToPublic(row: DbCourseRow): Course {
  const activeSessions = (row.sessions || []).filter((s) => s.is_active);
  const locations = [
    ...new Set(activeSessions.map((s) => s.location).filter(Boolean)),
  ];
  const dates = activeSessions.map((s) => s.dates).filter(Boolean);

  return {
    id: row.id,
    code: row.code ?? undefined,
    title: row.title,
    description: row.description,
    area: row.area,
    areaSlug: row.area_slug,
    subarea: row.subarea ?? undefined,
    level: row.level,
    duration: row.duration,
    modality: row.modality,
    language: row.language ?? undefined,
    goal: row.goal ?? undefined,
    objectives: row.objectives ?? undefined,
    modules: row.modules ?? undefined,
    targetAudience: row.target_audience ?? undefined,
    prerequisites: row.prerequisites ?? undefined,
    image: row.image_url ?? undefined,
    locations: locations.length > 0 ? locations : ["Por confirmar"],
    dates,
    sessions: activeSessions.map((s) => ({
      dates: s.dates,
      location: s.location,
      modality: s.modality,
      fee: s.fee ?? undefined,
    })),
  };
}

/** Fetch all active courses from Supabase (for client components) */
export async function fetchActiveCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*, sessions(*)")
    .eq("is_active", true)
    .order("title");

  if (error) {
    console.error("Error fetching courses:", error);
    return [];
  }

  return (data as DbCourseRow[]).map(mapDbCourseToPublic);
}

/** Fetch a single active course by ID from Supabase */
export async function fetchPublicCourse(
  id: string
): Promise<Course | null> {
  const { data, error } = await supabase
    .from("courses")
    .select("*, sessions(*)")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;

  return mapDbCourseToPublic(data as DbCourseRow);
}
