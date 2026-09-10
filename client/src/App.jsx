import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api";
import { Layout } from "./components/Layout";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NotesPage } from "./pages/NotesPage";
import { SubjectPage } from "./pages/SubjectPage";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.restoreSession()
      .then((response) => setUser(response.data.user))
      .catch(() => setUser(null));
  }, []);

  return (
    <Layout user={user} setUser={setUser}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage onLogin={setUser} initialMode="student" />} />
        <Route path="/admin" element={<LoginPage onLogin={setUser} initialMode="admin" />} />
        <Route path="/subjects/:subjectId" element={<SubjectPage isAdmin={user?.role === "admin"} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
