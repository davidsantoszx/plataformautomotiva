import { Suspense, useMemo } from "react";
import { ContactShadows, useGLTF } from "@react-three/drei";

function CarModel({ modelUrl, shadow }) {
  const { scene } = useGLTF(modelUrl);
  const model = useMemo(() => scene.clone(true), [scene]);

  return (
    <>
      <primitive object={model} />

      {shadow && (
        // A sombra é "assada": o ContactShadows redesenha a cena inteira a cada
        // frame se não houver limite, e isso pesava na rotação. Com frames={2}
        // ele desenha 2 frames sempre que este componente renderiza (ao montar
        // o carro e quando as peças mudam) e depois fica parado.
        // Fica aqui dentro para só montar quando o carro já apareceu, e o grupo
        // desfaz a rotação do grupo pai para a sombra continuar alinhada.
        <group rotation={[0, -Math.PI / 8, 0]}>
          <ContactShadows
            position={[0, -0.75, 0]}
            opacity={0.55}
            scale={8}
            blur={2.5}
            far={4}
            frames={2}
          />
        </group>
      )}
    </>
  );
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
    <group rotation={[0, Math.PI / 8, 0]}>
      <CarModel modelUrl={modelUrl} shadow={shadow} />

      {parts.map((part) => (
        // Suspense próprio: se o .glb da peça ainda está carregando,
        // só ela espera. O carro continua na tela.
        <Suspense key={part.key} fallback={null}>
          <CarPartModel
            modelUrl={part.modelUrl}
            position={part.position}
            rotation={part.rotation}
            scale={part.scale}
          />
        </Suspense>
      ))}
    </group>
  );
}
