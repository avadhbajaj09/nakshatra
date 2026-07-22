"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [setup, setSetup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      if (setup) {
        const response = await fetch("/api/auth/bootstrap", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, setupKey }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Administrator setup failed");
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.push("/"); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in");
    } finally { setBusy(false); }
  }

  return <main className="loginPage"><section className="loginBrand"><div className="loginLogo"><MessageCircle/><span>Nakshatra</span></div><div><span className="securePill"><ShieldCheck/>Official WhatsApp Cloud API</span><h1>Every guest conversation,<br/>in one calm place.</h1><p>Reply faster, manage enquiries and keep your hotel team aligned.</p></div><small>Secure messaging workspace · Nakshatra Hotel & Resort</small></section><section className="loginPanel"><form onSubmit={submit} className="loginCard"><div className="loginIcon"><KeyRound/></div><h2>{setup ? "Create administrator" : "Welcome back"}</h2><p>{setup ? "One-time setup for the first workspace owner." : "Sign in to your WhatsApp operations dashboard."}</p>{setup && <label>Full name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}<label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@nakshatrahotel.com"/></label><label>Password<div className="passwordField"><input required minLength={8} type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label="Show password">{showPassword?<EyeOff/>:<Eye/>}</button></div></label>{setup && <label>One-time setup key<input required value={setupKey} onChange={e=>setSetupKey(e.target.value)} placeholder="Provided during deployment"/></label>}{error && <div className="loginError">{error}</div>}<button className="loginSubmit" disabled={busy}>{busy?<Loader2 className="spin"/>:setup?"Create secure workspace":"Sign in"}</button><button type="button" className="setupToggle" onClick={()=>{setSetup(!setup);setError("")}}>{setup?"Already set up? Sign in":"First time here? Set up administrator"}</button></form></section></main>;
}
