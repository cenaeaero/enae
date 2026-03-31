const MOODLE_URL = process.env.MOODLE_URL || "https://cursos.enae.cl";
const MOODLE_TOKEN = process.env.MOODLE_TOKEN || "";

async function moodleCall(wsfunction: string, params: Record<string, any>) {
  const urlParams = new URLSearchParams({
    wstoken: MOODLE_TOKEN,
    wsfunction,
    moodlewsrestformat: "json",
    ...flattenParams(params),
  });

  const res = await fetch(`${MOODLE_URL}/webservice/rest/server.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: urlParams.toString(),
  });

  const data = await res.json();

  if (data?.exception) {
    throw new Error(`Moodle error: ${data.message} (${data.errorcode})`);
  }

  return data;
}

// Flatten nested params for Moodle's URL-encoded format
function flattenParams(
  obj: Record<string, any>,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenParams(value, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

/**
 * Create a Moodle user or get existing user ID
 */
export async function ensureMoodleUser(
  email: string,
  firstName: string,
  lastName: string
): Promise<number> {
  // Try to find existing user
  try {
    const users = await moodleCall("core_user_get_users", {
      "criteria[0][key]": "email",
      "criteria[0][value]": email,
    });

    if (users?.users?.length > 0) {
      return users.users[0].id;
    }
  } catch {
    // User not found, create one
  }

  // Create new user
  const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const password = generatePassword();

  const result = await moodleCall("core_user_create_users", {
    "users[0][username]": username,
    "users[0][password]": password,
    "users[0][firstname]": firstName,
    "users[0][lastname]": lastName,
    "users[0][email]": email,
    "users[0][auth]": "manual",
  });

  if (result?.[0]?.id) {
    return result[0].id;
  }

  throw new Error("Failed to create Moodle user");
}

/**
 * Enrol a user in a Moodle course
 */
export async function enrolUserInCourse(
  moodleUserId: number,
  moodleCourseId: number,
  roleId: number = 5 // 5 = student role in Moodle
): Promise<void> {
  await moodleCall("enrol_manual_enrol_users", {
    "enrolments[0][roleid]": roleId,
    "enrolments[0][userid]": moodleUserId,
    "enrolments[0][courseid]": moodleCourseId,
  });
}

/**
 * Full enrollment: create/find user + enrol in course
 */
export async function enrollStudentInMoodle(
  email: string,
  firstName: string,
  lastName: string,
  moodleCourseId: number
): Promise<{ success: boolean; moodleUserId?: number; error?: string }> {
  if (!MOODLE_TOKEN) {
    return { success: false, error: "Moodle token not configured" };
  }

  try {
    const userId = await ensureMoodleUser(email, firstName, lastName);
    await enrolUserInCourse(userId, moodleCourseId);
    return { success: true, moodleUserId: userId };
  } catch (error: any) {
    console.error("Moodle enrollment error:", error);
    return { success: false, error: error?.message || String(error) };
  }
}

/**
 * Extract Moodle course ID from URL like https://cursos.enae.cl/course/view.php?id=2
 */
export function extractMoodleCourseId(url: string): number | null {
  const match = url.match(/[?&]id=(\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Find a Moodle course by its shortname (should match ENAE course code)
 */
export async function getMoodleCourseByCode(
  courseCode: string
): Promise<{ id: number; shortname: string; fullname: string } | null> {
  if (!MOODLE_TOKEN || !courseCode) return null;

  try {
    const result = await moodleCall("core_course_get_courses_by_field", {
      field: "shortname",
      value: courseCode,
    });

    if (result?.courses?.length > 0) {
      const c = result.courses[0];
      return { id: c.id, shortname: c.shortname, fullname: c.fullname };
    }
  } catch (err) {
    console.error("Moodle course lookup by code failed:", err);
  }

  return null;
}

/**
 * Full enrollment with code-based course lookup.
 * Tries matching by course code (shortname) first, then falls back to moodle_url.
 * Returns Moodle username for the student.
 */
export async function enrollStudentInMoodleByCode(
  email: string,
  firstName: string,
  lastName: string,
  courseCode: string | null,
  moodleUrl: string | null
): Promise<{
  success: boolean;
  moodleUserId?: number;
  moodleCourseId?: number;
  moodleUsername?: string;
  error?: string;
}> {
  if (!MOODLE_TOKEN) {
    return { success: false, error: "Moodle token not configured" };
  }

  try {
    // 1. Resolve Moodle course ID
    let moodleCourseId: number | null = null;

    // Try by course code (shortname) first
    if (courseCode) {
      const course = await getMoodleCourseByCode(courseCode);
      if (course) {
        moodleCourseId = course.id;
        console.log(`Moodle: matched course by code "${courseCode}" -> ID ${course.id}`);
      }
    }

    // Fallback to moodle_url
    if (!moodleCourseId && moodleUrl) {
      moodleCourseId = extractMoodleCourseId(moodleUrl);
      if (moodleCourseId) {
        console.log(`Moodle: matched course by URL -> ID ${moodleCourseId}`);
      }
    }

    if (!moodleCourseId) {
      return { success: false, error: "No se pudo identificar el curso en Moodle" };
    }

    // 2. Create/find user and enroll
    const userId = await ensureMoodleUser(email, firstName, lastName);
    await enrolUserInCourse(userId, moodleCourseId);

    // Derive the Moodle username (same logic as ensureMoodleUser)
    const moodleUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");

    return {
      success: true,
      moodleUserId: userId,
      moodleCourseId,
      moodleUsername,
    };
  } catch (error: any) {
    console.error("Moodle enrollment error:", error);
    return { success: false, error: error?.message || String(error) };
  }
}

function generatePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}
