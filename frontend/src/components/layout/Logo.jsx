export default function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span
        className="relative grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 shadow-[0_0_20px_rgba(99,102,241,0.65),inset_0_1px_1px_rgba(255,255,255,0.4)]"
        aria-hidden
      >
        <svg viewBox="0 0 32 32" className="size-7">
          <path d="M7 21c3.8 0 3.8-10 9-10s5.2 10 9 10" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="16" cy="11" r="1.8" fill="#ffffff" />
        </svg>
      </span>
      <span className="font-display text-[18px] font-semibold tracking-tight text-white">ClariFlow</span>
    </div>
  )
}

