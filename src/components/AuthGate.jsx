import { useEffect, useState } from "react";
import { CheckCircle, CircleNotch, LockKey, SignOut } from "@phosphor-icons/react";
import { isSupabaseConfigured, supabase } from "../lib/supabase.js";
import { KalsoonLogo } from "./KalsoonLogo.jsx";
import { trackConversion } from "../lib/conversionAnalytics.js";

export function AuthGate({ children, initialMode = "signin" }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) { setChecking(false); return undefined; }
    let active = true;
    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      if (data.session) {
        const { error: claimsError } = await supabase.auth.getClaims();
        if (claimsError) await supabase.auth.signOut();
        else setSession(data.session);
      }
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) { setSession(nextSession); setChecking(false); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault(); setError(""); setMessage(""); setSubmitting(true);
    if (mode === "signup") trackConversion("signup_started", { source: "auth_form", route: "/signup" });
    const response = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      : await supabase.auth.signUp({ email: form.email.trim(), password: form.password, options: { data: { first_name: form.firstName.trim(), last_name: form.lastName.trim() } } });
    if (response.error) setError(response.error.message);
    else if (mode === "signup") {
      trackConversion("signup_completed", { source: "auth_form", route: "/signup" });
      const requiresEmailConfirmation = !response.data.session;
      if (!requiresEmailConfirmation) await supabase.auth.signOut();
      setMode("signin");
      setMessage(requiresEmailConfirmation ? "Check your email to confirm your Kalsoon account, then sign in to begin." : "Your account is ready. Sign in to begin your Kalsoon setup.");
    }
    setSubmitting(false);
  };

  if (!isSupabaseConfigured) return <AuthShell><div className="auth-status-icon"><LockKey size={28}/></div><span className="eyebrow">Supabase setup required</span><h1>Connect your Kalsoon project</h1><p>Copy <code>.env.example</code> to <code>.env.local</code> and add the project URL and publishable key. Secret and service-role keys are never used in this client.</p></AuthShell>;
  if (checking) return <AuthShell><CircleNotch className="spin" size={30}/><h1>Securing your workspace…</h1><p>Checking your Kalsoon session.</p></AuthShell>;
  if (session) return children(session);

  return <AuthShell>
    <div className="auth-tabs"><button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button><button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button></div>
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
  return <main className="auth-page"><a className="auth-brand" href="/" aria-label="Back to Kalsoon landing page"><KalsoonLogo tagline /></a><section className="auth-card">{children}</section><footer><span>Kalsoon</span><p>Your data stays yours. Built with calm in Switzerland.</p></footer></main>;
}

export function SignOutButton() {
  return <button onClick={() => supabase.auth.signOut()}><SignOut size={17}/><span>Sign out</span></button>;
}
