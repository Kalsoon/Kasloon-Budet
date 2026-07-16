import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseCookieEncoding, supabaseCookieSerialization } from "./cookie-config";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  if (!isSupabaseConfigured) return supabaseResponse;

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookieEncoding: supabaseCookieSerialization,
    cookies: {
      encode: supabaseCookieEncoding,
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          supabaseResponse.headers.set(name, value),
        );
      },
    },
  });

  await supabase.auth.getClaims();
  return supabaseResponse;
}
