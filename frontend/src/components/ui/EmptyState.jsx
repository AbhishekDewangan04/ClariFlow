export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      {Icon && (
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl" aria-hidden />
          <div className="relative grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-indigo-300">
            <Icon className="size-6" aria-hidden />
          </div>
        </div>
      )}
      <h3 className="font-display text-[16px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
