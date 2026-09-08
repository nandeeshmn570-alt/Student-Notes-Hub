import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const storageKey = "student-notes-theme";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => (
    localStorage.getItem(storageKey) === "dark" ? "dark" : "light"
  ));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(storageKey, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((current) => current === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
