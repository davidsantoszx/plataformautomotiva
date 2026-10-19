import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Environment, OrbitControls } from "@react-three/drei";
import CarScene from "./CarScene";

export default function CarPreview3D({
  modelUrl,
  parts = [],
  loading = false,
  zoomable = false,
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
          <Bounds fit clip observe margin={0.45}>
            <CarScene modelUrl={modelUrl} parts={parts} />
          </Bounds>
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
  {zoomable ? "Arraste para girar · role para aproximar" : "Arraste para girar"}
</span>
    </div>
  );
}
