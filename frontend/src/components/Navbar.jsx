import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName = user?.name || user?.username || user?.email || "Usuário";
  const initial = displayName.trim().charAt(0).toUpperCase();

  // fecha o menu ao clicar fora ou apertar Esc
  useEffect(() => {
    function handleClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleKey(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/", { replace: true });
  }

  return (
    <nav className="app-navbar">
      <div className="app-navbar-inner">
        <div className="app-navbar-left">
          <span className="app-navbar-brand">PLATAFORMA AUTOMOTIVA</span>

          <NavLink to="/projetos" className="app-navbar-link">
            Meus projetos
          </NavLink>

          <NavLink to="/feed" className="app-navbar-link">
            Feed
          </NavLink>
        </div>

        <div className="user-menu" ref={menuRef}>
          <button
            type="button"
            className="user-menu-trigger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="user-avatar">{initial}</span>
            <span className="user-menu-name">{displayName}</span>
          </button>

          {menuOpen && (
            <div className="user-menu-dropdown" role="menu">
              <div className="user-menu-info">
                <strong>{displayName}</strong>
                {user?.email && <span>{user.email}</span>}
              </div>

              <button
                type="button"
                className="user-menu-item"
                role="menuitem"
                onClick={handleLogout}
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}