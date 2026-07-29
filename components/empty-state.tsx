import type { ComponentType } from 'react'

type EmptyStateIcon = ComponentType<{ className?: string }>

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: EmptyStateIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
