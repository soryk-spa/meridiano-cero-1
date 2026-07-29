'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PlusIcon, SchoolIcon, SearchIcon } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { FetchError } from '@/components/fetch-error'

type SchoolRow = {
  id: string
  name: string
  tripCount: number
  activeTripCount: number
  studentCount: number
}

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<SchoolRow[] | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoadError(null)
    const res = await fetch('/api/v1/admin/schools')
    if (res.ok) {
      setSchools((await res.json()).schools)
    } else {
      const data = await res.json().catch(() => null)
      setLoadError(data?.error?.message ?? 'No se pudieron cargar los colegios.')
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
    const res = await fetch('/api/v1/admin/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setCreating(false)
    if (res.ok) {
      toast.success('Colegio creado.')
      setName('')
      setOpen(false)
      void load()
    } else {
      const data = await res.json().catch(() => null)
      const message = data?.error?.message ?? 'No se pudo crear el colegio.'
      setError(message)
      toast.error(message)
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (schools ?? []).filter((school) => !query || school.name.toLowerCase().includes(query))
  }, [schools, search])

  return (
    <>
      <SiteHeader
        title="Colegios"
        subtitle="Cuentas institucionales en la plataforma"
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="xs">
                <PlusIcon />
                Nuevo colegio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo colegio</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="school-name">Nombre</Label>
                <Input id="school-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Colegio San Ignacio" />
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                  {creating ? 'Creando…' : 'Crear colegio'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {loadError && !schools ? (
          <FetchError message={loadError} onRetry={load} />
        ) : !schools ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="relative max-w-xs">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Giras totales</TableHead>
                    <TableHead>En terreno</TableHead>
                    <TableHead>Alumnos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length ? (
                    filtered.map((school) => (
                      <TableRow key={school.id} className="h-16">
                        <TableCell className="flex items-center gap-3 font-medium">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                            <SchoolIcon size={15} />
                          </div>
                          {school.name}
                        </TableCell>
                        <TableCell>{school.tripCount}</TableCell>
                        <TableCell>{school.activeTripCount}</TableCell>
                        <TableCell>{school.studentCount}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <EmptyState
                          icon={SchoolIcon}
                          title={schools.length ? 'Sin resultados para esta búsqueda.' : 'Sin colegios registrados.'}
                          description={schools.length ? 'Prueba con otro nombre.' : 'Crea el primer colegio para empezar.'}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </>
  )
}
