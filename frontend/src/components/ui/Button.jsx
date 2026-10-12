import { LoaderCircle } from 'lucide-react'

const variants = {
  primary:
    'bg-gradient-to-b from-indigo-400 to-indigo-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_8px_24px_-8px_rgb(99_102_241/0.8)] hover:from-indigo-300 hover:to-indigo-500 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_10px_30px_-6px_rgb(99_102_241/0.95)]',
  secondary: 'glass text-slate-100 hover:bg-white/[0.09] hover:border-edge-strong',
  ghost: 'text-slate-300 hover:bg-white/[0.07] hover:text-white',
}
const sizes = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-[15px]',
}

export default function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  children,
  disabled,
  ...props
}) {
  const isButton = Tag === 'button'
  return (
    <Tag
      {...(isButton ? { type: 'button', disabled: disabled || loading } : {})}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : Icon ? <Icon className="size-4" aria-hidden /> : null}
      {children}
    </Tag>
  )
}
