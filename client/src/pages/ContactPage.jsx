import { useState } from "react";
import { api } from "../api";
import { StatusMessage } from "../components/StatusMessage";

const initialForm = { name: "", email: "", subject: "", message: "" };

export function ContactPage() {
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState({ loading: false, error: "", message: "" });

  const submit = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: "", message: "" });

    try {
      const response = await api.submitContact(form);
      setForm(initialForm);
      setState({ loading: false, error: "", message: response.message });
    } catch (error) {
      setState({ loading: false, error: error.message, message: "" });
    }
  };

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  return (
    <div className="contact-page">
      <section className="content-band contact-intro">
        <p className="eyebrow">GET IN TOUCH</p>
        <h1>Share what would make studying easier.</h1>
        <p>Have a question, need help accessing notes, or want to request study materials? Send a message to the campus notes team.</p>
      </section>
      <section className="contact-form-band">
        <form className="contact-form-react" onSubmit={submit}>
          <p className="eyebrow">YOUR MESSAGE</p>
          <h2>You can share your problem</h2>
          <input value={form.name} onChange={update("name")} placeholder="Your name" required />
          <input type="email" value={form.email} onChange={update("email")} placeholder="Your email" required />
          <input value={form.subject} onChange={update("subject")} placeholder="Subject" required />
          <textarea value={form.message} onChange={update("message")} placeholder="Your message" required />
          <button className="primary-button" type="submit" disabled={state.loading}>{state.loading ? "Sending..." : "Send message"}</button>
          <StatusMessage error={state.error} message={state.message} />
        </form>
      </section>
      <section className="contact-info-react">
        <h2>Contact us</h2>
        <a href="mailto:nandeeshmn570@gmail.com">📧 nandeeshmn570@gmail.com</a>
        <a href="tel:9036481898">📞 +91 9036481898</a>
        <a href="https://www.google.com/maps/search/?api=1&query=Bengaluru%2C%20Karnataka" target="_blank" rel="noreferrer">📍 Bengaluru, Karnataka</a>
      </section>
    </div>
  );
}
