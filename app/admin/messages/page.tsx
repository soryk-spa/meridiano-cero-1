'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageSquareIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { AnnouncementTemplate, AnnouncementType } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import { Badge } from '@/components/ui/badge'
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
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AnnouncementType | 'ALL'>('ALL')

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
      toast.success(editingId ? 'Mensaje actualizado.' : 'Mensaje creado.')
      setOpen(false)
      void load()
    } else {
      const data = await res.json().catch(() => null)
      const message = data?.error?.message ?? 'No se pudo guardar el mensaje.'
      setError(message)
      toast.error(message)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta plantilla de mensaje?')) return
    const res = await fetch(`/api/v1/announcement-templates/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Mensaje eliminado.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo eliminar el mensaje.')
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (templates ?? []).filter(
      (template) =>
        (typeFilter === 'ALL' || template.type === typeFilter) &&
        (!query || template.title.toLowerCase().includes(query) || template.message.toLowerCase().includes(query))
    )
  }, [templates, search, typeFilter])

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
        {loadError && !templates ? (
          <FetchError message={loadError} onRetry={load} />
        ) : !templates ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-xs">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título o mensaje…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as AnnouncementType | 'ALL')}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los tipos</SelectItem>
                  {(Object.keys(announcementTypeLabels) as AnnouncementType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {announcementTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Mensaje</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length ? (
                    filtered.map((template) => (
                      <TableRow key={template.id} className="h-16">
                        <TableCell className="font-medium">{template.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{announcementTypeLabels[template.type]}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{template.category ?? '—'}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{template.message}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(template)}>
                              <PencilIcon className="size-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)}>
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
                          icon={MessageSquareIcon}
                          title={templates.length ? 'Sin resultados para estos filtros.' : 'Sin mensajes predeterminados todavía.'}
                          description={templates.length ? 'Prueba con otra búsqueda o tipo.' : 'Crea la primera plantilla de mensaje.'}
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
