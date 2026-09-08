import { Link } from "react-router-dom";

export function SubjectCard({ subject }) {
  return (
    <Link className="subject-card" to={`/subjects/${subject.id}`}>
      {subject.title}
    </Link>
  );
}
