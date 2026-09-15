import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  Center,
  Environment,
  OrbitControls,
  useGLTF,
} from '@react-three/drei'

function CarModel({ modelUrl }) {
  const { scene } = useGLTF(modelUrl)

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  )
}

export default function CarViewer3D({
  modelUrl,
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
      <Canvas
        camera={{
          position: [4, 2, 6],
          fov: 45,
        }}
      >
        <ambientLight intensity={0.8} />

        <Suspense fallback={null}>
          <CarModel modelUrl={modelUrl} />

          <Environment preset="studio" />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={12}
        />
      </Canvas>
    </section>
  )
}