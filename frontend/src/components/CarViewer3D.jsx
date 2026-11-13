import { Suspense, memo, useCallback, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Bounds, Environment, OrbitControls } from "@react-three/drei";
import {
  Activity,
  Banknote,
  CarFront,
  CircleDot,
  Cog,
  Disc3,
  Palette,
  Wind,
} from "lucide-react";

import PartsCatalog from "./PartsCatalog";
import PaintDock from "./PaintDock";
import CarScene from "./CarScene";
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
// (câmera e enquadramento do carro: mesmos valores de antes)
const CAMERA = { position: [-2.4, 1.2, -6.2], fov: 30 };
const GL_OPTIONS = { antialias: true, toneMappingExposure: 1.1 };

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

// Isolado com memo: só re-renderiza se o modelo, as peças 3D ou a pintura
// mudarem. O Canvas renderiza só quando algo muda (frameloop "demand"): com o
// carro parado a GPU fica livre enquanto a pessoa escolhe peças.
const CarCanvas = memo(function CarCanvas({
  modelUrl,
  parts,
  paint,
  onReady,
}) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={CAMERA}
      gl={GL_OPTIONS}
    >
      <color attach="background" args={["#07090b"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 7, 5]} intensity={2} />
      <directionalLight position={[-5, 3, -3]} intensity={1.2} />

      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.8} />
        <Bounds fit clip observe margin={0.35}>
          <CarScene modelUrl={modelUrl} parts={parts} paint={paint} />
        </Bounds>
        <ReadySignal onReady={onReady} />
      </Suspense>

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

  const addedParts = projectParts
    .map((item) => ({ item, part: projectPartDetails[item.partId] }))
    .filter(({ part }) => part);

  const showPartsDock = !readOnly && activeDock === "parts" && selectedCategory;
  const showPaintDock = !readOnly && activeDock === "paint";

  return (
    <section
      className={`configurator-screen ${summaryOpen ? "" : "summary-closed"}`}
    >
      <header className="configurator-header">
        <div className="configurator-header-titles">
          <span className="configurator-eyebrow">EDITANDO PROJETO</span>

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

        <div className="configurator-header-actions">
          {isDirty && (
            <span className="configurator-dirty">● Alterações não salvas</span>
          )}

          {readOnly && (
            <span className="configurator-readonly">
              🔒 Projeto livre bloqueado · só visualização
            </span>
          )}

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
      </header>

      <div className="configurator-workspace">
        <aside className="configurator-categories">
          <span className="configurator-panel-title">PEÇAS</span>

          {categoryButtons.map(({ id, label, icon: Icon }) => {
            const active = activeDock === "parts" && selectedCategory === id;

            return (
              <button
                key={id}
                type="button"
                className={`car-category-button ${active ? "active" : ""}`}
                onClick={() => handleCategoryClick(id, label)}
                aria-pressed={active}
                disabled={readOnly}
              >
                <Icon size={19} />
                <span>{label}</span>
              </button>
            );
          })}

          <div className="configurator-rail-divider" />

          <span className="configurator-panel-title">APARÊNCIA</span>

          <button
            type="button"
            className={`car-category-button ${
              activeDock === "paint" ? "active" : ""
            }`}
            onClick={handlePaintClick}
            aria-pressed={activeDock === "paint"}
            disabled={readOnly}
          >
            <Palette size={19} />
            <span>Pintura</span>
            <i
              className={`rail-paint-dot${paint ? "" : " original"}`}
              style={paint ? { backgroundColor: paint.color } : undefined}
            />
          </button>
        </aside>

        {/* O canvas ocupa sempre a área toda. O orçamento é um painel por cima
            dele: abrir ou fechar não muda o tamanho do canvas, então não há
            realocação de buffers nem reenquadramento da câmera. */}
        <div className="configurator-car">
          {modelUrl ? (
            <CarCanvas
              modelUrl={modelUrl}
              parts={parts}
              paint={paint}
              onReady={handleSceneReady}
            />
          ) : (
            <div className="configurator-car-empty">
              <CarFront size={28} />
              <p>Modelo 3D indisponível para este veículo.</p>
            </div>
          )}

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
                            <span className="summary-part-qty">
                              {" "}
                              ×{quantity}
                            </span>
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
        </div>
      </div>

      {showPartsDock && (
        <div className="configurator-catalog">
          <button
            type="button"
            className="catalog-close"
            onClick={() => setActiveDock(null)}
            aria-label="Fechar peças"
          >
            ✕
          </button>

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
        <div className="configurator-catalog">
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
