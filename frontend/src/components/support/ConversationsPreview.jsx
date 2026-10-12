import { MessageSquare } from 'lucide-react'
import { Card } from '../ui/Card'
import PreviewRibbon from './PreviewRibbon'

// Deliberately generic placeholder content. Nothing here is, or pretends to be, a real conversation.
const LIST = [
  { id: 1, name: 'Sample customer A', preview: 'Sample message preview…', active: true },
  { id: 2, name: 'Sample customer B', preview: 'Sample message preview…' },
  { id: 3, name: 'Sample customer C', preview: 'Sample message preview…' },
]
const THREAD = [
  { from: 'customer', text: 'Sample customer message.' },
  { from: 'agent', text: 'Sample agent reply.' },
  { from: 'customer', text: 'Another sample customer message.' },
]

export default function ConversationsPreview() {
  return (
    <Card liquid reveal className="overflow-hidden lg:col-span-2">
      <PreviewRibbon />
      <div className="grid min-h-[22rem] md:grid-cols-5">
        <div className="border-b border-edge md:col-span-2 md:border-b-0 md:border-r">
          <p className="px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-slate-400">Conversations</p>
          <ul>
            {LIST.map((c) => (
              <li key={c.id} aria-disabled="true" className={`flex cursor-not-allowed items-center gap-3 px-5 py-3.5 ${c.active ? 'bg-indigo-500/10' : ''}`}>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-slate-400">
                  <MessageSquare className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">{c.name}</p>
                  <p className="truncate text-[13px] text-slate-400">{c.preview}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col md:col-span-3">
          <div className="flex-1 space-y-3 p-5">
            {THREAD.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'agent' ? 'justify-end' : ''}`}>
                <p
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.from === 'agent' ? 'rounded-br-md bg-indigo-500/25 text-indigo-100' : 'rounded-bl-md bg-white/[0.07] text-slate-300'
                  }`}
                >
                  {m.text}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-edge p-4">
            <input
              disabled
              aria-label="Reply (disabled in preview)"
              placeholder="Replying is disabled in preview"
              className="h-10 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
