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

function generatePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}
