import { Check, Copy } from 'lucide-react'
import { useCopy } from '../../hooks/useCopy'

export default function CopyButton({ value, label = 'Copy' }) {
  const { copied, copy } = useCopy()
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      aria-label={copied ? 'Copied to clipboard' : `${label} ${value}`}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-colors ${
        copied
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.09] hover:text-white'
      }`}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  )
}
