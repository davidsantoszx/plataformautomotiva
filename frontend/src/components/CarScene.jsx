import { Suspense, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import { Box3, Vector3 } from "three";
import { applyPaint, cloneForPaint } from "../utils/paint";

// Luz padrão de todas as cenas do carro (configurador, prévia e capa), para
// o carro aparecer igual em todo lugar. Mais suave que a antiga: o branco
// não estoura e dá para enxergar as formas da lataria.
// Use DENTRO de um <Suspense> (o Environment carrega um arquivo).
export function SceneLights() {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    gl.toneMappingExposure = 0.95;
    invalidate();
  }, [gl, invalidate]);

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 7, 5]} intensity={1.5} />
      <directionalLight position={[-5, 3, -3]} intensity={0.8} />
      <Environment preset="studio" environmentIntensity={0.6} />
    </>
  );
}

function CarModel({ modelUrl, paint, onStage }) {
  const { scene } = useGLTF(modelUrl);
  const invalidate = useThree((state) => state.invalidate);

  // clone com materiais próprios: a pintura de um projeto não pode vazar para
  // outros usos do mesmo carro (o .glb carregado é compartilhado)
  const { model, materials } = useMemo(() => cloneForPaint(scene), [scene]);

  useEffect(() => {
    return () => materials.forEach((material) => material.dispose());
  }, [materials]);

  // só troca valores do shader (não recompila). O invalidate redesenha o
  // quadro nos canvas com frameloop "demand".
  useEffect(() => {
    applyPaint(materials, paint);
    invalidate();
  }, [materials, paint, invalidate]);

  // Medidas reais do carro: onde fica o chão (as rodas) e o tamanho. O chão do
  // palco e a sombra usam isso, em vez de um valor fixo que não servia para
  // todos os modelos.
  const stage = useMemo(() => {
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

    return {
      minY: box.min.y,
      cx: center.x,
      cy: center.y,
      cz: center.z,
      sx: size.x,
      sz: size.z,
      length: Math.max(size.x, size.z),
      height: size.y,
    };
  }, [model]);

  useEffect(() => {
    onStage?.(stage);
  }, [stage, onStage]);

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

// paint: { color: "#rrggbb", finish: "GLOSS" | ... } ou null (cor original).
// Passe sempre o MESMO objeto enquanto a pintura não mudar (useMemo).
// onStage(medidas): chamado quando o carro carrega (veja CarStage).
export default function CarScene({
  modelUrl,
  parts = [],
  paint = null,
  onStage,
}) {
  return (
    <group rotation={[0, Math.PI / 8, 0]}>
      <CarModel modelUrl={modelUrl} paint={paint} onStage={onStage} />

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
