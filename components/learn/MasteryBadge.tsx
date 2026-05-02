import type { MasteryDescriptor } from '@/lib/learning-engine/mastery'

export function MasteryDot({ descriptor, className }: { descriptor: MasteryDescriptor; className?: string }) {
  return (
    <span
      title={descriptor.label}
      aria-label={descriptor.label}
      className={`inline-block h-2.5 w-2.5 rounded-full ${descriptor.color} ${className ?? ''}`}
    />
  )
}

export function MasteryBadge({ descriptor }: { descriptor: MasteryDescriptor }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border ${descriptor.textColor}`}
      style={{ borderColor: descriptor.hex + '55', background: descriptor.hex + '15' }}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${descriptor.color}`} />
      {descriptor.label}
    </span>
  )
}
