'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarRangeIcon, MoreVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/empty-state'
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
      toast.success('Programa creado.')
      setName('')
      setDescription('')
      setOpen(false)
      void load()
    } else {
      const data = await res.json().catch(() => null)
      const message = data?.error?.message ?? 'No se pudo crear el programa.'
      setError(message)
      toast.error(message)
    }
  }

  async function handleDelete(program: ProgramRow) {
    if (!window.confirm(`¿Eliminar el programa "${program.name}"? Las giras que ya lo aplicaron no se ven afectadas.`)) {
      return
    }
    const res = await fetch(`/api/v1/admin/programs/${program.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Programa eliminado.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo eliminar el programa.')
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
        {loadError && !programs ? (
          <FetchError message={loadError} onRetry={load} />
        ) : !programs ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Actividades</TableHead>
                  <TableHead>Giras asignadas</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.length ? (
                  programs.map((program) => (
                    <TableRow key={program.id} className="h-16">
                      <TableCell>
                        <Link href={`/admin/programs/${program.id}`} className="flex items-center gap-3 font-medium hover:underline">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                            <CalendarRangeIcon size={15} />
                          </div>
                          {program.name}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {program.description ?? '—'}
                      </TableCell>
                      <TableCell>{program.itemCount}</TableCell>
                      <TableCell>{program.tripCount}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                              <MoreVerticalIcon />
                              <span className="sr-only">Abrir menú</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onSelect={() => handleDelete(program)}
                            >
                              <Trash2Icon className="size-4" />
                              Eliminar programa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <EmptyState
                        icon={CalendarRangeIcon}
                        title="Sin programas todavía."
                        description="Crea un programa reutilizable para poblar el itinerario de una gira automáticamente."
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </>
  )
}
