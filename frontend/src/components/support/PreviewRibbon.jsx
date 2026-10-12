import { FlaskConical } from 'lucide-react'

export default function PreviewRibbon() {
  return (
    <div className="flex items-center gap-2 border-b border-amber-400/20 bg-[repeating-linear-gradient(135deg,rgb(251_191_36/0.10),rgb(251_191_36/0.10)_10px,rgb(251_191_36/0.04)_10px,rgb(251_191_36/0.04)_20px)] px-5 py-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-amber-300">
      <FlaskConical className="size-3.5" aria-hidden /> Preview · sample content · not live data
    </div>
  )
}
