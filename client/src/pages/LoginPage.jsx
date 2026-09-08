import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { StatusMessage } from "../components/StatusMessage";

export function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [state, setState] = useState({ loading: false, error: "", message: "" });

  const submit = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: "", message: "" });

    try {
      await api.login(form);
      onLogin();
      navigate("/notes");
    } catch (error) {
      setState({ loading: false, error: error.message, message: "" });
    }
  };

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">ADMIN ACCESS</p>
        <h1>Welcome back</h1>
        <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="Username" autoComplete="username" required />
        <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Password" autoComplete="current-password" required />
        <button className="primary-button" type="submit" disabled={state.loading}>{state.loading ? "Signing in..." : "Sign in"}</button>
        <StatusMessage error={state.error} message={state.message} />
      </form>
    </section>
  );
}
