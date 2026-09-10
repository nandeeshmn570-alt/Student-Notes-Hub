import { useState } from "react";
import { SubjectCard } from "../components/SubjectCard";
import { semesters } from "../data";

export function NotesPage() {
  const [selectedSemesterId, setSelectedSemesterId] = useState("semester2");
  const selectedSemester = semesters.find((semester) => semester.id === selectedSemesterId);

  return (
    <section className="content-band notes-page-content">
      <p className="eyebrow">SUBJECT LIBRARY</p>
      <h1>Subject-wise modules</h1>
      <div className="semester-tabs" aria-label="Choose semester">
        {semesters.map((semester) => (
          <button
            key={semester.id}
            className={selectedSemesterId === semester.id ? "active" : ""}
            type="button"
            onClick={() => setSelectedSemesterId(semester.id)}
          >
            {semester.title}
          </button>
        ))}
      </div>
      <div className="semester-heading">
        <span>{selectedSemester.title}</span>
        <small>{selectedSemester.subjects.length} subject{selectedSemester.subjects.length === 1 ? "" : "s"}</small>
      </div>
      {selectedSemester.subjects.length > 0 ? (
        <div className="subject-grid">
          {selectedSemester.subjects.map((subject) => <SubjectCard key={subject.id} subject={subject} />)}
        </div>
      ) : (
        <div className="semester-empty">
          <strong>No subjects added yet</strong>
          <span>This semester will appear here when its subjects are available.</span>
        </div>
      )}
    </section>
  );
}
