import { humanize } from '../../lib/format'
import { toneOf, TONES as tones } from '../../lib/tones'

export { toneOf, tones }

export default function StatusBadge({ status, size = 'md' }) {
  const { tone } = toneOf(status)
  const t = tones[tone] ?? tones.neutral
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11.5px]' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset ${pad} ${t.pill}`}>
      <span className="relative flex size-1.5" aria-hidden>
        {tone !== 'neutral' && tone !== 'danger' && <span className={`absolute inline-flex size-full animate-ping-soft rounded-full ${t.dot}`} />}
        <span className={`relative size-1.5 rounded-full ${t.dot}`} />
      </span>
      {status ? humanize(status) : 'Unknown'}
    </span>
  )
}
