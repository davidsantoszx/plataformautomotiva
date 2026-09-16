import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  OrbitControls,
  useGLTF,
} from '@react-three/drei'

function CarModel({ modelUrl }) {
  const { scene } = useGLTF(modelUrl)

  return (
    <group rotation={[0, Math.PI / 8, 0]}>
      <primitive
        object={scene}
        scale={1}
      />
    </group>
  )
}

export default function CarViewer3D({ modelUrl }) {
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
          position: [4.5, 2.1, 6.5],
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

          <CarModel modelUrl={modelUrl} />

          <ContactShadows
            position={[0, -0.75, 0]}
            opacity={0.55}
            scale={8}
            blur={2.5}
            far={4}
          />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={10}
          minPolarAngle={Math.PI / 4.5}
          maxPolarAngle={Math.PI / 2.05}
          rotateSpeed={0.7}
          zoomSpeed={0.7}
        />
      </Canvas>
    </section>
  )
}