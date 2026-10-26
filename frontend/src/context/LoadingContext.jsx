import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import LoadingScreen from "../components/LoadingScreen";

const MIN_COVER = 900; // tempo mínimo da montagem antes de inverter
const INVERT_HOLD = 400; // símbolo parado no fundo laranja
const OUT_TOTAL = 800; // saída do overlay + entrada do conteúdo

// fases: "idle" -> "cover" (montando) -> "invert" -> "out" -> "idle"
const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [phase, setPhase] = useState("idle");
  const phaseRef = useRef("idle");
  const pending = useRef(0);
  const shownAt = useRef(0);
  const timers = useRef([]);

  const go = useCallback((next) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const later = useCallback((fn, ms) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const settle = useCallback(() => {
    clearTimers();

    later(() => {
      if (pending.current > 0) return;

      const wait = Math.max(0, MIN_COVER - (Date.now() - shownAt.current));

      later(() => {
        go("invert");

        later(() => {
          go("out");
          later(() => go("idle"), OUT_TOTAL);
        }, INVERT_HOLD);
      }, wait);
    }, 0);
  }, [clearTimers, later, go]);

  const show = useCallback(() => {
    pending.current += 1;
    clearTimers();

    if (phaseRef.current !== "cover") {
      shownAt.current = Date.now();
      go("cover");
    }
  }, [clearTimers, go]);

  const hide = useCallback(() => {
    pending.current = Math.max(0, pending.current - 1);
    if (pending.current === 0) settle();
  }, [settle]);

  // envolve uma ação (ex.: navegação) com o loader
  const withLoading = useCallback(
    async (task) => {
      show();
      try {
        return await (typeof task === "function" ? task() : task);
      } finally {
        hide();
      }
    },
    [show, hide],
  );

  useEffect(() => clearTimers, [clearTimers]);

  // o CSS esconde/mostra o #root conforme a fase
  useLayoutEffect(() => {
    document.documentElement.dataset.loading = phase;
  }, [phase]);

  const value = useMemo(
    () => ({ show, hide, withLoading }),
    [show, hide, withLoading],
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <LoadingScreen phase={phase} />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}

// Liga o efeito enquanto `active` for true. Ex.: useGlobalLoading(loading);
export function useGlobalLoading(active) {
  const { show, hide } = useLoading();

  useLayoutEffect(() => {
    if (!active) return undefined;
    show();
    return hide;
  }, [active, show, hide]);
}
