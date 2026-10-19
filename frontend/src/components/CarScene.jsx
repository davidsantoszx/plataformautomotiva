import { useMemo } from "react";
import { ContactShadows, useGLTF } from "@react-three/drei";

function CarModel({ modelUrl }) {
  const { scene } = useGLTF(modelUrl);
  const model = useMemo(() => scene.clone(true), [scene]);

  return <primitive object={model} />;
}

function CarPartModel({
  modelUrl,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) {
  const { scene } = useGLTF(modelUrl);
  const model = useMemo(() => scene.clone(true), [scene]);

  return (
    <primitive
      object={model}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

export default function CarScene({ modelUrl, parts = [], shadow = true }) {
  return (
    <>
      <group rotation={[0, Math.PI / 8, 0]}>
        <CarModel modelUrl={modelUrl} />

        {parts.map((part) => (
          <CarPartModel
            key={part.key}
            modelUrl={part.modelUrl}
            position={part.position}
            rotation={part.rotation}
            scale={part.scale}
          />
        ))}
      </group>

      {shadow && (
        <ContactShadows
          position={[0, -0.75, 0]}
          opacity={0.55}
          scale={8}
          blur={2.5}
          far={4}
        />
      )}
    </>
  );
}