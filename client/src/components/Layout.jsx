import { Link, NavLink, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useTheme } from "../context/ThemeContext";

export function Layout({ children, isAdmin, setIsAdmin }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.logout();
      setIsAdmin(false);
      navigate("/");
    } catch (error) {
      window.alert(error.message);
    }
  };

  return (
    <div className="app-shell">
      <button className="theme-toggle" type="button" onClick={toggleTheme}>
        {theme === "dark" ? "☀ Light mode" : "☾ Dark mode"}
      </button>
      <nav className="site-nav">
        <div className="navbar">
          <Link className="navbar-logo" to="/">🎓 CAMPUS NOTES</Link>
          <div className="navbar-contents">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/notes">Notes</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <NavLink to="/about">About</NavLink>
            {!isAdmin && <NavLink className="admin-login-link" to="/admin">Admin login</NavLink>}
            {isAdmin && <button className="logout-btn" type="button" onClick={handleLogout}>Logout</button>}
          </div>
        </div>
      </nav>
      <main className="page-content">{children}</main>
      <footer>@ 2026 Student Notes Portal | Engineering study Resources</footer>
    </div>
  );
}
