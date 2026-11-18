import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AuthPanel from "../components/AuthPanel";
import ForgotPasswordPanel from "../components/ForgotPasswordPanel";
import LoginRoad from "../components/LoginRoad";
import { useAuth } from "../context/AuthContext";
import { useGlobalLoading } from "../context/LoadingContext";
export default function LoginPage() {
  const navigate = useNavigate();
  const { token, login, register } = useAuth();

  // "login" | "register" | "forgot" (recuperação de senha)
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useGlobalLoading(loading);

  if (token) return <Navigate to="/projetos" replace />;

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email || !password) {
      setError("Email e senha são obrigatórios.");
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate("/projetos", { replace: true });
    } catch (err) {
      setError(err.message || "Erro ao realizar login.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email || !password) {
      setError("Email e senha são obrigatórios.");
      return;
    }

    try {
      setLoading(true);

      await register({
        email,
        username: username || undefined,
        name: name || undefined,
        password,
      });

      setMode("login");
      setPassword("");
      setMessage("Cadastro realizado. Agora faça login.");
    } catch (err) {
      setError(err.message || "Erro ao realizar cadastro.");
    } finally {
      setLoading(false);
    }
  }

  function openForgot() {
    setError("");
    setMessage("");
    setMode("forgot");
  }

  // senha trocada: volta para o login com o e-mail já preenchido
  function handlePasswordReset(resetEmail) {
    setEmail(resetEmail);
    setPassword("");
    setError("");
    setMessage("Senha alterada. Agora faça login com a nova senha.");
    setMode("login");
  }

  return (
    <div className="login-stage">
      <LoginRoad />

      {mode === "forgot" ? (
        <ForgotPasswordPanel
          initialEmail={email}
          onBack={() => setMode("login")}
          onDone={handlePasswordReset}
        />
      ) : (
        <AuthPanel
          mode={mode}
          email={email}
          password={password}
          name={name}
          username={username}
          loading={loading}
          error={error}
          message={message}
          onModeChange={setMode}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onNameChange={setName}
          onUsernameChange={setUsername}
          onForgot={openForgot}
          onSubmit={mode === "login" ? handleLogin : handleRegister}
          onBack={() => navigate("/")}
        />
      )}
    </div>
  );
}