'use client'

import { useState } from 'react'
import type { ActivityTemplate } from '@prisma/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'

export type ActivityItemValues = {
  dayNumber: number
  time: string
  title: string
  location: string
  description: string
  requirementsMessage: string | null
}

export type ActivityItemEditing = ActivityItemValues & { id: string }

const EMPTY_FORM = {
  dayNumber: '1',
  time: '',
  title: '',
  location: '',
  description: '',
  requirementsMessage: '',
}

/**
 * Shared by the trip itinerary editor and the program item editor — the only real
 * difference between the two is the day picker: a Select bounded by the trip's
 * totalDays, or a free-form number input for a program (which has no fixed length).
 */
export function ActivityItemSheet({
  open,
  onOpenChange,
  totalDays,
  activityTemplates,
  editingItem,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalDays?: number
  activityTemplates: ActivityTemplate[]
  editingItem: ActivityItemEditing | null
  onSubmit: (values: ActivityItemValues, editingItemId: string | null) => Promise<{ ok: boolean; error?: string }>
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedActivityTemplateId, setSelectedActivityTemplateId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ActivityItemSheet itself never unmounts (only its `open` prop toggles), so the
  // form has to be synced explicitly whenever the sheet opens — a lazy useState
  // initializer only runs once, on ActivityItemSheet's own first mount. Adjusting
  // state during render (rather than in an effect) avoids an extra post-paint
  // render pass — see https://react.dev/learn/you-might-not-need-an-effect.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setForm(
        editingItem
          ? {
              dayNumber: String(editingItem.dayNumber),
              time: editingItem.time,
              title: editingItem.title,
              location: editingItem.location,
              description: editingItem.description,
              requirementsMessage: editingItem.requirementsMessage ?? '',
            }
          : EMPTY_FORM
      )
      setSelectedActivityTemplateId(null)
      setError(null)
    }
  }

  function handleSelectActivityTemplate(id: string | null) {
    setSelectedActivityTemplateId(id)
    const template = activityTemplates.find((t) => t.id === id)
    if (!template) return
    setForm((p) => ({
      ...p,
      title: template.title,
      location: template.defaultLocation ?? p.location,
      description: template.description,
      requirementsMessage: template.requirementsMessage ?? '',
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const values: ActivityItemValues = {
      dayNumber: Number(form.dayNumber),
      time: form.time,
      title: form.title,
      location: form.location,
      description: form.description,
      requirementsMessage: form.requirementsMessage.trim() || null,
    }
    const result = await onSubmit(values, editingItem?.id ?? null)
    setSaving(false)
    if (result.ok) {
      toast.success(editingItem ? 'Actividad actualizada.' : 'Actividad agregada.')
      onOpenChange(false)
    } else {
      const message = result.error ?? 'No se pudo guardar la actividad.'
      setError(message)
      toast.error(message)
    }
  }

  const canSubmit =
    !saving &&
    form.dayNumber.trim() !== '' &&
    form.time.trim() !== '' &&
    form.title.trim() !== '' &&
    form.location.trim() !== '' &&
    form.description.trim() !== ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="gap-1">
          <SheetTitle>{editingItem ? 'Editar actividad' : 'Nueva actividad'}</SheetTitle>
          <SheetDescription>
            Elige una actividad de la biblioteca para prellenar los campos, o complétalos a mano.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4 text-sm">
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
              <Label htmlFor="activity-item-day">Día</Label>
              {totalDays ? (
                <Select
                  value={form.dayNumber}
                  onValueChange={(value) => setForm((p) => ({ ...p, dayNumber: value }))}
                >
                  <SelectTrigger id="activity-item-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        Día {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="activity-item-day"
                  type="number"
                  min={1}
                  value={form.dayNumber}
                  onChange={(e) => setForm((p) => ({ ...p, dayNumber: e.target.value }))}
                />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="activity-item-time">Hora</Label>
              <Input
                id="activity-item-time"
                placeholder="09:00"
                value={form.time}
                onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="activity-item-title">Título</Label>
              <Input
                id="activity-item-title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="activity-item-location">Lugar</Label>
            <Input
              id="activity-item-location"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="activity-item-description">Descripción</Label>
            <Textarea
              id="activity-item-description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="activity-item-requirements">Requisitos para apoderados (opcional)</Label>
            <Textarea
              id="activity-item-requirements"
              placeholder="Ej: traer ropa de abrigo y llegar 15 min antes."
              value={form.requirementsMessage}
              onChange={(e) => setForm((p) => ({ ...p, requirementsMessage: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              El monitor podrá enviarlo como comunicado con un toque desde la app.
            </p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <SheetFooter className="mt-auto flex gap-2 sm:flex-col sm:space-x-0">
          <Button className="w-full" onClick={handleSave} disabled={!canSubmit}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
          <SheetClose asChild>
            <Button variant="outline" className="w-full">
              Cancelar
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
