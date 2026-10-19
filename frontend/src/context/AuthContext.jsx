import { createContext, useContext, useState } from "react";
import { loginUser, registerUser } from "../services/api";

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

  return (
    <AuthContext.Provider
      value={{ token, user, login, register: registerUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}