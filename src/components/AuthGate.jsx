"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, CircleNotch, LockKey } from "@phosphor-icons/react";
import { isSupabaseConfigured, signOutCurrentSession, supabase } from "../lib/supabase.js";
import { KalsoonLogo } from "./KalsoonLogo.jsx";
import { trackConversion } from "../lib/conversionAnalytics.js";

export function AuthGate({ initialMode = "signin" }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const clearLegacyAuthMetadata = async (session) => {
    const metadata = session?.user?.user_metadata || {};
    const hasLegacySettings = metadata.kalsoon_settings != null;
    const hasEmbeddedAvatar = typeof metadata.avatar_url === "string" && metadata.avatar_url.startsWith("data:");
    if (!hasLegacySettings && !hasEmbeddedAvatar) return;

    const data = {};
    if (hasLegacySettings) data.kalsoon_settings = null;
    if (hasEmbeddedAvatar) data.avatar_url = null;
    const { error: cleanupError } = await supabase.auth.updateUser({ data });
    if (cleanupError) throw cleanupError;
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw refreshError;
  };
  const submit = async (event) => {
    event.preventDefault(); setError(""); setMessage(""); setSubmitting(true);
    if (mode === "signup") trackConversion("signup_started", { source: "auth_form", route: "/register" });
    const response = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      : await supabase.auth.signUp({ email: form.email.trim(), password: form.password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`, data: { first_name: form.firstName.trim(), last_name: form.lastName.trim() } } });
    if (response.error) setError(response.error.message);
    else if (mode === "signup") {
      trackConversion("signup_completed", { source: "auth_form", route: "/register" });
      const requiresEmailConfirmation = !response.data.session;
      if (!requiresEmailConfirmation) await signOutCurrentSession();
      setMode("signin");
      router.replace("/login");
      setMessage(requiresEmailConfirmation ? "Check your email to confirm your Kalsoon account, then sign in to begin." : "Your account is ready. Sign in to begin your Kalsoon setup.");
    } else {
      try {
        await clearLegacyAuthMetadata(response.data.session);
        router.replace("/dashboard");
        router.refresh();
      } catch (cleanupError) {
        await signOutCurrentSession();
        setError(cleanupError.message || "Kalsoon could not finish upgrading your secure session. Please try again.");
      }
    }
    setSubmitting(false);
  };

  if (!isSupabaseConfigured) return <AuthShell><div className="auth-status-icon"><LockKey size={28}/></div><span className="eyebrow">Supabase setup required</span><h1>Connect your Kalsoon project</h1><p>Copy <code>.env.example</code> to <code>.env.local</code> and add the project URL and publishable key. Secret and service-role keys are never used in this client.</p></AuthShell>;

  return <AuthShell>
    <div className="auth-tabs"><button className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); router.replace("/login"); }}>Sign in</button><button className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); router.replace("/register"); }}>Create account</button></div>
    <span className="eyebrow">Your money, privately connected</span><h1>{mode === "signin" ? "Welcome back" : "Start your Kalsoon account"}</h1><p>{mode === "signin" ? "Sign in to open your protected financial workspace." : "Create a secure account to keep every franc connected."}</p>
    <form className="auth-form" onSubmit={submit}>
      {mode === "signup" ? <div className="modal-grid"><label><span>First name</span><input required value={form.firstName} onChange={(event) => update("firstName", event.target.value)}/></label><label><span>Last name</span><input required value={form.lastName} onChange={(event) => update("lastName", event.target.value)}/></label></div> : null}
      <label><span>Email</span><input required type="email" autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="you@example.ch"/></label>
      <label><span>Password</span><input required type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={form.password} onChange={(event) => update("password", event.target.value)} placeholder="At least 8 characters"/></label>
      {error ? <div className="auth-message error" role="alert">{error}</div> : null}{message ? <div className="auth-message success"><CheckCircle size={17}/>{message}</div> : null}
      <button className="primary-button auth-submit" disabled={submitting}>{submitting ? <><CircleNotch className="spin" size={17}/>Please wait…</> : mode === "signin" ? "Sign in securely" : "Create account"}</button>
    </form>
  </AuthShell>;
}

function AuthShell({ children }) {
  return <main className="auth-page"><Link className="auth-brand" href="/" aria-label="Back to Kalsoon landing page"><KalsoonLogo tagline /></Link><section className="auth-card">{children}</section><footer><span>Kalsoon</span><p>Your data stays yours. Built with calm in Switzerland.</p></footer></main>;
}
