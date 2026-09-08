import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <section className="hero-page">
      <div className="hero-copy">
        <span className="header-note">STUDENT NOTES PORTAL</span>
        <p className="content-for-header">Access module-wise engineering notes uploaded by admin</p>
        <Link className="primary-button" to="/notes">View Notes</Link>
      </div>
    </section>
  );
}
