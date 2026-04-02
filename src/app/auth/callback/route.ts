import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/tpems";

  if (code) {
    const redirectUrl = `${origin}${next}`;
    let response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }
  }

  // If code exchange fails, forward the code to the destination page
  // so the client-side can attempt the exchange (has PKCE code verifier)
  if (code && next !== "/tpems") {
    const fallbackUrl = new URL(next, origin);
    fallbackUrl.searchParams.set("code", code);
    return NextResponse.redirect(fallbackUrl);
  }

  return NextResponse.redirect(`${origin}/tpems/login`);
}
