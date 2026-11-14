import {
  Suspense,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Bounds, OrbitControls } from "@react-three/drei";
import {
  Activity,
  Banknote,
  CarFront,
  CircleDot,
  Cog,
  Disc3,
  Palette,
  RotateCw,
  Wind,
} from "lucide-react";

import PartsCatalog from "./PartsCatalog";
import PaintDock from "./PaintDock";
import CarScene, { SceneLights } from "./CarScene";
import CarStage from "./CarStage";
import { useGlobalLoading } from "../context/LoadingContext";
import { paintColorName, paintFinishLabel } from "../utils/paint";

const categoryButtons = [
  { id: "wheels", label: "Rodas e Pneus", icon: CircleDot },
  { id: "suspension", label: "Suspensão", icon: Activity },
  { id: "brakes", label: "Freios", icon: Disc3 },
  { id: "engine", label: "Motor", icon: Cog },
  { id: "exhaust", label: "Escapamento", icon: Wind },
  { id: "exterior", label: "Exterior", icon: CarFront },
];

// objetos fora do componente: não mudam de identidade a cada render
const CAMERA = { position: [-2.4, 1.2, -6.2], fov: 30 };
const GL_OPTIONS = { antialias: true, alpha: true }; // o fundo vem do CSS

// Tamanho do carro na tela: MENOR = carro maior; MAIOR = mais folga ao redor.
const FIT_MARGIN = 1.0;

// Quanto dura a virada da câmera nos atalhos (em ms). 0 = vira na hora.
const VIEW_DURATION = 450;

// Espaço do topo ocupado pelos atalhos de câmera (px): o carro é centralizado
// na área livre abaixo disso quando um painel de baixo está aberto.
const TOP_RESERVED = 70;

// Atalhos de câmera (mesmos ângulos da exportação de imagem HD):
// az = giro ao redor do carro, el = altura da câmera, em graus.
const VIEWS = [
  { id: "iso", label: "3/4", az: 225, el: 10 },
  { id: "side", label: "Lateral", az: 180, el: 4 },
  { id: "front", label: "Frente", az: 270, el: 6 },
  { id: "rear", label: "Traseira", az: 90, el: 6 },
];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Só monta quando tudo dentro do Suspense terminou de carregar. Espera dois
// frames para a primeira imagem do carro já ter sido desenhada (é nesse
// momento que as texturas sobem para a GPU, ainda escondido pela transição).
function ReadySignal({ onReady }) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();

    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(onReady);
    });

    return () => cancelAnimationFrame(id);
  }, [invalidate, onReady]);

  return null;
}

// Leva a câmera até um dos atalhos com uma animação suave, mantendo a
// distância atual (se a pessoa deu zoom, o zoom continua).
function CameraRig({ view }) {
  const get = useThree((state) => state.get);

  useEffect(() => {
    if (!view) return undefined;

    const { camera, controls, invalidate } = get();
    if (!controls) return undefined;

    const toRad = (deg) => (deg * Math.PI) / 180;
    const target = controls.target.clone();
    const offset = camera.position.clone().sub(target);
    const dist = offset.length();

    const startAz = Math.atan2(offset.x, offset.z);
    const startEl = Math.asin(Math.max(-1, Math.min(1, offset.y / dist)));
    const endAz = toRad(view.az);
    // 2° a 54°: os limites do OrbitControls abaixo
    const endEl = toRad(Math.max(2, Math.min(54, view.el)));

    // gira pelo caminho mais curto
    const deltaAz = Math.atan2(
      Math.sin(endAz - startAz),
      Math.cos(endAz - startAz),
    );
    const deltaEl = endEl - startEl;

    const DURATION = VIEW_DURATION;
    const startTime = performance.now();
    let raf;

    function step(now) {
      const t = DURATION > 0 ? Math.min((now - startTime) / DURATION, 1) : 1;
      // começa rápido e desacelera no fim: responde assim que clica
      const k = 1 - Math.pow(1 - t, 3);
      const az = startAz + deltaAz * k;
      const el = startEl + deltaEl * k;

      camera.position.set(
        target.x + dist * Math.sin(az) * Math.cos(el),
        target.y + dist * Math.sin(el),
        target.z + dist * Math.cos(az) * Math.cos(el),
      );

      controls.update();
      invalidate();

      if (t < 1) raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [view, get]);

  return null;
}

// Sobe o carro na tela (sem mudar o zoom nem o ângulo) para ele não ficar
// atrás do painel de baixo. É um deslocamento da imagem da câmera, não da
// cena: as peças, o círculo e a sombra sobem juntos.
function ViewShift({ shift }) {
  const get = useThree((state) => state.get);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const current = useRef(0);

  useEffect(() => {
    const { camera, invalidate } = get();

    function apply(value) {
      if (Math.abs(value) < 0.5) camera.clearViewOffset();
      else camera.setViewOffset(width, height, 0, value, width, height);

      invalidate();
    }

    const from = current.current;

    // mesma posição (ex.: a janela mudou de tamanho): só reaplica
    if (from === shift) {
      apply(shift);
      return undefined;
    }

    const DURATION = 320;
    const startTime = performance.now();
    let raf;

    function step(now) {
      const t = Math.min(Math.max((now - startTime) / DURATION, 0), 1);
      const k = 1 - Math.pow(1 - t, 3);

      current.current = from + (shift - from) * k;
      apply(current.current);

      if (t < 1) raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [shift, width, height, get]);

  return null;
}

// Isolado com memo: só re-renderiza se o modelo, as peças 3D, a pintura ou a
// câmera mudarem. O Canvas renderiza só quando algo muda (frameloop "demand"):
// com o carro parado a GPU fica livre enquanto a pessoa escolhe peças.
const CarCanvas = memo(function CarCanvas({
  modelUrl,
  parts,
  paint,
  view,
  autoRotate,
  shift,
  onReady,
}) {
  // medidas do carro (chão e tamanho), usadas pelo palco
  const [stage, setStage] = useState(null);

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={CAMERA}
      gl={GL_OPTIONS}
      performance={{ min: 0.5 }}
    >
      {/* enquanto a câmera se move, desenha em resolução menor (volta ao
          normal quando para): o giro fica fluido mesmo com modelo pesado */}
      <AdaptiveDpr />

      <Suspense fallback={null}>
        <SceneLights />

        <Bounds fit clip observe margin={FIT_MARGIN}>
          <CarScene
            modelUrl={modelUrl}
            parts={parts}
            paint={paint}
            onStage={setStage}
          />
        </Bounds>

        {/* fora do Bounds: a câmera enquadra o carro, não o chão */}
        <CarStage stage={stage} />

        <ReadySignal onReady={onReady} />
      </Suspense>

      <CameraRig view={view} />
      <ViewShift shift={shift} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={0.5}
        maxDistance={20}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.05}
        rotateSpeed={0.7}
        zoomSpeed={0.7}
        autoRotate={autoRotate}
        autoRotateSpeed={1.2}
        regress
      />
    </Canvas>
  );
});

export default function CarViewer3D({
  modelUrl,
  parts = [],
  selectedCategory = "",
  onCategoryChange,
  total = 0,
  projectName = "",
  vehicleLabel = "",
  projectMode = "",
  isDirty = false,
  saving = false,
  onCancel,
  onSave,
  categories = [],
  catalogParts = [],
  compatibilities = {},
  currentProject = null,
  selectedCategoryId = "",
  loadingCategories = false,
  loadingParts = false,
  projectParts = [],
  projectPartDetails = {},
  onAddPart,
  onRemovePart,
  onCatalogCategoryChange,
  readOnly = false,
  paint = null,
  paintDraft = { color: "", finish: "GLOSS" },
  onPaintChange,
  onPaintReset,
  isPro = false,
}) {
  // qual painel está aberto na faixa de baixo: peças, pintura ou nenhum
  const [activeDock, setActiveDock] = useState(null);

  // atalhos de câmera e giro automático
  const [view, setView] = useState(null);
  const [autoRotate, setAutoRotate] = useState(false);

  // A transição de carregamento só sai quando o carro 3D já está na tela.
  const [sceneReady, setSceneReady] = useState(false);
  const handleSceneReady = useCallback(() => setSceneReady(true), []);
  useGlobalLoading(Boolean(modelUrl) && !sceneReady);

  // trava de segurança: se o modelo não carregar, não deixa a tela presa
  useEffect(() => {
    const id = setTimeout(() => setSceneReady(true), 12000);
    return () => clearTimeout(id);
  }, []);

  // começa fechado em telas estreitas, onde o painel cobriria o carro
  const [summaryOpen, setSummaryOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 1100,
  );

  // clicar de novo na categoria aberta fecha o painel
  function handleCategoryClick(id, label) {
    if (activeDock === "parts" && selectedCategory === id) {
      setActiveDock(null);
      return;
    }

    setActiveDock("parts");
    onCategoryChange?.(id, label);
  }

  function handlePaintClick() {
    setActiveDock((current) => (current === "paint" ? null : "paint"));
  }

  function handleViewClick(item) {
    setAutoRotate(false);
    setView({ az: item.az, el: item.el, id: Date.now() });
  }

  const showPartsDock = !readOnly && activeDock === "parts" && selectedCategory;
  const showPaintDock = !readOnly && activeDock === "paint";
  const dockOpen = Boolean(showPartsDock || showPaintDock);

  // Com um painel de baixo aberto, o carro sobe para o centro da área que
  // sobra livre (em vez de ficar escondido atrás do painel).
  const dockRef = useRef(null);
  const [dockShift, setDockShift] = useState(0);

  useEffect(() => {
    const el = dockRef.current;

    if (!dockOpen || !el) {
      setDockShift(0);
      return undefined;
    }

    const parent = el.offsetParent;
    if (!parent) return undefined;

    function measure() {
      // centro da área livre: entre os atalhos do topo e o painel
      const freeCenter = (TOP_RESERVED + el.offsetTop - 12) / 2;
      setDockShift(Math.max(0, Math.round(parent.clientHeight / 2 - freeCenter)));
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(parent);

    return () => observer.disconnect();
  }, [dockOpen, activeDock]);

  const addedParts = projectParts
    .map((item) => ({ item, part: projectPartDetails[item.partId] }))
    .filter(({ part }) => part);

  const activeCategory = categoryButtons.find(
    (item) => item.id === selectedCategory,
  );

  return (
    <section
      className={`configurator-screen ${summaryOpen ? "" : "summary-closed"}`}
    >
      {/* O canvas ocupa a tela toda, por baixo de todo o resto: o carro fica
          no centro da tela e nada aqui muda o tamanho dele. */}
      <div className="configurator-car">
        {modelUrl ? (
          <CarCanvas
            modelUrl={modelUrl}
            parts={parts}
            paint={paint}
            view={view}
            autoRotate={autoRotate}
            shift={dockShift}
            onReady={handleSceneReady}
          />
        ) : (
          <div className="configurator-car-empty">
            <CarFront size={28} />
            <p>Modelo 3D indisponível para este veículo.</p>
          </div>
        )}
      </div>

      <header className="configurator-header">
        <div className="configurator-header-titles">
          <div className="configurator-title-row">
            <h1>{projectName || "Projeto sem nome"}</h1>

            {projectMode && (
              <span
                className={`project-mode-badge ${projectMode.toLowerCase()}`}
              >
                {projectMode === "REAL" ? "Real" : "Livre"}
              </span>
            )}
          </div>

          {vehicleLabel && (
            <span className="configurator-header-sub">{vehicleLabel}</span>
          )}
        </div>
      </header>

      <div className="configurator-actions">
        {isDirty && (
          <span className="configurator-dirty">● Alterações não salvas</span>
        )}

        {readOnly && (
          <span className="configurator-readonly">
            🔒 Projeto livre bloqueado · só visualização
          </span>
        )}

        <div className="configurator-actions-row">
          <button
            type="button"
            className="configurator-back-button"
            onClick={onCancel}
            disabled={saving}
          >
            {readOnly ? "Voltar" : "Cancelar"}
          </button>

          {!readOnly && (
            <button
              type="button"
              className="primary-button"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          )}
        </div>
      </div>

      {modelUrl && (
        <div className="configurator-views" role="group" aria-label="Câmera">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="configurator-view-button"
              onClick={() => handleViewClick(item)}
            >
              {item.label}
            </button>
          ))}

          <span className="configurator-views-divider" />

          <button
            type="button"
            className={`configurator-view-button${autoRotate ? " active" : ""}`}
            onClick={() => setAutoRotate((current) => !current)}
            aria-pressed={autoRotate}
          >
            <RotateCw size={13} />
            Girar
          </button>
        </div>
      )}

      <nav className="configurator-categories" aria-label="Personalizar">
        {categoryButtons.map(({ id, label, icon: Icon }) => {
          const active = activeDock === "parts" && selectedCategory === id;

          return (
            <button
              key={id}
              type="button"
              className={`car-category-button ${active ? "active" : ""}`}
              data-label={label}
              aria-label={label}
              onClick={() => handleCategoryClick(id, label)}
              aria-pressed={active}
              disabled={readOnly}
            >
              <Icon size={20} />
            </button>
          );
        })}

        <div className="configurator-rail-divider" />

        <button
          type="button"
          className={`car-category-button ${
            activeDock === "paint" ? "active" : ""
          }`}
          data-label="Pintura"
          aria-label="Pintura"
          onClick={handlePaintClick}
          aria-pressed={activeDock === "paint"}
          disabled={readOnly}
        >
          <Palette size={20} />
          <i
            className={`rail-paint-dot${paint ? "" : " original"}`}
            style={paint ? { backgroundColor: paint.color } : undefined}
          />
        </button>
      </nav>

      <aside
        className="configurator-summary"
        aria-hidden={!summaryOpen}
        aria-label="Orçamento"
      >
        <div className="summary-header">
          <span className="configurator-panel-title">ORÇAMENTO</span>

          <button
            type="button"
            className="summary-close"
            onClick={() => setSummaryOpen(false)}
            aria-label="Fechar orçamento"
          >
            ✕
          </button>
        </div>

        <p>Valor estimado das modificações</p>

        <strong className="summary-total">{formatCurrency(total)}</strong>

        <button
          type="button"
          className="summary-paint"
          onClick={() => setActiveDock("paint")}
          disabled={readOnly}
          title="Editar a pintura"
        >
          <i
            className={`summary-paint-dot${paint ? "" : " original"}`}
            style={paint ? { backgroundColor: paint.color } : undefined}
          />

          <span className="summary-paint-info">
            <span className="summary-paint-name">Pintura</span>
            <small>
              {paint
                ? `${paintColorName(paint.color)} · ${paintFinishLabel(
                    paint.finish,
                  )}`
                : "Cor original do carro"}
            </small>
          </span>
        </button>

        <div className="summary-parts">
          {addedParts.length === 0 ? (
            <span className="summary-empty">Nenhuma peça adicionada</span>
          ) : (
            addedParts.map(({ item, part }) => {
              const quantity = Number(item.quantity ?? 1);
              const price =
                Number(item.priceAtTime ?? part.estimatedPrice ?? 0) *
                quantity;

              return (
                <div className="summary-part" key={item.partId}>
                  <div className="summary-part-info">
                    <span className="summary-part-name">
                      {part.name}
                      {quantity > 1 && (
                        <span className="summary-part-qty"> ×{quantity}</span>
                      )}
                    </span>
                    <span className="summary-part-price">
                      {formatCurrency(price)}
                    </span>
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      className="summary-part-remove"
                      onClick={() => onRemovePart?.(item.partId)}
                      aria-label={`Remover ${part.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {!summaryOpen && (
        <button
          type="button"
          className="summary-reopen"
          onClick={() => setSummaryOpen(true)}
          aria-label="Abrir orçamento"
        >
          <Banknote size={17} />
          <span>{formatCurrency(total)}</span>
        </button>
      )}

      {showPartsDock && (
        <div className="configurator-catalog" ref={dockRef}>
          <button
            type="button"
            className="catalog-close"
            onClick={() => setActiveDock(null)}
            aria-label="Fechar peças"
          >
            ✕
          </button>

          <h2 className="dock-title">
            {activeCategory?.label || "Peças disponíveis"}
          </h2>

          <PartsCatalog
            categories={categories}
            parts={catalogParts}
            compatibilities={compatibilities}
            currentProject={currentProject}
            selectedCategory={selectedCategoryId}
            loadingCategories={loadingCategories}
            loadingParts={loadingParts}
            projectParts={projectParts}
            onAddPart={onAddPart}
            onCategoryChange={onCatalogCategoryChange}
            onRemovePart={onRemovePart}
          />
        </div>
      )}

      {showPaintDock && (
        <div className="configurator-catalog" ref={dockRef}>
          <button
            type="button"
            className="catalog-close"
            onClick={() => setActiveDock(null)}
            aria-label="Fechar pintura"
          >
            ✕
          </button>

          <PaintDock
            color={paintDraft.color}
            finish={paintDraft.finish}
            isPro={isPro}
            onChange={onPaintChange}
            onReset={onPaintReset}
          />
        </div>
      )}
    </section>
  );
}
