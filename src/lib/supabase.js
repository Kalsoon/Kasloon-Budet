import { createClient, isSupabaseConfigured } from "./supabase/client";

export { isSupabaseConfigured };
export const supabase = createClient();

export async function signOutCurrentSession() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
}
