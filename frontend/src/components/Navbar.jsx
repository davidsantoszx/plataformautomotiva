import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DeleteAccountModal from "./DeleteAccountModal";

export default function Navbar() {
  const { user, logout, logoutAndRedirect } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName = user?.name || user?.username || user?.email || "Usuário";
  const initial = displayName.trim().charAt(0).toUpperCase();
  const profilePath = user?.username ? `/perfil/${user.username}` : null;
  const isPro = Boolean(user?.isPro);

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

  // fecha o menu ao trocar de página
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  function handleProfile() {
    setMenuOpen(false);
    navigate(profilePath);
  }

  function handlePlans() {
    setMenuOpen(false);
    navigate("/planos");
  }

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/", { replace: true });
  }

  function handleOpenDelete() {
    setMenuOpen(false);
    setDeleteOpen(true);
  }

  // conta já apagada no servidor: limpa a sessão e vai para a landing page
  // sem passar pela tela de login
  function handleAccountDeleted() {
    logoutAndRedirect("/");
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

        <div className="app-navbar-right">
          {!isPro && (
            <NavLink to="/planos" className="app-navbar-pro">
              <Sparkles size={14} />
              Seja Pro
            </NavLink>
          )}

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
              {isPro && <span className="pro-badge">PRO</span>}
            </button>

            {menuOpen && (
              <div className="user-menu-dropdown" role="menu">
                <div className="user-menu-info">
                  <strong>
                    {displayName}
                    {isPro && <span className="pro-badge">PRO</span>}
                  </strong>
                  {user?.username && <span>@{user.username}</span>}
                  {user?.email && <span>{user.email}</span>}
                </div>

                {profilePath && (
                  <button
                    type="button"
                    className="user-menu-item"
                    role="menuitem"
                    onClick={handleProfile}
                  >
                    Meu perfil
                  </button>
                )}

                <button
                  type="button"
                  className="user-menu-item"
                  role="menuitem"
                  onClick={handlePlans}
                >
                  Meu plano
                </button>

                <button
                  type="button"
                  className="user-menu-item"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  Sair
                </button>

                <button
                  type="button"
                  className="user-menu-item user-menu-item--danger"
                  role="menuitem"
                  onClick={handleOpenDelete}
                >
                  Excluir conta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteOpen && (
        <DeleteAccountModal
          onClose={() => setDeleteOpen(false)}
          onDeleted={handleAccountDeleted}
        />
      )}
    </nav>
  );
}
