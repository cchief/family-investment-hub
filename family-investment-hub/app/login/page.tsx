"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email, password, redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push(params.get("callbackUrl") || "/");
    router.refresh();
  }

  return (
    <>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@family.com" />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <p className="text-bad text-sm">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading} type="submit">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[radial-gradient(ellipse_at_top,_#EEF4F1_0%,_#F7F5EF_55%)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-11 w-11 rounded-xl bg-brand-500 flex items-center justify-center">
            <span className="text-white font-display font-semibold text-lg">F</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">PJKB Family Investment Hub</h1>
          <p className="text-ink/50 text-sm mt-1 italic">Save consistently. Grow together.</p>
        </div>

        <Suspense fallback={<div className="card p-6 text-sm text-ink/50">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
