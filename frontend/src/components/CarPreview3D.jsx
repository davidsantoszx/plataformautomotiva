import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import CarScene, { SceneLights } from "./CarScene";
import CarStage from "./CarStage";

// Quão perto a câmera fica do carro. MENOR = carro maior e mais perto;
// MAIOR = mais folga ao redor. Se o carro ficar cortado nas bordas, suba um
// pouco (ex.: 0.9); se quiser ainda maior, desça (ex.: 0.7).
const FIT_MARGIN = 1.0;

export default function CarPreview3D({
  modelUrl,
  parts = [],
  loading = false,
  zoomable = false,
  paint = null,
}) {
  // medidas do carro: a sombra fica exatamente na altura das rodas
  const [stage, setStage] = useState(null);

  if (loading) {
    return <div className="car-preview-empty">Carregando modelo 3D...</div>;
  }

  if (!modelUrl) {
    return (
      <div className="car-preview-empty">
        Modelo 3D indisponível para este veículo.
      </div>
    );
  }

  return (
    <div className="car-preview">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [2.4, 1.2, 3.2], fov: 30 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#07090b"]} />

        <Suspense fallback={null}>
          <SceneLights />

          {/* O Bounds enquadra tudo o que está dentro dele. A sombra fica
              FORA, senão o carro é enquadrado como se fosse do tamanho dela e
              aparece pequeno. */}
          <Bounds fit clip observe margin={FIT_MARGIN}>
            <CarScene
              modelUrl={modelUrl}
              parts={parts}
              paint={paint}
              onStage={setStage}
            />
          </Bounds>

          <CarStage stage={stage} ring={false} />
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={zoomable}
          minDistance={1.5}
          maxDistance={14}
          autoRotate
          autoRotateSpeed={0.9}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>

      <span className="car-preview-hint">
        {zoomable
          ? "Arraste para girar · role para aproximar"
          : "Arraste para girar"}
      </span>
    </div>
  );
}
