export function StatusMessage({ error, message }) {
  if (!error && !message) return null;

  return (
    <p className={`status-message ${error ? "status-error" : "status-success"}`} role="status">
      {error || message}
    </p>
  );
}
