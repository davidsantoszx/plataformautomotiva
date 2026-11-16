import { createContext, useContext, useEffect, useState } from "react";
import { getMe, loginUser, registerUser } from "../services/api";

const TOKEN_KEY = "plataforma_automotiva_token";
const USER_KEY = "plataforma_automotiva_user";

const AuthContext = createContext(null);

function getStoredUser() {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY) || "",
  );
  const [user, setUser] = useState(getStoredUser);

  // Atualiza o usuário guardado com o que está no banco. Sessões antigas ficam
  // sem campos novos (como o username) até a pessoa sair e entrar de novo.
  useEffect(() => {
    if (!token) return undefined;

    let cancelled = false;

    getMe(token)
      .then((data) => {
        if (cancelled || !data?.user) return;

        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
      })
      .catch(() => {
        // sem rede ou token vencido: segue com o que já estava guardado
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function login(email, password) {
    const data = await loginUser(email, password);

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    setToken("");
    setUser(null);
  }

  // Limpa a sessão e troca de página recarregando o app, SEM mexer no estado do
  // React. Assim as rotas protegidas não chegam a ver "sem usuário" e mandar
  // para o login: a tela atual fica visível até a nova página carregar.
  function logoutAndRedirect(path = "/") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    window.location.replace(path);
  }

  // Busca o usuário de novo no servidor. Usado depois de assinar, cancelar ou
  // renovar, para o plano (isPro, vencimento) mudar na tela na hora.
  async function refreshUser() {
    if (!token) return;

    const data = await getMe(token);

    if (data?.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        register: registerUser,
        logout,
        logoutAndRedirect,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
