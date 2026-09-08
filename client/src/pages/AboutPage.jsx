const features = [
  ["Organized Notes", "All notes are arranged subject-wise and module-wise."],
  ["Easy Download", "Students can quickly download study materials."],
  ["Centralized Access", "All engineering notes are available in one place."]
];

export function AboutPage() {
  return (
    <div className="about-page">
      <section className="content-band about-intro">
        <p className="eyebrow">ABOUT STUDENT NOTES PORTAL</p>
        <h1>One calm place for focused study.</h1>
        <p>Campus Notes helps engineering students access subject-wise and module-wise notes with less searching and more confidence.</p>
        <p>Notes are uploaded and managed by the admin so students can find organized study materials whenever they need them.</p>
      </section>
      <section className="content-band feature-band">
        <p className="eyebrow">FEATURES OF CAMPUS NOTES</p>
        <div className="feature-grid">
          {features.map(([title, description]) => (
            <article className="feature-card" key={title}>
              <h2>✔ {title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="why-band">
        <h2>WHY CAMPUS NOTES?</h2>
        <p>✅ Helps students prepare quickly</p>
        <p>✅ Reduces time searching for notes</p>
        <p>✅ Organized learning resources</p>
        <p>✅ Easy to access anytime</p>
      </section>
    </div>
  );
}
