let accessToken = null;
let refreshPromise = null;

function setAccessToken(token) {
  accessToken = token;
}

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch("/refresh", { method: "POST", credentials: "include" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Session expired");
        setAccessToken(payload.data.accessToken);
        return payload;
      })
      .finally(() => { refreshPromise = null; });
  }

  return refreshPromise;
}

async function request(url, options = {}, canRefresh = true) {
  const headers = new Headers(options.headers || {});
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(url, { credentials: "include", ...options, headers });

  if (response.status === 401 && canRefresh && !["/login", "/register", "/refresh"].includes(url)) {
    try {
      await refreshAccessToken();
      return request(url, options, false);
    } catch (error) {
      accessToken = null;
    }
  }

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
  }).then((response) => {
    setAccessToken(response.data.accessToken);
    return response;
  }),
  register: (credentials) => request("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  }).then((response) => {
    setAccessToken(response.data.accessToken);
    return response;
  }),
  restoreSession: () => refreshAccessToken(),
  checkAdmin: () => request("/check-admin"),
  logout: () => request("/logout", { method: "POST" }).finally(() => { accessToken = null; }),
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
  deleteFile: (subject, fileId) => request(
    `/delete?subject=${encodeURIComponent(subject)}&filename=${encodeURIComponent(fileId)}`,
    { method: "DELETE" }
  )
};
