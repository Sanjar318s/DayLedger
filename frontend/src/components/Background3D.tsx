import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

interface FloatingShapeProps {
  position: [number, number, number]
  color: string
  speed: number
  rotationSpeed: number
  scale: number
  geometryType: 'icosahedron' | 'octahedron' | 'tetrahedron'
  index: number
}

const PALETTE = ['#6366f1', '#8b5cf6', '#06b6d4'] as const

function getGeometry(type: string) {
  switch (type) {
    case 'icosahedron':
      return <icosahedronGeometry args={[1, 0]} />
    case 'octahedron':
      return <octahedronGeometry args={[1, 0]} />
    case 'tetrahedron':
      return <tetrahedronGeometry args={[1, 0]} />
    default:
      return <icosahedronGeometry args={[1, 0]} />
  }
}

function MouseTracker({ mouseRef }: { mouseRef: React.MutableRefObject<THREE.Vector2> }) {
  const { viewport } = useThree()

  useFrame((state) => {
    const x = (state.pointer.x * viewport.width) / 2
    const y = (state.pointer.y * viewport.height) / 2
    mouseRef.current.set(x * 0.05, y * 0.05)
  })

  return null
}

function FloatingShape({
  position,
  color,
  speed,
  rotationSpeed,
  scale,
  geometryType,
  index,
}: FloatingShapeProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const mouseRef = useRef(new THREE.Vector2(0, 0))
  const initialPos = useMemo(() => new THREE.Vector3(...position), [position])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x += delta * rotationSpeed * 0.5
    meshRef.current.rotation.y += delta * rotationSpeed * 0.3

    const t = performance.now() * 0.001 * speed
    meshRef.current.position.x = initialPos.x + Math.sin(t + index * 0.5) * 0.3
    meshRef.current.position.y = initialPos.y + Math.cos(t * 0.8 + index * 0.7) * 0.4
    meshRef.current.position.z = initialPos.z + Math.sin(t * 0.6 + index * 0.3) * 0.2
  })

  return (
    <Float speed={speed * 0.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position} scale={scale}>
        {getGeometry(geometryType)}
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.35}
          roughness={0.8}
          metalness={0.2}
          wireframe={index % 3 === 0}
        />
      </mesh>
    </Float>
  )
}

function Particles({ isDark }: { isDark: boolean }) {
  const mouseRef = useRef(new THREE.Vector2(0, 0))
  const groupRef = useRef<THREE.Group>(null!)

  const shapes = useMemo(() => {
    const geometryTypes: Array<'icosahedron' | 'octahedron' | 'tetrahedron'> = [
      'icosahedron',
      'octahedron',
      'tetrahedron',
    ]
    return Array.from({ length: 24 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8 - 2,
      ] as [number, number, number],
      color: PALETTE[i % PALETTE.length],
      speed: 0.3 + Math.random() * 0.5,
      rotationSpeed: 0.2 + Math.random() * 0.6,
      scale: 0.08 + Math.random() * 0.18,
      geometryType: geometryTypes[i % geometryTypes.length],
      index: i,
    }))
  }, [])

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.position.x += (mouseRef.current.x - groupRef.current.position.x) * 0.02
    groupRef.current.position.y += (mouseRef.current.y - groupRef.current.position.y) * 0.02
  })

  return (
    <>
      <MouseTracker mouseRef={mouseRef} />
      <group ref={groupRef}>
        {shapes.map((shape, i) => (
          <FloatingShape key={i} {...shape} />
        ))}
      </group>
      <ambientLight intensity={isDark ? 0.4 : 0.6} />
      <pointLight position={[5, 5, 5]} intensity={0.5} color="#6366f1" />
      <pointLight position={[-5, -3, 3]} intensity={0.3} color="#06b6d4" />
    </>
  )
}

function Background3DCanvas() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const check = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setIsDark(theme !== 'light')
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <Particles isDark={isDark} />
      </Canvas>
    </div>
  )
}

const Background3D: React.FC = React.memo(function Background3D() {
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) setSupported(false)
    } catch {
      setSupported(false)
    }
  }, [])

  if (!supported) return null

  try {
    return <Background3DCanvas />
  } catch {
    return null
  }
})

export default Background3D
