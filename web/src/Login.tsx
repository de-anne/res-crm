import { useEffect, useState } from "react";
import { api } from "./api";

interface Props {
  onAuthed: () => void;
}

export function Login({ onAuthed }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // If the backend has no users yet, start in "register" mode (first-run).
  useEffect(() => {
    api
      .health()
      .then((h) => {
        if (!h.hasUsers) setMode("register");
      })
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        await api.register(email, password);
      } else {
        await api.login(email, password);
      }
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>🏠 SG Real Estate CRM</h1>
        <p className="tagline">
          {mode === "register" ? "Create your account to get started." : "Welcome back. Sign in to continue."}
        </p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              minLength={6}
              required
            />
            {mode === "register" && <div className="hint">At least 6 characters.</div>}
          </div>
          <button type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
          </button>
        </form>
        <div className="auth-toggle">
          {mode === "register" ? (
            <>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(null); }}>Sign in</button>
            </>
          ) : (
            <>
              Need an account?{" "}
              <button onClick={() => { setMode("register"); setError(null); }}>Register</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
