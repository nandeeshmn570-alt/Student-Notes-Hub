async function request(url, options = {}) {
  const response = await fetch(url, { credentials: "include", ...options });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

export const api = {
  login: (credentials) => request("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  }),
  checkAdmin: () => request("/check-admin"),
  logout: () => request("/logout", { method: "POST" }),
  submitContact: (form) => request("/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form)
  }),
  listFiles: (subject) => request(`/files?subject=${encodeURIComponent(subject)}`),
  uploadFiles: (subject, formData) => request(`/upload?subject=${encodeURIComponent(subject)}`, {
    method: "POST",
    body: formData
  }),
  deleteFile: (subject, filename) => request(
    `/delete?subject=${encodeURIComponent(subject)}&filename=${encodeURIComponent(filename)}`,
    { method: "DELETE" }
  )
};
