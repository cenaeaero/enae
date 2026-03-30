import { supabase } from "./supabase";

// ============================================
// COURSES
// ============================================

export async function getCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("*, sessions(*)")
    .order("title");
  if (error) throw error;
  return data;
}

export async function getCourse(id: string) {
  const { data, error } = await supabase
    .from("courses")
    .select("*, sessions(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createCourse(course: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("courses")
    .insert(course)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCourse(
  id: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("courses")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}

// ============================================
// SESSIONS
// ============================================

export async function getSessionsForCourse(courseId: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function createSession(session: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("sessions")
    .insert(session)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSession(
  id: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSession(id: string) {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
}

// ============================================
// IMAGE UPLOAD
// ============================================

export async function uploadCourseImage(file: File, courseId: string) {
  const ext = file.name.split(".").pop();
  const path = `${courseId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("course-images")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("course-images").getPublicUrl(path);

  // Update course with image URL
  await updateCourse(courseId, { image_url: publicUrl });

  return publicUrl;
}

export async function deleteCourseImage(courseId: string, imageUrl: string) {
  // Extract path from URL
  const urlParts = imageUrl.split("/course-images/");
  if (urlParts[1]) {
    await supabase.storage.from("course-images").remove([urlParts[1]]);
  }
  await updateCourse(courseId, { image_url: null });
}

// ============================================
// REGISTRATIONS
// ============================================

export async function getRegistrations() {
  const { data, error } = await supabase
    .from("registrations")
    .select("*, courses(title)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateRegistrationStatus(
  id: string,
  status: string
) {
  const { error } = await supabase
    .from("registrations")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function createRegistration(reg: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("registrations")
    .insert(reg)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// PROFILES
// ============================================

export async function getProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
