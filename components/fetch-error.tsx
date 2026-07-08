'use client'

import { AlertCircleIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FetchError({
  message = 'No se pudo cargar la información.',
  onRetry,
}: {
  message?: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertCircleIcon className="size-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCwIcon />
        Reintentar
      </Button>
    </div>
  )
}
