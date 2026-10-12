const COLORS = {
  online: ['#818cf8', '#67e8f9'],
  checking: ['#fbbf24', '#fde68a'],
  offline: ['#fb7185', '#fda4af'],
}

export default function StaticOrb({ phase = 'checking' }) {
  const [a, b] = COLORS[phase] ?? COLORS.checking
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6" aria-hidden>
      <div
        className="absolute size-48 rounded-full blur-3xl opacity-30 transition-colors duration-700 pointer-events-none"
        style={{ background: a }}
      />
      <svg viewBox="0 0 400 400" className="size-[min(100%,22rem)] max-h-full">
        <defs>
          <radialGradient id="orb-core">
            <stop offset="0" stopColor={a} stopOpacity="0.95" />
            <stop offset="60%" stopColor={a} stopOpacity="0.4" />
            <stop offset="100%" stopColor={a} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="110" fill="url(#orb-core)" opacity="0.6" />
        <circle cx="200" cy="200" r="86" fill="none" stroke={b} strokeOpacity="0.6" strokeDasharray="3 8" strokeWidth="2.5" strokeLinecap="round" />
        {[150, 178, 206].map((r, i) => (
          <ellipse key={r} cx="200" cy="200" rx={r} ry={r * (0.34 + i * 0.12)} fill="none" stroke={a} strokeOpacity="0.4" transform={`rotate(${-24 + i * 38} 200 200)`} />
        ))}
        <circle cx="200" cy="200" r="28" fill={a} opacity="0.9" />
        <circle cx="200" cy="200" r="12" fill="#ffffff" opacity="0.8" />
      </svg>
    </div>
  )
}
