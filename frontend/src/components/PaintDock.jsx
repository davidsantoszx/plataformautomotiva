import { useEffect, useState } from "react";
import { Lock, RotateCcw } from "lucide-react";
import {
  DEFAULT_FINISH,
  PAINT_COLORS,
  PAINT_FINISHES,
  paintColorName,
  paintFinishLabel,
} from "../utils/paint";

// Painel de pintura do configurador (fica na faixa de baixo, como o catálogo
// de peças). É controlado: quem usa guarda o rascunho e o carro 3D mostra a
// pintura na hora; ela só vale depois de salvar o projeto.
//
// Free: preto, cinza e branco, brilhante. Pro: tudo, inclusive cor livre.
export default function PaintDock({
  color,
  finish,
  isPro,
  onChange,
  onReset,
}) {
  const [nudge, setNudge] = useState(false);
  const currentFinish = finish || DEFAULT_FINISH;

  // balança o aviso do Pro quando clicam em algo bloqueado
  useEffect(() => {
    if (!nudge) return undefined;

    const timer = setTimeout(() => setNudge(false), 700);
    return () => clearTimeout(timer);
  }, [nudge]);

  function pickColor(hex) {
    const finishItem = PAINT_FINISHES.find((item) => item.id === currentFinish);

    // quem não é Pro não pode ficar com um acabamento exclusivo do Pro
    const nextFinish =
      isPro || finishItem?.free ? currentFinish : DEFAULT_FINISH;

    onChange({ color: hex, finish: nextFinish });
  }

  const summary = color
    ? `${paintColorName(color)} · ${paintFinishLabel(currentFinish)}`
    : "Cor original do carro";

  return (
    <section className="paint-dock" aria-label="Pintura do carro">
      <div className="paint-dock-head">
        <div className="paint-dock-title">
          <h2>Pintura</h2>
          <span className="paint-dock-current">{summary}</span>
        </div>

        <button
          type="button"
          className="paint-dock-reset"
          onClick={onReset}
          disabled={!color}
          title="Voltar para a cor original do carro"
        >
          <RotateCcw size={13} /> Cor original
        </button>
      </div>

      <div className="paint-dock-body">
        <div className="paint-dock-group">
          <span className="paint-dock-label">COR</span>

          <div className="paint-dock-swatches">
            {PAINT_COLORS.map((item) => {
              const locked = !isPro && !item.free;
              const selected = color?.toLowerCase() === item.hex;

              return (
                <button
                  key={item.hex}
                  type="button"
                  className={`paint-dock-swatch${selected ? " selected" : ""}${
                    locked ? " locked" : ""
                  }`}
                  style={{ backgroundColor: item.hex }}
                  title={locked ? `${item.name} · exclusiva do Pro` : item.name}
                  aria-label={item.name}
                  aria-pressed={selected}
                  onClick={() => (locked ? setNudge(true) : pickColor(item.hex))}
                >
                  {locked && (
                    <span className="paint-dock-lock">
                      <Lock size={9} />
                    </span>
                  )}
                </button>
              );
            })}

            {isPro ? (
              <label
                className="paint-dock-swatch paint-dock-custom"
                title="Cor livre"
              >
                <input
                  type="color"
                  value={color || "#c4161c"}
                  aria-label="Escolher uma cor livre"
                  onChange={(event) => pickColor(event.target.value)}
                />
              </label>
            ) : (
              <button
                type="button"
                className="paint-dock-swatch paint-dock-custom locked"
                title="Cor livre · exclusiva do Pro"
                aria-label="Cor livre (exclusiva do Pro)"
                onClick={() => setNudge(true)}
              >
                <span className="paint-dock-lock">
                  <Lock size={9} />
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="paint-dock-group">
          <span className="paint-dock-label">ACABAMENTO</span>

          <div className="paint-dock-finishes">
            {PAINT_FINISHES.map((item) => {
              const locked = !isPro && !item.free;
              const selected = currentFinish === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`paint-dock-finish${selected ? " selected" : ""}${
                    locked ? " locked" : ""
                  }`}
                  title={
                    !color
                      ? "Escolha uma cor primeiro"
                      : locked
                        ? `${item.label} · exclusivo do Pro`
                        : item.hint
                  }
                  aria-pressed={selected}
                  disabled={!color}
                  onClick={() =>
                    locked
                      ? setNudge(true)
                      : onChange({ color, finish: item.id })
                  }
                >
                  {item.label}
                  {locked && <Lock size={11} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!isPro && (
        <div className={`paint-dock-upsell${nudge ? " nudge" : ""}`}>
          <Lock size={16} />

          <p>
            <strong>Todas as cores com o Pro.</strong> Libere mais 8 cores, cor
            livre e os acabamentos fosco, metálico e perolado.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() => window.open("/planos", "_blank", "noopener")}
          >
            Conhecer o Pro
          </button>
        </div>
      )}
    </section>
  );
}
