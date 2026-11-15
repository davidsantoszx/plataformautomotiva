import {
  Suspense,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";
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
const DPR = [1, 2];

// Tamanho do carro na tela: MENOR = carro maior; MAIOR = mais folga ao redor.
const FIT_MARGIN = 1.0;

// Mesmo giro aplicado ao carro no CarScene
const SCENE_ROTATION = Math.PI / 8;

// Quanto dura a virada da câmera nos atalhos (em ms). 0 = vira na hora.
const VIEW_DURATION = 350;

// Espaço do topo ocupado pelos atalhos de câmera (px): o carro é centralizado
// na área livre abaixo disso quando um painel de baixo está aberto.
const TOP_RESERVED = 70;

// Atalhos de câmera. az = giro ao redor do carro e el = altura da câmera, em
// graus. O CarScene gira o carro 22,5° no mundo, então todos os ângulos somam
// CAR_YAW: sem isso a "Lateral" aparece meio de trás, a "Frente" de quina etc.
// (Os mesmos valores valem na exportação de imagem HD, em ProjectPage.jsx.)
const CAR_YAW = 22.5;
const VIEWS = [
  { id: "iso", label: "3/4", az: 225 + CAR_YAW, el: 10 },
  { id: "side", label: "Lateral", az: 180 + CAR_YAW, el: 4 },
  { id: "front", label: "Frente", az: 270 + CAR_YAW, el: 6 },
  { id: "rear", label: "Traseira", az: 90 + CAR_YAW, el: 6 },
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

// Enquadra o carro na câmera UMA vez, quando ele carrega (mesma conta do
// <Bounds> do drei, que usávamos antes). Fica tudo aqui de propósito: o Bounds
// refaz o enquadramento sozinho em várias situações e isso puxava a câmera de
// volta para a posição inicial depois dos atalhos. Agora, depois do primeiro
// ajuste, só o mouse, os atalhos e o Girar mexem na câmera.
function AutoFit({ stage }) {
  const get = useThree((state) => state.get);
  const fittedCenter = useRef(null);

  useEffect(() => {
    if (!stage) return;

    const { camera, controls, size, invalidate } = get();
    if (!controls) return;

    // centro do carro no mundo (o CarScene gira o carro em SCENE_ROTATION)
    const center = new Vector3(stage.cx, stage.cy, stage.cz).applyAxisAngle(
      new Vector3(0, 1, 0),
      SCENE_ROTATION,
    );

    if (fittedCenter.current) {
      // outro modelo do mesmo carro (ex.: Astra com rodas trocadas): só
      // acompanha o novo centro, sem mexer no zoom nem no ângulo
      const delta = center.clone().sub(fittedCenter.current);
      controls.target.add(delta);
      camera.position.add(delta);
    } else {
      const cos = Math.abs(Math.cos(SCENE_ROTATION));
      const sin = Math.abs(Math.sin(SCENE_ROTATION));
      const width = stage.sx * cos + stage.sz * sin;
      const depth = stage.sx * sin + stage.sz * cos;
      const maxSize = Math.max(width, depth, stage.height);

      const fitHeight = maxSize / (2 * Math.atan((Math.PI * camera.fov) / 360));
      const fitWidth = fitHeight / (size.width / size.height);
      const distance = FIT_MARGIN * Math.max(fitHeight, fitWidth);

      // mantém a direção inicial da câmera (a do CAMERA lá em cima)
      const direction = camera.position
        .clone()
        .sub(controls.target)
        .normalize();

      controls.target.copy(center);
      camera.position.copy(center).addScaledVector(direction, distance);
      camera.near = distance / 100;
      camera.far = distance * 100;
      camera.updateProjectionMatrix();
    }

    fittedCenter.current = center;
    controls.update();
    invalidate();
  }, [stage, get]);

  return null;
}

// Leva a câmera até um dos atalhos com uma animação suave, mantendo a
// distância atual (se a pessoa deu zoom, o zoom continua).
//
// A animação roda DENTRO do loop de desenho (useFrame), um passo por quadro
// desenhado, e é guiada pelo relógio: se o computador for lento, ela pula
// quadros em vez de atrasar. Importante: não chamar invalidate() a cada passo.
// Cada chamada enfileira um quadro novo, e com o modelo pesado a fila
// continuava desenhando quadros iguais por segundos depois do clique (era a
// travada). O controle de órbita já pede o próximo quadro sozinho quando a
// câmera se mexe.
function CameraRig({ view }) {
  const get = useThree((state) => state.get);
  const anim = useRef(null);

  useEffect(() => {
    if (!view) return;

    const { camera, controls, invalidate } = get();
    if (!controls) return;

    const toRad = (deg) => (deg * Math.PI) / 180;
    const target = controls.target.clone();
    const offset = camera.position.clone().sub(target);
    const dist = offset.length();

    const startAz = Math.atan2(offset.x, offset.z);
    const startEl = Math.asin(Math.max(-1, Math.min(1, offset.y / dist)));
    const endAz = toRad(view.az);
    // 2° a 54°: os limites do OrbitControls abaixo
    const endEl = toRad(Math.max(2, Math.min(54, view.el)));

    anim.current = {
      target,
      dist,
      startAz,
      startEl,
      // gira pelo caminho mais curto
      deltaAz: Math.atan2(
        Math.sin(endAz - startAz),
        Math.cos(endAz - startAz),
      ),
      deltaEl: endEl - startEl,
      startTime: performance.now(),
    };

    invalidate(); // só para o primeiro quadro; os seguintes vêm do useFrame
  }, [view, get]);

  useFrame(({ camera, controls }) => {
    const a = anim.current;
    if (!a || !controls) return;

    const t =
      VIEW_DURATION > 0
        ? Math.min((performance.now() - a.startTime) / VIEW_DURATION, 1)
        : 1;
    // começa rápido e desacelera no fim: responde assim que clica
    const k = 1 - Math.pow(1 - t, 3);
    const az = a.startAz + a.deltaAz * k;
    const el = a.startEl + a.deltaEl * k;

    camera.position.set(
      a.target.x + a.dist * Math.sin(az) * Math.cos(el),
      a.target.y + a.dist * Math.sin(el),
      a.target.z + a.dist * Math.cos(az) * Math.cos(el),
    );

    // atualiza a câmera; o controle avisa o canvas para desenhar o próximo
    controls.update();

    if (t >= 1) anim.current = null;
  });

  return null;
}

// Sobe o carro na tela (sem mudar o zoom nem o ângulo) para ele não ficar
// atrás do painel de baixo. É um deslocamento da imagem da câmera, não da
// cena: as peças, o círculo e a sombra sobem juntos.
// Também guiado pelo relógio dentro do useFrame, sem fila de quadros.
function ViewShift({ shift }) {
  const get = useThree((state) => state.get);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const current = useRef(0);
  const anim = useRef(null);

  useEffect(() => {
    const { invalidate } = get();

    anim.current = {
      from: current.current,
      to: shift,
      startTime: performance.now(),
    };

    invalidate();
  }, [shift, width, height, get]);

  useFrame(({ camera, invalidate }) => {
    const a = anim.current;
    if (!a) return;

    const t = Math.min((performance.now() - a.startTime) / 320, 1);
    const k = 1 - Math.pow(1 - t, 3);

    current.current = a.from + (a.to - a.from) * k;

    if (Math.abs(current.current) < 0.5) camera.clearViewOffset();
    else camera.setViewOffset(width, height, 0, current.current, width, height);

    if (t < 1) invalidate();
    else anim.current = null;
  });

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
      dpr={DPR}
      camera={CAMERA}
      gl={GL_OPTIONS}
    >
      <Suspense fallback={null}>
        <SceneLights />

        <CarScene
          modelUrl={modelUrl}
          parts={parts}
          paint={paint}
          onStage={setStage}
        />

        {/* o enquadramento mede só o carro, não o chão */}
        <CarStage stage={stage} shadowKey={parts.map((part) => part.key).join("|")} />

        {/* só avisa que está pronto depois do enquadramento (AutoFit) */}
        {stage && <ReadySignal onReady={onReady} />}
      </Suspense>

      <AutoFit stage={stage} />
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
