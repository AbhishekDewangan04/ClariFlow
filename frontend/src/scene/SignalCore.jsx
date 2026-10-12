import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, MathUtils } from 'three'

// Colour tells the real API state: online / checking / offline.
const PALETTE = {
  online: { points: '#67e8f9', core: '#818cf8', ring: '#a5b4fc', ambient: '#38bdf8' },
  checking: { points: '#fde68a', core: '#fbbf24', ring: '#fcd34d', ambient: '#fef08a' },
  offline: { points: '#fda4af', core: '#fb7185', ring: '#fda4af', ambient: '#f43f5e' },
}

const RINGS = [
  { r: 1.62, tilt: [1.15, 0.2], speed: 0.5, size: 0.055 },
  { r: 1.95, tilt: [0.5, -0.7], speed: -0.34, size: 0.045 },
  { r: 2.28, tilt: [1.05, 0.62], speed: 0.24, size: 0.042 },
]

const CORE_POINTS = 1100
const AMBIENT_POINTS = 260
const RADIUS = 1.22

export default function SignalCore({ phase, latencyMs }) {
  const tilt = useRef()
  const spin = useRef()
  const core = useRef()
  const coreMat = useRef()
  const haloMat = useRef()
  const ptsMat = useRef()
  const ambientMat = useRef()
  const wireMat = useRef()
  const ringRefs = useRef([])
  const ringMats = useRef([])

  // User interactive drag state
  const isDragging = useRef(false)
  const pointerStart = useRef({ x: 0, y: 0 })
  const dragRotation = useRef({ x: 0.28, y: 0 })
  const velocity = useRef({ x: 0, y: 0 })

  // Core Fibonacci sphere positions
  const positions = useMemo(() => {
    const arr = new Float32Array(CORE_POINTS * 3)
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < CORE_POINTS; i++) {
      const y = 1 - (i / (CORE_POINTS - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const th = golden * i
      arr.set([Math.cos(th) * r * RADIUS, y * RADIUS, Math.sin(th) * r * RADIUS], i * 3)
    }
    return arr
  }, [])

  // Floating ambient depth dust
  const ambientPositions = useMemo(() => {
    const arr = new Float32Array(AMBIENT_POINTS * 3)
    for (let i = 0; i < AMBIENT_POINTS; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const r = 2.1 + Math.random() * 1.5 // depth shell
      const sinPhi = Math.sin(phi)
      arr.set([
        r * sinPhi * Math.cos(theta),
        r * sinPhi * Math.sin(theta),
        r * Math.cos(phi),
      ], i * 3)
    }
    return arr
  }, [])

  const target = useMemo(() => ({ points: new Color(), core: new Color(), ring: new Color(), ambient: new Color() }), [])
  useEffect(() => {
    const p = PALETTE[phase] ?? PALETTE.checking
    target.points.set(p.points)
    target.core.set(p.core)
    target.ring.set(p.ring)
    target.ambient.set(p.ambient)
  }, [phase, target])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const online = phase === 'online'
    const offline = phase === 'offline'

    // Mouse responsiveness & drag momentum
    if (!isDragging.current) {
      dragRotation.current.x = MathUtils.damp(dragRotation.current.x, 0.28 - state.pointer.y * 0.45, 3.5, dt)
      dragRotation.current.y += dt * (offline ? 0.05 : phase === 'checking' ? 0.22 : 0.14) + state.pointer.x * 0.008
    } else {
      dragRotation.current.x += velocity.current.x
      dragRotation.current.y += velocity.current.y
      velocity.current.x *= 0.92
      velocity.current.y *= 0.92
    }

    if (tilt.current) {
      tilt.current.rotation.x = MathUtils.damp(tilt.current.rotation.x, dragRotation.current.x, 6, dt)
      tilt.current.rotation.y = MathUtils.damp(tilt.current.rotation.y, dragRotation.current.y, 6, dt)
    }

    // Pulse rate follows measured latency
    const hz = online && latencyMs ? MathUtils.clamp(1.4 - latencyMs / 400, 0.35, 1.3) : phase === 'checking' ? 1.6 : 0.25
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * hz)
    const amp = offline ? 0.02 : 0.08

    if (core.current) {
      core.current.scale.setScalar(0.44 + pulse * amp)
    }
    if (coreMat.current) {
      coreMat.current.opacity = offline ? 0.35 : 0.65 + pulse * 0.3
      coreMat.current.color.lerp(target.core, 0.06)
    }
    if (haloMat.current) {
      haloMat.current.opacity = offline ? 0.04 : 0.12 + pulse * 0.09
      haloMat.current.color.lerp(target.core, 0.06)
    }
    if (ptsMat.current) {
      ptsMat.current.color.lerp(target.points, 0.06)
      ptsMat.current.opacity = offline ? 0.4 : 0.95
    }
    if (ambientMat.current) {
      ambientMat.current.color.lerp(target.ambient, 0.06)
      ambientMat.current.opacity = 0.35 + 0.15 * Math.sin(t * 1.5)
    }
    if (wireMat.current) {
      wireMat.current.color.lerp(target.core, 0.06)
    }

    ringMats.current.forEach((m) => m?.color.lerp(target.ring, 0.06))

    RINGS.forEach((ring, i) => {
      const g = ringRefs.current[i]
      if (g) g.rotation.z += dt * ring.speed * (offline ? 0.15 : 1)
    })
  })

  // Pointer drag interaction handlers
  const onPointerDown = (e) => {
    isDragging.current = true
    pointerStart.current = { x: e.clientX, y: e.clientY }
    velocity.current = { x: 0, y: 0 }
  }

  const onPointerMove = (e) => {
    if (!isDragging.current) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    pointerStart.current = { x: e.clientX, y: e.clientY }
    velocity.current = { x: -dy * 0.005, y: dx * 0.005 }
    dragRotation.current.x += -dy * 0.005
    dragRotation.current.y += dx * 0.005
  }

  const onPointerUp = () => {
    isDragging.current = false
  }

  return (
    <group
      ref={tilt}
      rotation={[0.28, 0, 0]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Outer ambient depth particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ambientPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={ambientMat}
          size={0.024}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          color="#38bdf8"
        />
      </points>

      <group ref={spin}>
        {/* Core Fibonacci points */}
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={ptsMat}
            size={0.038}
            sizeAttenuation
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            color="#67e8f9"
          />
        </points>
        <mesh>
          <icosahedronGeometry args={[0.86, 1]} />
          <meshBasicMaterial ref={wireMat} wireframe transparent opacity={0.35} color="#818cf8" />
        </mesh>
      </group>

      {/* Luminous halo */}
      <mesh scale={0.96}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial ref={haloMat} transparent opacity={0.14} depthWrite={false} blending={AdditiveBlending} color="#818cf8" />
      </mesh>

      {/* Inner energy nucleus */}
      <mesh ref={core}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial ref={coreMat} transparent depthWrite={false} blending={AdditiveBlending} color="#818cf8" />
      </mesh>

      {/* Orbiting harmonic rings */}
      {RINGS.map((ring, i) => (
        <group key={i} rotation={[ring.tilt[0], ring.tilt[1], 0]}>
          <group ref={(el) => (ringRefs.current[i] = el)}>
            <mesh>
              <torusGeometry args={[ring.r, 0.007, 6, 180]} />
              <meshBasicMaterial ref={(el) => (ringMats.current[i] = el)} transparent opacity={0.65} color="#a5b4fc" />
            </mesh>
            <mesh position={[ring.r, 0, 0]}>
              <sphereGeometry args={[ring.size, 12, 12]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}
