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

export type DbPayment = {
  id: string;
  registration_id: string;
  amount: number;
  currency: string;
  tbk_token: string | null;
  tbk_response: Record<string, any> | null;
  status: "pending" | "approved" | "rejected" | "refunded";
  refund_amount: number | null;
  refund_response: Record<string, any> | null;
  refunded_at: string | null;
  created_at: string;
};

export type ModuleActivity = {
  type: "task" | "exam" | "discussion" | "zoom" | "reading";
  title: string;
  description?: string;
  url?: string;
};

export type DbCourseModule = {
  id: string;
  course_id: string;
  sort_order: number;
  title: string;
  description: string | null;
  video_entry_id: string | null;
  video_title: string | null;
  activities: ModuleActivity[];
  created_at: string;
};

export type DbModuleProgress = {
  id: string;
  registration_id: string;
  module_id: string;
  status: "not_started" | "in_progress" | "completed";
  started_at: string | null;
  completed_at: string | null;
};

export type DbCourseMessage = {
  id: string;
  registration_id: string;
  sender_profile_id: string;
  message: string;
  created_at: string;
};

export type DbGradeItem = {
  id: string;
  course_id: string;
  sort_order: number;
  name: string;
  weight: number;
  created_at: string;
};

export type DbStudentGrade = {
  id: string;
  registration_id: string;
  grade_item_id: string;
  score: number | null;
  comments: string | null;
  graded_by: string | null;
  graded_at: string | null;
};

export type DbDiploma = {
  id: string;
  registration_id: string;
  verification_code: string;
  student_name: string;
  course_title: string;
  course_code: string | null;
  final_score: number | null;
  status: "approved" | "failed";
  issued_date: string;
  theoretical_start: string | null;
  practical_end: string | null;
  created_at: string;
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
