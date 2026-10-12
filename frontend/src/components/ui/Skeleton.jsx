export default function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden
      className={`animate-shimmer rounded-md bg-[linear-gradient(90deg,rgb(255_255_255/0.04)_25%,rgb(255_255_255/0.1)_50%,rgb(255_255_255/0.04)_75%)] bg-[length:200%_100%] ${className}`}
    />
  )
}
