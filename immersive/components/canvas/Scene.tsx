'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import CyberpunkEnvironment from './CyberpunkEnvironment'

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 75 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <CyberpunkEnvironment />
      </Suspense>
    </Canvas>
  )
}
