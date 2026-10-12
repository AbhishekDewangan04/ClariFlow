import { FileWarning, SearchX, ServerCrash, TriangleAlert, WifiOff } from 'lucide-react'
import Button from './Button'

const byKind = {
  database_unavailable: {
    icon: ServerCrash,
    title: 'Database unavailable',
    hint: 'The backend is running, but PostgreSQL is not connected. Ensure your database is started.',
  },
  unreachable: { icon: ServerCrash, title: "Can't reach the API", hint: 'Make sure the backend is running at http://localhost:5000, then try again.' },
  network: { icon: WifiOff, title: "You're offline", hint: 'Check your internet connection and try again.' },
  timeout: { icon: WifiOff, title: 'The request timed out', hint: 'The server took too long to respond.' },
  server: { icon: ServerCrash, title: 'The server hit a problem', hint: 'This is on the backend side. Try again in a moment.' },
  invalid: { icon: FileWarning, title: 'Unexpected response', hint: 'The API replied, but not in the format ClariFlow expects.' },
  not_found: { icon: SearchX, title: 'Not found', hint: null },
}
const fallback = { icon: TriangleAlert, title: 'Something went wrong', hint: null }

export default function ErrorState({ error, title, hint, onRetry, retrying = false, action, className = '' }) {
  const cfg = byKind[error?.kind] ?? fallback
  const Icon = cfg.icon
  const calm = error?.kind === 'not_found'
  return (
    <div role="alert" className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <div className="relative mb-5">
        <div className={`absolute inset-0 rounded-2xl blur-xl ${calm ? 'bg-indigo-500/25' : 'bg-rose-500/25'}`} aria-hidden />
        <div
          className={`relative grid size-14 place-items-center rounded-2xl border bg-white/[0.04] ${
            calm ? 'border-indigo-300/20 text-indigo-300' : 'border-rose-400/25 text-rose-300'
          }`}
        >
          <Icon className="size-6" aria-hidden />
        </div>
      </div>
      <h3 className="font-display text-[16px] font-semibold text-ink">{title ?? cfg.title}</h3>
      {error?.message && !calm && <p className="mt-1.5 max-w-md text-sm text-slate-300">{error.message}</p>}
      {(hint ?? cfg.hint) && <p className="mt-1.5 max-w-md text-[13px] text-slate-400">{hint ?? cfg.hint}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying}>
            Try again
          </Button>
        )}
        {action}
      </div>
    </div>
  )
}
