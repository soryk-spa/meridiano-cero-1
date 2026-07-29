'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarRangeIcon, PlusIcon } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { FetchError } from '@/components/fetch-error'

type ProgramRow = {
  id: string
  name: string
  description: string | null
  itemCount: number
  tripCount: number
}

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<ProgramRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    const res = await fetch('/api/v1/admin/programs')
    if (res.ok) {
      setPrograms((await res.json()).programs)
    } else {
      const data = await res.json().catch(() => null)
      setLoadError(data?.error?.message ?? 'No se pudieron cargar los programas.')
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [load])

  async function handleCreate() {
    setCreating(true)
    setError(null)
    const res = await fetch('/api/v1/admin/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description.trim() || undefined }),
    })
    setCreating(false)
    if (res.ok) {
      setName('')
      setDescription('')
      setOpen(false)
      void load()
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error?.message ?? 'No se pudo crear el programa.')
    }
  }

  return (
    <>
      <SiteHeader
        title="Programas"
        subtitle="Itinerarios reutilizables que se asignan a una o más giras"
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="xs">
                <PlusIcon />
                Nuevo programa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo programa</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="program-name">Nombre</Label>
                  <Input
                    id="program-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="BRC 107"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="program-description">Descripción (opcional)</Label>
                  <Textarea
                    id="program-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                  {creating ? 'Creando…' : 'Crear programa'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {loadError && !programs ? (
            <div className="col-span-full">
              <FetchError message={loadError} onRetry={load} />
            </div>
          ) : !programs ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32 w-full" />)
          ) : programs.length ? (
            programs.map((program) => (
              <Link key={program.id} href={`/admin/programs/${program.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/40">
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <CalendarRangeIcon size={17} />
                    </div>
                    <CardTitle className="text-base">{program.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-between text-sm">
                    <div>
                      <p className="font-semibold">{program.itemCount}</p>
                      <p className="text-muted-foreground">Actividades</p>
                    </div>
                    <div>
                      <p className="font-semibold">{program.tripCount}</p>
                      <p className="text-muted-foreground">Giras asignadas</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin programas todavía.</p>
          )}
        </div>
      </div>
    </>
  )
}
