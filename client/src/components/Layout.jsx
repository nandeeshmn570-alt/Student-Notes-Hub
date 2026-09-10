import { Link, NavLink, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useTheme } from "../context/ThemeContext";

export function Layout({ children, user, setUser }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const openLogin = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      setUser(null);
      navigate("/");
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
            {!user && (
              <>
                <button className="student-login-link nav-login-button" type="button" onClick={() => openLogin("/login")}>Student login</button>
                <button className="admin-login-link nav-login-button" type="button" onClick={() => openLogin("/admin")}>Admin login</button>
              </>
            )}
            {user && <><span className="signed-in-badge">{user.role === "admin" ? "ADMIN" : "STUDENT"}</span><button className="logout-btn" type="button" onClick={handleLogout}>Logout</button></>}
          </div>
        </div>
      </nav>
      <main className="page-content">{children}</main>
      <footer>@ 2026 Student Notes Portal | Engineering study Resources</footer>
    </div>
  );
}
