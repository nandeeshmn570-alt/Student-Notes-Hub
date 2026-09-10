import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { StatusMessage } from "../components/StatusMessage";

export function LoginPage({ onLogin, initialMode = "student" }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const [state, setState] = useState({ loading: false, error: "", message: "" });

  const submit = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: "", message: "" });

    try {
      const response = mode === "student" && registering
        ? await api.register(form)
        : await api.login(form);
      onLogin(response.data.user);
      navigate("/notes");
    } catch (error) {
      setState({ loading: false, error: error.message, message: "" });
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-layout">
        <div className="auth-intro">
          <span className="auth-mark">CN</span>
          <p className="eyebrow">CAMPUS NOTES HUB</p>
          <h1>Learn together.<br />Go further.</h1>
          <p>Sign in to access subject-wise notes and keep your study material in one place.</p>
        </div>
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-mode-switch" aria-label="Choose account type">
            <button type="button" className={mode === "student" ? "active" : ""} onClick={() => { setMode("student"); setRegistering(false); setState({ loading: false, error: "", message: "" }); }}>Student</button>
            <button type="button" className={mode === "admin" ? "active" : ""} onClick={() => { setMode("admin"); setRegistering(false); setState({ loading: false, error: "", message: "" }); }}>Admin</button>
          </div>
          <div className="auth-heading">
            <p className="eyebrow">{mode === "admin" ? "ADMIN ACCESS" : registering ? "NEW STUDENT ACCOUNT" : "STUDENT ACCESS"}</p>
            <h2>{mode === "admin" ? "Welcome, administrator" : registering ? "Create your account" : "Welcome back"}</h2>
            <p>{mode === "admin" ? "Manage notes and keep the portal up to date." : registering ? "Use a username and password to get started." : "Sign in to continue to your notes."}</p>
          </div>
          <label htmlFor="username">Username</label>
          <input id="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder={mode === "admin" ? "Admin username" : "Your username"} autoComplete="username" required />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={mode === "admin" ? "Admin password" : "At least 8 characters"} autoComplete={registering ? "new-password" : "current-password"} minLength={mode === "student" && registering ? 8 : undefined} required />
          <button className="primary-button auth-submit" type="submit" disabled={state.loading}>{state.loading ? "Please wait..." : mode === "admin" || !registering ? "Sign in" : "Create account"}</button>
          {mode === "student" && <button className="auth-switch" type="button" onClick={() => setRegistering((current) => !current)}>
            {registering ? "Already have an account? Sign in" : "New student? Create an account"}
          </button>}
          <StatusMessage error={state.error} message={state.message} />
        </form>
      </div>
    </section>
  );
}
