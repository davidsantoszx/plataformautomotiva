import { createPortal } from "react-dom";

// Posição inicial (espalhada) de cada peça: x e y em unidades do desenho, r em
// graus. O CSS (styles/loading.css) aproxima as peças a cada piscada, até
// encaixarem no lugar original. Para um efeito mais "explodido", aumente os
// números; para mais sutil, diminua.
const PIECES = {
  rear: { x: -46, y: -16, r: -12 },
  front: { x: 48, y: -20, r: 10 },
  cabin: { x: -4, y: -42, r: -7 },
  spoiler: { x: -34, y: -46, r: -26 },
  details: { x: 0, y: 36, r: 5 },
  wheelRear: { x: -36, y: 36, r: -140 },
  wheelFront: { x: 40, y: 40, r: 150 },
};

function piece(name) {
  const p = PIECES[name];
  return {
    className: "loader-piece",
    style: { "--x": `${p.x}px`, "--y": `${p.y}px`, "--r": `${p.r}deg` },
  };
}

const TEETH = 8;

function GearSymbol() {
  return (
    <svg className="loader-car" viewBox="-100 -100 200 200" fill="currentColor" aria-hidden="true">
      <g className="gear-spin">
        {Array.from({ length: TEETH }, (_, i) => (
          <g key={i} transform={`rotate(${(360 / TEETH) * i})`}>
            <rect
              className="loader-piece"
              x="-11" y="-84" width="22" height="44" rx="3"
              style={{ "--y": "-70px", "--d": `${i * 35}ms` }}
            />
          </g>
        ))}
        <circle
          className="loader-piece"
          r="56" fill="none" stroke="currentColor" strokeWidth="24"
          style={{ "--y": "0px", "--d": "250ms" }}
        />
        <circle className="loader-piece" r="14" style={{ "--y": "0px", "--d": "300ms" }} />
      </g>
    </svg>
  );
}


export default function LoadingScreen({ phase }) {
  if (phase === "idle") return null;

  // portal no body: o #root some (opacity) enquanto o overlay continua visível
  return createPortal(
    <div
      className="loader"
      data-phase={phase}
      role="status"
      aria-live="polite"
      aria-label="Carregando"
    >
      <GearSymbol />
    </div>,
    document.body,
  );
}
