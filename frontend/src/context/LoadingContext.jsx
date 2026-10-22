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
import { useLocation } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen";

// Tempos em ms. Se mudar aqui, confira os tempos em styles/loading.css.
const MIN_COVER = 1440; // tempo mínimo pulsando: o carro leva 3 piscadas para se montar
const INVERT_HOLD = 400; // símbolo parado no fundo laranja
const OUT_TOTAL = 800; // saída do overlay + entrada do conteúdo

// fases: "cover" (pulsando) -> "invert" (fundo laranja) -> "out" -> "idle"
const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const { pathname } = useLocation();

  const [phase, setPhase] = useState("cover"); // abre já coberto (primeira abertura / F5)
  const phaseRef = useRef("cover");
  const pending = useRef(0);
  const shownAt = useRef(Date.now());
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

    // espera um instante: a próxima tela pode assumir o carregamento
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

  // envolve uma promise (ou função async) com o efeito
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

  // primeira abertura / recarregar a página: sai sozinho se ninguém pediu mais tempo
  useEffect(() => {
    settle();
    return clearTimers;
  }, [settle, clearTimers]);

  // transição entre rotas
  const firstRoute = useRef(true);
  useLayoutEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    show();
    hide();
  }, [pathname, show, hide]);

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
