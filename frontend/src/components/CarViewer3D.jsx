import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Environment, OrbitControls } from "@react-three/drei";
import { CircleDot, Activity, Disc3, Cog, Wind, CarFront } from "lucide-react";

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

export default function CarViewer3D({
  modelUrl,
  parts = [],
  selectedCategory = "",
  onCategoryChange,
  total = 0,
  onBack,
  onContinue,
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
        </div>
      </section>
    );
  }

  return (
    <section className="configurator-screen">
      <header className="configurator-header">
        <div>
          <span className="car-viewer-label">CONFIGURADOR 3D</span>
          <h2>Monte seu carro</h2>
        </div>

        <button
          type="button"
          className="configurator-back-button"
          onClick={onBack}
        >
          Voltar
        </button>
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
            />
          </Canvas>
        </div>

        <aside className="configurator-summary">
          <span className="configurator-panel-title">ORÇAMENTO</span>
          <p>Valor estimado das modificações</p>

          <strong className="summary-total">
            {Number(total || 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </strong>

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
                        {price.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
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

          <button
            type="button"
            className="primary-button full-width summary-continue"
            onClick={onContinue}
          >
            Salvar
          </button>
        </aside>
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