import "../styles/LoginRoad.css";

// Estrada e carro em loop no rodapé da tela de login. É só decoração:
// fica atrás do card, não recebe clique e some para quem prefere menos
// movimento (veja o @media no CSS).
function Wheel({ cx }) {
  return (
    <g className="login-car-wheel" transform={`translate(${cx} 62)`}>
      <g className="login-car-wheel-spin">
        <circle r="13" fill="#0a0c0f" stroke="#3a424c" strokeWidth="1.5" />
        <circle r="6.5" fill="none" stroke="#ff5a1f" strokeWidth="1.2" />
        <path
          d="M0 -6.5V6.5M-6.5 0H6.5M-4.6 -4.6L4.6 4.6M-4.6 4.6L4.6 -4.6"
          stroke="#ff5a1f"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
        <circle r="1.8" fill="#ff5a1f" />
      </g>
    </g>
  );
}

export default function LoginRoad() {
  return (
    <div className="login-road" aria-hidden="true">
      <div className="login-road-line" />
      <div className="login-road-dashes" />

      <div className="login-car">
        <div className="login-car-bob">
          <svg viewBox="0 0 320 84" role="presentation" focusable="false">
            <defs>
              <linearGradient id="login-car-beam" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#ffb089" stopOpacity="0.38" />
                <stop offset="1" stopColor="#ffb089" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* farol */}
            <polygon points="232,47 318,34 318,66 232,56" fill="url(#login-car-beam)" />

            {/* carroceria */}
            <path
              d="M8 58V48Q8 42 16 40L46 34L68 16Q72 12 78 12H150Q156 12 160 16L184 36L216 40Q232 44 232 54V58Q232 62 228 62H212A15 15 0 0 0 182 62H62A15 15 0 0 0 32 62H12Q8 62 8 58Z"
              fill="#12161b"
              stroke="#ff5a1f"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />

            {/* vidros */}
            <path
              d="M52 36L70 19Q73 16 77 16H108V36Z"
              fill="rgba(255,90,31,0.12)"
              stroke="#ff5a1f"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d="M114 16H150Q153 16 155 18L174 36H114Z"
              fill="rgba(255,90,31,0.12)"
              stroke="#ff5a1f"
              strokeWidth="1"
              strokeLinejoin="round"
            />

            {/* detalhes */}
            <path d="M112 38V58" stroke="#252b33" strokeWidth="1.2" />
            <path d="M120 46H132" stroke="#3a424c" strokeWidth="2" strokeLinecap="round" />
            <rect x="224" y="45" width="8" height="5" rx="2" fill="#ffd2b8" />
            <rect x="8" y="45" width="5" height="5" rx="2" fill="#e5392d" />

            <Wheel cx={47} />
            <Wheel cx={197} />
          </svg>
        </div>
      </div>
    </div>
  );
}
