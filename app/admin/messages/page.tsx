'use client'

import { useCallback, useEffect, useState } from 'react'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import type { AnnouncementTemplate, AnnouncementType } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { FetchError } from '@/components/fetch-error'
import { announcementTypeLabels } from '@/lib/labels'

const EMPTY_FORM = { title: '', message: '', type: 'INFO' as AnnouncementType, category: '' }

export default function AdminMessagesPage() {
  const [templates, setTemplates] = useState<AnnouncementTemplate[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    const res = await fetch('/api/v1/announcement-templates')
    if (res.ok) {
      setTemplates((await res.json()).templates)
    } else {
      const data = await res.json().catch(() => null)
      setLoadError(data?.error?.message ?? 'No se pudieron cargar los mensajes.')
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

  function openEdit(template: AnnouncementTemplate) {
    setEditingId(template.id)
    setForm({
      title: template.title,
      message: template.message,
      type: template.type,
      category: template.category ?? '',
    })
    setError(null)
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const body = {
      title: form.title,
      message: form.message,
      type: form.type,
      category: form.category.trim() || (editingId ? null : undefined),
    }
    const res = await fetch(
      editingId ? `/api/v1/announcement-templates/${editingId}` : '/api/v1/announcement-templates',
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
      setError(data?.error?.message ?? 'No se pudo guardar el mensaje.')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta plantilla de mensaje?')) return
    const res = await fetch(`/api/v1/announcement-templates/${id}`, { method: 'DELETE' })
    if (res.ok) void load()
  }

  return (
    <>
      <SiteHeader
        title="Mensajes predeterminados"
        subtitle="Plantillas que los monitores pueden enviar sin redactar texto libre"
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="xs" onClick={openCreate}>
                <PlusIcon />
                Nuevo mensaje
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar mensaje' : 'Nuevo mensaje predeterminado'}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="message-title">Título</Label>
                  <Input
                    id="message-title"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="message-text">Mensaje</Label>
                  <Textarea
                    id="message-text"
                    value={form.message}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="message-type">Tipo</Label>
                    <Select
                      value={form.type}
                      onValueChange={(value) => setForm((p) => ({ ...p, type: value as AnnouncementType }))}
                    >
                      <SelectTrigger id="message-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(announcementTypeLabels) as AnnouncementType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {announcementTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="message-category">Categoría (opcional)</Label>
                    <Input
                      id="message-category"
                      placeholder="Traslados"
                      value={form.category}
                      onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    />
                  </div>
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>
              <DialogFooter>
                <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.message.trim()}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {loadError && !templates ? (
            <div className="col-span-full">
              <FetchError message={loadError} onRetry={load} />
            </div>
          ) : !templates ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32 w-full" />)
          ) : templates.length ? (
            templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base">{template.title}</CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline">{announcementTypeLabels[template.type]}</Badge>
                      {template.category ? (
                        <span className="text-xs text-muted-foreground">{template.category}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(template)}>
                      <PencilIcon className="size-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)}>
                      <Trash2Icon className="size-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{template.message}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin mensajes predeterminados todavía.</p>
          )}
        </div>
      </div>
    </>
  )
}
