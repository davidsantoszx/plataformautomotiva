import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message) => {
    clearTimeout(timerRef.current);
    setToast({ id: Date.now(), message });
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div key={toast.id} className="app-toast" role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
