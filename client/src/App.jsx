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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    api.checkAdmin()
      .then((data) => setIsAdmin(data.isAdmin === true))
      .catch(() => setIsAdmin(false));
  }, []);

  return (
    <Layout isAdmin={isAdmin} setIsAdmin={setIsAdmin}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/admin" element={<LoginPage onLogin={() => setIsAdmin(true)} />} />
        <Route path="/subjects/:subjectId" element={<SubjectPage isAdmin={isAdmin} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
