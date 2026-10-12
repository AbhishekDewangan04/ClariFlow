import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import Button from '../ui/Button'

export default function OrderSearchForm({ large = false, autoFocus = false }) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Enter an order number to search.')
      return
    }
    setError('')
    navigate(`/orders/${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={submit} noValidate role="search" className="w-full">
      <div className={`flex flex-col gap-2.5 ${large ? 'sm:flex-row sm:gap-2.5' : ''}`}>
        <div className="group relative flex-1">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 size-4"
              aria-hidden
            />
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                if (error) setError('')
              }}
              autoFocus={autoFocus}
              autoComplete="off"
              spellCheck={false}
              placeholder="Order number (e.g. ORD-TEST-200)"
              aria-label="Order number"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'order-search-error' : undefined}
              className={`w-full rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md pl-10 pr-4 font-mono text-ink outline-none transition placeholder:font-sans placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/25 ${
                error ? 'border-rose-400/60' : 'border-white/10'
              } ${large ? 'h-11 text-sm' : 'h-10 text-sm'}`}
            />
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(99,102,241,0.5)] transition hover:brightness-110 active:scale-[0.98]"
        >
          Find order
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
      {error && (
        <p id="order-search-error" role="alert" className="mt-2.5 text-[13px] font-medium text-rose-300">
          {error}
        </p>
      )}
    </form>
  )
}
