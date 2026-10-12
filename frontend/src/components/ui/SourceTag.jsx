import { FlaskConical, HardDrive, Radio } from 'lucide-react'

const kinds = {
  live: { label: 'Live', icon: Radio, cls: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' },
  device: { label: 'Local', icon: HardDrive, cls: 'border-white/10 bg-white/[0.05] text-slate-300' },
  down: { label: 'Down', icon: Radio, cls: 'border-rose-400/30 bg-rose-400/10 text-rose-300' },
  preview: { label: 'Preview', icon: FlaskConical, cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300' },
}

/** Marks where information comes from, so nothing mock is ever mistaken for live data. */
export default function SourceTag({ kind = 'live', label, className = '' }) {
  const k = kinds[kind]
  const Icon = k.icon
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${k.cls} ${className}`}
    >
      <Icon className="size-3" aria-hidden />
      {label ?? k.label}
    </span>
  )
}
