import { Suspense, memo, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Environment, OrbitControls } from "@react-three/drei";
import {
  CircleDot,
  Activity,
  Disc3,
  Cog,
  Wind,
  CarFront,
  Banknote,
} from "lucide-react";

import PartsCatalog from "./PartsCatalog";
import CarScene from "./CarScene";

const categoryButtons = [
  { id: "wheels", label: "Rodas e Pneus", icon: CircleDot },
  { id: "suspension", label: "Suspensão", icon: Activity },
  { id: "brakes", label: "Freios", icon: Disc3 },
  { id: "engine", label: "Motor", icon: Cog },
  { id: "exhaust", label: "Escapamento", icon: Wind },
  { id: "exterior", label: "Exterior", icon: CarFront },
];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Isolado com memo: só re-renderiza se o modelo ou as peças 3D mudarem.
// Cliques em categoria, catálogo, orçamento etc. não tocam no canvas.
const CarCanvas = memo(function CarCanvas({ modelUrl, parts }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [2.4, 1.2, 3.2], fov: 30 }}
      gl={{ antialias: true, toneMappingExposure: 1.1 }}
    >
      <color attach="background" args={["#07090b"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 7, 5]} intensity={2} castShadow />
      <directionalLight position={[-5, 3, -3]} intensity={1.2} />

      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.8} />
        <Bounds fit clip observe margin={0.35}>
          <CarScene modelUrl={modelUrl} parts={parts} />
        </Bounds>
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
        autoRotate
        autoRotateSpeed={0.9}
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
}) {
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(true);

  useEffect(() => {
    setCatalogOpen(true); // reabre ao trocar de categoria
  }, [selectedCategory]);

  const addedParts = projectParts
    .map((item) => ({ item, part: projectPartDetails[item.partId] }))
    .filter(({ part }) => part);

  if (!modelUrl) {
    return (
      <section className="car-viewer-3d">
        <div className="car-viewer-empty">
          <span>MONTE SEU CARRO</span>
          <p>Modelo 3D indisponível para este veículo.</p>
          <button
            type="button"
            className="configurator-back-button"
            onClick={onCancel}
          >
            Voltar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`configurator-screen ${summaryOpen ? "" : "summary-closed"}`}
    >
      <header className="configurator-header">
        <div className="configurator-header-titles">
          <span className="configurator-eyebrow">EDITANDO PROJETO</span>
          <h1>{projectName || "Projeto sem nome"}</h1>
          {vehicleLabel && (
            <span className="configurator-header-sub">{vehicleLabel}</span>
          )}
        </div>

        <div className="configurator-header-actions">
          {isDirty && (
            <span className="configurator-dirty">● Alterações não salvas</span>
          )}

          <button
            type="button"
            className="configurator-back-button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </header>

      <div className="configurator-workspace">
        <aside className="configurator-categories">
          <span className="configurator-panel-title">CATEGORIAS</span>

          {categoryButtons.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`car-category-button ${
                selectedCategory === id ? "active" : ""
              }`}
              onClick={() => onCategoryChange?.(id, label)}
              aria-pressed={selectedCategory === id}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </aside>

        <div className="configurator-car">
          <CarCanvas modelUrl={modelUrl} parts={parts} />
        </div>

        {summaryOpen ? (
          <aside className="configurator-summary">
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

            <div className="summary-parts">
              {addedParts.length === 0 ? (
                <span className="summary-empty">Nenhuma peça adicionada</span>
              ) : (
                addedParts.map(({ item, part }) => {
                  const price =
                    Number(item.priceAtTime ?? part.estimatedPrice ?? 0) *
                    Number(item.quantity ?? 1);

                  return (
                    <div className="summary-part" key={item.partId}>
                      <div className="summary-part-info">
                        <span className="summary-part-name">{part.name}</span>
                        <span className="summary-part-price">
                          {formatCurrency(price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="summary-part-remove"
                        onClick={() => onRemovePart?.(item.partId)}
                        aria-label={`Remover ${part.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        ) : (
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

      {selectedCategory && catalogOpen && (
        <div className="configurator-catalog">
          <button
            type="button"
            className="catalog-close"
            onClick={() => setCatalogOpen(false)}
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
    </section>
  );
}