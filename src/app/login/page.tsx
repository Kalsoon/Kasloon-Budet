import { redirect } from "next/navigation";
import { AuthGate } from "../../components/AuthGate";
import { isSupabaseConfigured } from "../../lib/supabase/env";
import { createClient } from "../../lib/supabase/server";

export default async function LoginPage() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub) redirect("/dashboard");
  }

  return <AuthGate initialMode="signin" />;
}
