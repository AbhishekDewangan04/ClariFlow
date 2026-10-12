import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import SignalCore from './SignalCore'

/** Default export so it can be lazy-loaded: three.js stays out of the main bundle. */
export default function HeroScene({ phase, latencyMs }) {
  const wrap = useRef(null)
  const [visible, setVisible] = useState(true)

  // Stop rendering entirely while scrolled out of view.
  useEffect(() => {
    const el = wrap.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={wrap} className="absolute inset-x-0 bottom-9 top-0 cursor-grab active:cursor-grabbing select-none" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6.9], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        frameloop={visible ? 'always' : 'never'}
      >
        <SignalCore phase={phase} latencyMs={latencyMs} />
      </Canvas>
    </div>
  )
}
