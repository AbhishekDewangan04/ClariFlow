import { Lock, Send } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import PreviewRibbon from './PreviewRibbon'

export default function TelegramPreview() {
  return (
    <Card liquid reveal className="overflow-hidden lg:col-span-1">
      <PreviewRibbon />
      <CardHeader title="Telegram" />
      <div className="p-5">
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-4">
          <span className="grid size-11 place-items-center rounded-xl bg-white/[0.06] text-slate-400">
            <Send className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">Connection status</p>
            <p className="flex items-center gap-1.5 text-[13px] text-slate-400">
              <Lock className="size-3" aria-hidden /> Unknown — not exposed by the backend
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
