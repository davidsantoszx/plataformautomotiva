import { Suspense, useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Bounds } from "@react-three/drei";
import CarScene, { SceneLights } from "./CarScene";

// ---- ângulo padrão (usado nas capas) e enquadramento ----
const AZIMUTH_DEG = 250;   // giro ao redor do carro. Ajuste este valor
const ELEVATION_DEG = 14; // altura da câmera (0 = rente ao chão)
const CAMERA_DISTANCE = 5; // o Bounds reajusta, só mantém a direção
const CAMERA_FOV = 30;
const FIT_MARGIN = 0.7;   // maior = carro menor na imagem
const JPEG_QUALITY = 0.85;

function cameraPosition(azimuthDeg, elevationDeg) {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;

  return [
    Math.sin(az) * Math.cos(el) * CAMERA_DISTANCE,
    Math.sin(el) * CAMERA_DISTANCE,
    Math.cos(az) * Math.cos(el) * CAMERA_DISTANCE,
  ];
}

function Capturer({ onCapture, mimeType, quality }) {
  const { gl, scene, camera } = useThree();
  const callbackRef = useRef(onCapture);
  callbackRef.current = onCapture;

  useEffect(() => {
    let frames = 0;
    let raf;

    // espera alguns frames para o Bounds enquadrar e a luz assentar
    function tick() {
      frames += 1;

      if (frames < 10) {
        raf = requestAnimationFrame(tick);
        return;
      }

      gl.render(scene, camera);
      callbackRef.current(gl.domElement.toDataURL(mimeType, quality));
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gl, scene, camera, mimeType, quality]);

  return null;
}

// Sem props extras, gera a capa do projeto (JPEG, ângulo padrão, tamanho do
// CSS de .cover-capture). Com width/height, gera uma imagem maior; com
// azimuth/elevation, escolhe o ângulo. É assim que o Pro exporta a imagem em
// HD (ex.: 1920x1080, PNG, vista lateral).
export default function CoverCapture({
  modelUrl,
  parts = [],
  onCapture,
  width,
  height,
  azimuth = AZIMUTH_DEG,
  elevation = ELEVATION_DEG,
  mimeType = "image/jpeg",
  quality = JPEG_QUALITY,
  paint = null,
}) {
  const doneRef = useRef(false);

  function finish(image) {
    if (doneRef.current) return;
    doneRef.current = true;
    onCapture(image);
  }

  // se algo travar, não prende o usuário na tela
  useEffect(() => {
    const timer = setTimeout(() => finish(null), 12000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="cover-capture"
      aria-hidden="true"
      style={width && height ? { width, height } : undefined}
    >
      <Canvas
        dpr={1}
        camera={{
          position: cameraPosition(azimuth, elevation),
          fov: CAMERA_FOV,
        }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={["#07090b"]} />

        <Suspense fallback={null}>
          <SceneLights />
          <Bounds fit clip margin={FIT_MARGIN}>
            <CarScene
              modelUrl={modelUrl}
              parts={parts}
              paint={paint}
            />
          </Bounds>
          <Capturer
            onCapture={finish}
            mimeType={mimeType}
            quality={quality}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
