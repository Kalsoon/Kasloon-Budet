import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AuthenticatedApp } from "../../App";
import { isSupabaseConfigured } from "../../lib/supabase/env";
import { createClient } from "../../lib/supabase/server";

export default async function ProtectedLayout() {
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/login");

  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) redirect("/login");

  return <AuthenticatedApp user={userData.user as User} />;
}
