import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Bounds,
  ContactShadows,
  Environment,
  OrbitControls,
} from "@react-three/drei";
import CarScene from "./CarScene";

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
        <ambientLight intensity={0.45} />
        <directionalLight position={[5, 7, 5]} intensity={2} />
        <directionalLight position={[-5, 3, -3]} intensity={1.2} />

        <Suspense fallback={null}>
          <Environment preset="studio" environmentIntensity={0.8} />

          {/* O Bounds enquadra tudo o que está dentro dele. A sombra (um plano
              de 8x8) fica FORA, senão o carro é enquadrado como se fosse do
              tamanho dela e aparece pequeno. */}
          <Bounds fit clip observe margin={FIT_MARGIN}>
            <CarScene
              modelUrl={modelUrl}
              parts={parts}
              shadow={false}
              paint={paint}
            />
          </Bounds>

          <ContactShadows
            position={[0, -0.75, 0]}
            opacity={0.55}
            scale={8}
            blur={2.5}
            far={4}
            frames={2}
          />
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
