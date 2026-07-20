'use client'

import { useCallback, useEffect, useState } from 'react'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import type { ActivityTemplate } from '@prisma/client'
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

const EMPTY_FORM = { title: '', defaultLocation: '', description: '', requirementsMessage: '' }

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<ActivityTemplate[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setOpen(false)
      void load()
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error?.message ?? 'No se pudo guardar la actividad.')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta actividad de la biblioteca?')) return
    const res = await fetch(`/api/v1/admin/activity-templates/${id}`, { method: 'DELETE' })
    if (res.ok) void load()
  }

  return (
    <>
      <SiteHeader
        title="Biblioteca de actividades"
        subtitle="Actividades genéricas reutilizables al armar el itinerario de una gira"
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
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {loadError && !activities ? (
            <div className="col-span-full">
              <FetchError message={loadError} onRetry={load} />
            </div>
          ) : !activities ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32 w-full" />)
          ) : activities.length ? (
            activities.map((activity) => (
              <Card key={activity.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base">{activity.title}</CardTitle>
                    {activity.defaultLocation ? (
                      <p className="mt-1 text-xs text-muted-foreground">{activity.defaultLocation}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(activity)}>
                      <PencilIcon className="size-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(activity.id)}>
                      <Trash2Icon className="size-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin actividades en la biblioteca todavía.</p>
          )}
        </div>
      </div>
    </>
  )
}
