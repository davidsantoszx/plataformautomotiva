import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { deleteAccount } from "../services/api";

// Confirmação de exclusão de conta: pede a senha e só então chama a API.
// onClose fecha o modal; onDeleted roda depois que a conta foi apagada.
export default function DeleteAccountModal({ onClose, onDeleted }) {
  const { token } = useAuth();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape" && !deleting) onClose();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [deleting, onClose]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (deleting) return;

    // o erro só aparece ao tentar confirmar
    if (!password) {
      setError("Informe sua senha para confirmar.");
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await deleteAccount(token, password);
      onDeleted();
    } catch (err) {
      setError(err.message || "Erro ao excluir a conta.");
      setDeleting(false);
    }
  }

  // portal: o modal escapa da navbar e cobre a tela inteira
  return createPortal(
    <div
      className="delete-account-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onClose();
      }}
    >
      <form
        className="delete-account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 id="delete-account-title">Excluir conta</h2>

        <p className="delete-account-text">
          Essa ação é <strong>permanente</strong>. Seus projetos, peças,
          curtidas e capas serão apagados e não poderão ser recuperados.
        </p>

        <label className="delete-account-label" htmlFor="delete-account-password">
          Digite sua senha para confirmar
        </label>

        <input
          id="delete-account-password"
          ref={inputRef}
          type="password"
          className="delete-account-input"
          value={password}
          autoComplete="current-password"
          disabled={deleting}
          onChange={(event) => {
            setPassword(event.target.value);
            if (error) setError("");
          }}
        />

        {error && <p className="delete-account-error">{error}</p>}

        <div className="delete-account-actions">
          <button
            type="button"
            className="delete-account-cancel"
            onClick={onClose}
            disabled={deleting}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="delete-account-confirm"
            disabled={deleting}
          >
            {deleting ? "Excluindo..." : "Excluir minha conta"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
