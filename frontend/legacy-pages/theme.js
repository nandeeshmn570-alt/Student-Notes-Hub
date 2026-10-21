(() => {
  const storageKey = "student-notes-theme";
  const savedTheme = localStorage.getItem(storageKey);
  const initialTheme = savedTheme === "dark" ? "dark" : "light";

  document.documentElement.dataset.theme = initialTheme;

  const toggle = document.createElement("button");
  toggle.className = "theme-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Switch to dark mode");

  const updateToggle = () => {
    const isDark = document.documentElement.dataset.theme === "dark";
    toggle.textContent = isDark ? "☀ Light mode" : "☾ Dark mode";
    toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  };

  toggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(storageKey, nextTheme);
    updateToggle();
  });

  document.body.append(toggle);
  updateToggle();
})();
