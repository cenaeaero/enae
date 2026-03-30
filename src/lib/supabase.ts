import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Database types
export type DbCourse = {
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
  created_at: string;
  updated_at: string;
};

export type DbSession = {
  id: string;
  course_id: string;
  dates: string;
  location: string;
  modality: string;
  fee: string | null;
  seats: number | null;
  is_active: boolean;
  created_at: string;
};

export type DbRegistration = {
  id: string;
  course_id: string;
  session_id: string | null;
  title: string | null;
  first_name: string;
  last_name: string;
  email: string;
  age_group: string | null;
  job_title: string | null;
  organization: string | null;
  organization_type: string | null;
  supervisor_name: string | null;
  supervisor_email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  how_found: string | null;
  comments: string | null;
  status: "pending" | "confirmed" | "completed" | "rejected" | "cancelled";
  created_at: string;
};

export type DbProfile = {
  id: string;
  user_id: string | null;
  title: string | null;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string | null;
  organization: string | null;
  organization_type: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  role: "student" | "instructor" | "admin";
  created_at: string;
  updated_at: string;
};

export type DbSurveyResponse = {
  id: string;
  registration_id: string;
  profile_id: string;
  questionnaire_type: "module" | "course" | "instructor";
  module_name: string | null;
  answers: Record<string, string>;
  created_at: string;
};
