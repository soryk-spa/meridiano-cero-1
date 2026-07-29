'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import type { ActivityTemplate, ProgramItem } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
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

type ProgramDetail = {
  id: string
  name: string
  description: string | null
  items: ProgramItem[]
}

const EMPTY_ITEM_FORM = {
  dayNumber: '1',
  time: '',
  title: '',
  location: '',
  description: '',
  requirementsMessage: '',
}

export default function AdminProgramDetailPage() {
  const { programId } = useParams<{ programId: string }>()
  const [program, setProgram] = useState<ProgramDetail | null>(null)
  const [activityTemplates, setActivityTemplates] = useState<ActivityTemplate[]>([])
  const [itemOpen, setItemOpen] = useState(false)
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [selectedActivityTemplateId, setSelectedActivityTemplateId] = useState<string | null>(null)
  const [savingItem, setSavingItem] = useState(false)
  const [itemError, setItemError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [programRes, activityTemplatesRes] = await Promise.all([
      fetch(`/api/v1/admin/programs/${programId}`),
      fetch('/api/v1/admin/activity-templates'),
    ])
    if (programRes.ok) setProgram((await programRes.json()).program)
    if (activityTemplatesRes.ok) setActivityTemplates((await activityTemplatesRes.json()).activityTemplates)
  }, [programId])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [load])

  function openCreateItem() {
    setEditingItemId(null)
    setItemForm(EMPTY_ITEM_FORM)
    setSelectedActivityTemplateId(null)
    setItemError(null)
    setItemOpen(true)
  }

  function openEditItem(item: ProgramItem) {
    setEditingItemId(item.id)
    setItemForm({
      dayNumber: String(item.dayNumber),
      time: item.time,
      title: item.title,
      location: item.location,
      description: item.description,
      requirementsMessage: item.requirementsMessage ?? '',
    })
    setSelectedActivityTemplateId(null)
    setItemError(null)
    setItemOpen(true)
  }

  function handleSelectActivityTemplate(id: string | null) {
    setSelectedActivityTemplateId(id)
    const template = activityTemplates.find((t) => t.id === id)
    if (!template) return
    setItemForm((p) => ({
      ...p,
      title: template.title,
      location: template.defaultLocation ?? p.location,
      description: template.description,
      requirementsMessage: template.requirementsMessage ?? '',
    }))
  }

  async function handleSaveItem() {
    setSavingItem(true)
    setItemError(null)
    const body: Record<string, unknown> = {
      dayNumber: Number(itemForm.dayNumber),
      time: itemForm.time,
      title: itemForm.title,
      location: itemForm.location,
      description: itemForm.description,
    }
    if (itemForm.requirementsMessage.trim()) {
      body.requirementsMessage = itemForm.requirementsMessage.trim()
    } else if (editingItemId) {
      body.requirementsMessage = null
    }
    const res = await fetch(
      editingItemId
        ? `/api/v1/admin/programs/${programId}/items/${editingItemId}`
        : `/api/v1/admin/programs/${programId}/items`,
      {
        method: editingItemId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    setSavingItem(false)
    if (res.ok) {
      setItemOpen(false)
      void load()
    } else {
      const data = await res.json().catch(() => null)
      setItemError(data?.error?.message ?? 'No se pudo guardar la actividad.')
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!window.confirm('¿Eliminar esta actividad del programa?')) return
    const res = await fetch(`/api/v1/admin/programs/${programId}/items/${itemId}`, { method: 'DELETE' })
    if (res.ok) void load()
  }

  if (!program) {
    return (
      <>
        <SiteHeader title="Programa" />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    )
  }

  const groupedByDay = Object.entries(
    program.items.reduce<Record<number, ProgramItem[]>>((groups, item) => {
      ;(groups[item.dayNumber] ??= []).push(item)
      return groups
    }, {})
  ).sort(([a], [b]) => Number(a) - Number(b))

  return (
    <>
      <SiteHeader title={program.name} subtitle={program.description ?? 'Programa reutilizable'} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Actividades del programa</CardTitle>
            <Dialog open={itemOpen} onOpenChange={setItemOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={openCreateItem}>
                  <PlusIcon />
                  Agregar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingItemId ? 'Editar actividad' : 'Nueva actividad del programa'}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Actividad de la biblioteca (opcional)</Label>
                    <Combobox
                      options={activityTemplates.map((t) => ({
                        value: t.id,
                        label: t.title,
                        description: t.defaultLocation ?? undefined,
                      }))}
                      value={selectedActivityTemplateId}
                      onSelect={handleSelectActivityTemplate}
                      placeholder="Elegir de la biblioteca…"
                      emptyLabel="Sin actividades en la biblioteca."
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="program-item-day">Día</Label>
                      <Input
                        id="program-item-day"
                        type="number"
                        min={1}
                        value={itemForm.dayNumber}
                        onChange={(e) => setItemForm((p) => ({ ...p, dayNumber: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="program-item-time">Hora</Label>
                      <Input
                        id="program-item-time"
                        placeholder="09:00"
                        value={itemForm.time}
                        onChange={(e) => setItemForm((p) => ({ ...p, time: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="program-item-title">Título</Label>
                      <Input
                        id="program-item-title"
                        value={itemForm.title}
                        onChange={(e) => setItemForm((p) => ({ ...p, title: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="program-item-location">Lugar</Label>
                    <Input
                      id="program-item-location"
                      value={itemForm.location}
                      onChange={(e) => setItemForm((p) => ({ ...p, location: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="program-item-description">Descripción</Label>
                    <Textarea
                      id="program-item-description"
                      value={itemForm.description}
                      onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="program-item-requirements">Requisitos para apoderados (opcional)</Label>
                    <Textarea
                      id="program-item-requirements"
                      placeholder="Ej: traer ropa de abrigo y llegar 15 min antes."
                      value={itemForm.requirementsMessage}
                      onChange={(e) => setItemForm((p) => ({ ...p, requirementsMessage: e.target.value }))}
                    />
                  </div>
                  {itemError ? <p className="text-sm text-destructive">{itemError}</p> : null}
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleSaveItem}
                    disabled={
                      savingItem ||
                      !itemForm.dayNumber.trim() ||
                      !itemForm.time.trim() ||
                      !itemForm.title.trim() ||
                      !itemForm.location.trim() ||
                      !itemForm.description.trim()
                    }
                  >
                    {savingItem ? 'Guardando…' : 'Guardar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {groupedByDay.length ? (
              groupedByDay.map(([day, items]) => (
                <div key={day} className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Día {day}
                  </p>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {item.time} · {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.location}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}>
                          <PencilIcon className="size-4" />
                          <span className="sr-only">Editar actividad</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2Icon className="size-4" />
                          <span className="sr-only">Eliminar actividad</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin actividades todavía.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
