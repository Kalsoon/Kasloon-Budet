import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parse, serialize } from "cookie";
import { supabaseCookieEncoding, supabaseCookieSerialization } from "./cookie-config";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";

export { isSupabaseConfigured } from "./env";

let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured || typeof document === "undefined") return null;
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabasePublishableKey, {
      cookieEncoding: supabaseCookieSerialization,
      cookies: {
        encode: supabaseCookieEncoding,
        getAll() {
          return Object.entries(parse(document.cookie)).map(([name, value]) => ({
            name,
            value: value ?? "",
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = serialize(name, value, options);
          });
        },
      },
      isSingleton: true,
    });
  }
  return browserClient;
}
