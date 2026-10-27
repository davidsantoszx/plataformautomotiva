import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

const ToastContext = createContext(null);

const VISIBLE_MS = 3000;
const EXIT_MS = 300;

const baseStyle = {
  position: "fixed",
  right: 24,
  bottom: 24,
  zIndex: 10000,
  display: "flex",
  alignItems: "center",
  gap: 10,
  maxWidth: 360,
  padding: "12px 16px",
  borderRadius: 10,
  background: "#0f1216",
  color: "#f5f5f5",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderLeft: "3px solid #ff5a1f",
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
  fontSize: 14,
  fontWeight: 500,
  pointerEvents: "none",
  transition:
    "opacity 300ms ease, transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1)",
};

function ToastItem({ message, leaving }) {
  const [entered, setEntered] = useState(false);

  // entra na próxima frame, para a transição de subida acontecer
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const visible = entered && !leaving;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        ...baseStyle,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
      }}
    >
      <CheckCircle2 size={18} color="#ff5a1f" aria-hidden="true" style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timers = useRef([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const showToast = useCallback(
    (message) => {
      clearTimers();
      setToast({ id: Date.now(), message, leaving: false });

      timers.current.push(
        setTimeout(
          () => setToast((current) => current && { ...current, leaving: true }),
          VISIBLE_MS,
        ),
        setTimeout(() => setToast(null), VISIBLE_MS + EXIT_MS),
      );
    },
    [clearTimers],
  );

  useEffect(() => clearTimers, [clearTimers]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <ToastItem
          key={toast.id}
          message={toast.message}
          leaving={toast.leaving}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
