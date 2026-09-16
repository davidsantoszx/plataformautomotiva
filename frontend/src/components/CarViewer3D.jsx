import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  Bounds,
  ContactShadows,
  Environment,
  OrbitControls,
  useGLTF,
} from '@react-three/drei'

function CarModel({ modelUrl }) {
  const { scene } = useGLTF(modelUrl)

  return (
    <primitive
      object={scene}
      scale={1}
    />
  )
}

function CarPartModel({
  modelUrl,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) {
  const { scene } = useGLTF(modelUrl)

  return (
    <primitive
      object={scene.clone()}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  )
}

function CarScene({ modelUrl, parts }) {
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

      <ContactShadows
        position={[0, -0.75, 0]}
        opacity={0.55}
        scale={8}
        blur={2.5}
        far={4}
      />
    </>
  )
}

export default function CarViewer3D({
  modelUrl,
  parts = [],
}) {
  if (!modelUrl) {
    return (
      <section className="car-viewer-3d">
        <div className="car-viewer-empty">
          <span>VISUALIZAÇÃO 3D</span>

          <p>
            Modelo 3D do veículo ainda não disponível.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="car-viewer-3d">
      <div className="car-viewer-label">
        VISUALIZAÇÃO 3D
      </div>

      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          position: [4, 2, 6],
          fov: 38,
        }}
        gl={{
          antialias: true,
          toneMappingExposure: 1.1,
        }}
      >
        <color
          attach="background"
          args={['#07090b']}
        />

        <ambientLight intensity={0.35} />

        <directionalLight
          position={[5, 7, 5]}
          intensity={2}
          castShadow
        />

        <directionalLight
          position={[-5, 3, -3]}
          intensity={1.2}
        />

        <Suspense fallback={null}>
          <Environment
            preset="studio"
            environmentIntensity={0.8}
          />

          <Bounds
            fit
            clip
            observe
            margin={1.3}
          >
            <CarScene
              modelUrl={modelUrl}
              parts={parts}
            />
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
    </section>
  )
}