'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardListIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { ActivityTemplate } from '@prisma/client'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/empty-state'
import { FetchError } from '@/components/fetch-error'
import { MultiSelectFilter } from '@/components/multi-select-filter'
import { KNOWN_DESTINATIONS } from '@/lib/destinations'

const EMPTY_FORM = { title: '', destination: '', defaultLocation: '', description: '', requirementsMessage: '' }
const NO_DESTINATION = 'none'

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<ActivityTemplate[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [destinationFilter, setDestinationFilter] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoadError(null)
    const res = await fetch('/api/v1/admin/activity-templates')
    if (res.ok) {
      setActivities((await res.json()).activityTemplates)
    } else {
      const data = await res.json().catch(() => null)
      setLoadError(data?.error?.message ?? 'No se pudo cargar la biblioteca de actividades.')
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [load])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
    setOpen(true)
  }

  function openEdit(activity: ActivityTemplate) {
    setEditingId(activity.id)
    setForm({
      title: activity.title,
      destination: activity.destination ?? '',
      defaultLocation: activity.defaultLocation ?? '',
      description: activity.description,
      requirementsMessage: activity.requirementsMessage ?? '',
    })
    setError(null)
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const body = {
      title: form.title,
      description: form.description,
      destination: form.destination.trim() || (editingId ? null : undefined),
      defaultLocation: form.defaultLocation.trim() || (editingId ? null : undefined),
      requirementsMessage: form.requirementsMessage.trim() || (editingId ? null : undefined),
    }
    const res = await fetch(
      editingId ? `/api/v1/admin/activity-templates/${editingId}` : '/api/v1/admin/activity-templates',
      {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    setSaving(false)
    if (res.ok) {
      toast.success(editingId ? 'Actividad actualizada.' : 'Actividad creada.')
      setOpen(false)
      void load()
    } else {
      const data = await res.json().catch(() => null)
      const message = data?.error?.message ?? 'No se pudo guardar la actividad.'
      setError(message)
      toast.error(message)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta actividad de la biblioteca?')) return
    const res = await fetch(`/api/v1/admin/activity-templates/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Actividad eliminada.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo eliminar la actividad.')
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (activities ?? []).filter((activity) => {
      const matchesSearch =
        !query ||
        activity.title.toLowerCase().includes(query) ||
        (activity.defaultLocation ?? '').toLowerCase().includes(query)
      const matchesDestination = destinationFilter.length === 0 || destinationFilter.includes(activity.destination ?? '')
      return matchesSearch && matchesDestination
    })
  }, [activities, search, destinationFilter])

  return (
    <>
      <SiteHeader
        title="Biblioteca de actividades"
        subtitle="Actividades genéricas reutilizables al armar el itinerario de un grupo"
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="xs" onClick={openCreate}>
                <PlusIcon />
                Nueva actividad
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar actividad' : 'Nueva actividad genérica'}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="activity-title">Título</Label>
                    <Input
                      id="activity-title"
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="activity-location">Lugar por defecto (opcional)</Label>
                    <Input
                      id="activity-location"
                      value={form.defaultLocation}
                      onChange={(e) => setForm((p) => ({ ...p, defaultLocation: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label>Destino (opcional)</Label>
                    <Select
                      value={form.destination || NO_DESTINATION}
                      onValueChange={(value) =>
                        setForm((p) => ({ ...p, destination: value === NO_DESTINATION ? '' : value }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Cualquier destino" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_DESTINATION}>Cualquier destino</SelectItem>
                        {KNOWN_DESTINATIONS.map((d) => (
                          <SelectItem key={d.id} value={d.label}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="activity-description">Descripción</Label>
                  <Textarea
                    id="activity-description"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="activity-requirements">Requisitos para apoderados (opcional)</Label>
                  <Textarea
                    id="activity-requirements"
                    placeholder="Ej: traer ropa de abrigo y llegar 15 min antes."
                    value={form.requirementsMessage}
                    onChange={(e) => setForm((p) => ({ ...p, requirementsMessage: e.target.value }))}
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim() || !form.description.trim()}
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {loadError && !activities ? (
          <FetchError message={loadError} onRetry={load} />
        ) : !activities ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative max-w-xs">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título o lugar…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <MultiSelectFilter
                options={KNOWN_DESTINATIONS.map((d) => d.label)}
                selected={destinationFilter}
                onChange={setDestinationFilter}
                placeholder="Destino"
                className="sm:w-56"
              />
            </div>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Lugar por defecto</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length ? (
                    filtered.map((activity) => (
                      <TableRow key={activity.id} className="h-16">
                        <TableCell className="font-medium">{activity.title}</TableCell>
                        <TableCell className="text-muted-foreground">{activity.destination ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{activity.defaultLocation ?? '—'}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {activity.description}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(activity)}>
                              <PencilIcon className="size-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(activity.id)}>
                              <Trash2Icon className="size-4" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <EmptyState
                          icon={ClipboardListIcon}
                          title={activities.length ? 'Sin resultados para esta búsqueda.' : 'Sin actividades en la biblioteca todavía.'}
                          description={activities.length ? 'Prueba con otro título o lugar.' : 'Crea la primera actividad reutilizable.'}
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
