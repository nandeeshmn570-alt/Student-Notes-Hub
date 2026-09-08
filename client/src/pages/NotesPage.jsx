import { SubjectCard } from "../components/SubjectCard";
import { subjects } from "../data";

export function NotesPage() {
  return (
    <section className="content-band notes-page-content">
      <p className="eyebrow">SUBJECT LIBRARY</p>
      <h1>Subject-wise modules</h1>
      <div className="subject-grid">
        {subjects.map((subject) => <SubjectCard key={subject.id} subject={subject} />)}
      </div>
    </section>
  );
}
