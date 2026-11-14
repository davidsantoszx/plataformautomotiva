import { memo, useEffect, useMemo } from "react";
import { AdditiveBlending, CanvasTexture, SRGBColorSpace } from "three";
import { ContactShadows } from "@react-three/drei";

// Textura com degradê radial (feita no navegador, sem arquivo de imagem).
// stops: [[posição 0..1, "rgba(...)"], ...]
function radialTexture(stops) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  stops.forEach(([at, color]) => gradient.addColorStop(at, color));

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

const RING = "#7dd3fc";
const RING_SOFT = "#38bdf8";

// Palco do carro: sombra de contato + (opcional) o círculo luminoso no chão.
// Fica FORA do <Bounds>, senão a câmera enquadraria o palco e não o carro.
// stage vem do onStage do CarScene (medidas reais do carro).
// memo: sem isso, qualquer re-render da tela (clicar num atalho de câmera, ligar
// o Girar...) refazia a sombra, que desenha o carro inteiro duas vezes e dava
// uma travada. Agora só refaz quando o carro carrega ou as peças 3D mudam
// (shadowKey).
function CarStage({ stage, ring = true, shadowKey = "" }) {
  const textures = useMemo(() => {
    if (!ring) return null;

    return {
      disc: radialTexture([
        [0, "rgba(30,58,110,0.55)"],
        [0.7, "rgba(14,28,60,0.45)"],
        [1, "rgba(8,14,32,0)"],
      ]),
      glow: radialTexture([
        [0, "rgba(56,189,248,0)"],
        [0.6, "rgba(56,189,248,0)"],
        [0.8, "rgba(56,189,248,0.4)"],
        [0.9, "rgba(56,189,248,0.1)"],
        [1, "rgba(56,189,248,0)"],
      ]),
    };
  }, [ring]);

  useEffect(() => {
    return () => {
      textures?.disc.dispose();
      textures?.glow.dispose();
    };
  }, [textures]);

  if (!stage) return null;

  const { minY, cx, cz, length, height } = stage;
  const radius = (length / 2) * 1.28; // o círculo passa um pouco além do carro

  return (
    // mesma rotação do CarScene: o centro do carro fica no lugar certo
    <group rotation={[0, Math.PI / 8, 0]}>
      <group position={[cx, minY, cz]}>
        {ring && textures && (
          // deitado no chão (o eixo Z local vira "para cima")
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <mesh position={[0, 0, -0.003]}>
              <circleGeometry args={[radius * 1.35, 96]} />
              <meshBasicMaterial
                map={textures.disc}
                transparent
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>

            <mesh position={[0, 0, -0.002]}>
              <planeGeometry args={[radius * 2.7, radius * 2.7]} />
              <meshBasicMaterial
                map={textures.glow}
                transparent
                depthWrite={false}
                blending={AdditiveBlending}
                toneMapped={false}
              />
            </mesh>

            <mesh position={[0, 0, -0.001]}>
              <ringGeometry args={[radius * 0.985, radius, 192]} />
              <meshBasicMaterial
                color={RING}
                transparent
                opacity={0.95}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>

            <mesh position={[0, 0, -0.001]}>
              <ringGeometry args={[radius * 1.13, radius * 1.135, 192]} />
              <meshBasicMaterial
                color={RING_SOFT}
                transparent
                opacity={0.35}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        )}

        {/* A sombra é "assada": com frames={2} ela desenha 2 frames sempre que
            este componente renderiza (ao carregar o carro e quando as peças
            mudam) e depois fica parada, sem pesar na rotação. O grupo desfaz a
            rotação do pai para a sombra ficar alinhada aos eixos. */}
        <group rotation={[0, -Math.PI / 8, 0]} position={[0, 0.001, 0]}>
          <ContactShadows
            key={shadowKey}
            opacity={0.6}
            scale={length * 2.2}
            blur={2.5}
            far={Math.max(height * 3, 1)}
            frames={2}
          />
        </group>
      </group>
    </group>
  );
}

export default memo(CarStage);
