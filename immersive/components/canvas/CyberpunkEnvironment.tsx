'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function Particle({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const speed = useMemo(() => 0.1 + Math.random() * 0.3, [])

  useFrame((state) => {
    if (!meshRef.current) return
    
    const time = state.clock.elapsedTime * speed
    meshRef.current.position.y = position[1] + Math.sin(time) * 0.5
    meshRef.current.rotation.x = time * 0.5
    meshRef.current.rotation.y = time * 0.3
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshStandardMaterial 
        color="#00fff9" 
        emissive="#00fff9" 
        emissiveIntensity={0.5}
        transparent
        opacity={0.6}
      />
    </mesh>
  )
}

function Grid() {
  const gridRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!gridRef.current) return
    gridRef.current.position.z = (state.clock.elapsedTime * 0.5) % 2
  })

  return (
    <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[20, 20, 20, 20]} />
      <meshBasicMaterial 
        color="#00fff9" 
        wireframe 
        transparent 
        opacity={0.1}
      />
    </mesh>
  )
}

function FloatingRing({ position, scale = 1 }: { position: [number, number, number], scale?: number }) {
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh position={position} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[scale, scale * 0.1, 16, 32]} />
        <meshStandardMaterial 
          color="#ff00ff" 
          emissive="#ff00ff" 
          emissiveIntensity={0.3}
          transparent
          opacity={0.4}
        />
      </mesh>
    </Float>
  )
}

export default function CyberpunkEnvironment() {
  const particles = useMemo(() => {
    const positions: [number, number, number][] = []
    for (let i = 0; i < 30; i++) {
      positions.push([
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10 - 5
      ])
    }
    return positions
  }, [])

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#00fff9" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#ff00ff" />

      {/* Fog for depth */}
      <fog attach="fog" args={['#0a0a0f', 5, 15]} />

      {/* Floating particles */}
      {particles.map((pos, i) => (
        <Particle key={i} position={pos} />
      ))}

      {/* Grid */}
      <Grid />

      {/* Floating geometric shapes */}
      <FloatingRing position={[-3, 2, -5]} scale={1.5} />
      <FloatingRing position={[3, -1, -7]} scale={1.2} />
      
      {/* Mouse controls (subtle) */}
      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 2}
        rotateSpeed={0.3}
      />
    </>
  )
}
