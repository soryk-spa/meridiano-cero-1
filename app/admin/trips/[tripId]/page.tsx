'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  CalendarRangeIcon,
  CheckIcon,
  CopyIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserMinusIcon,
  UserPlusIcon,
} from 'lucide-react'
import { differenceInCalendarDays } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import type {
  AccessCode,
  ActivityTemplate,
  Announcement,
  ItineraryItem,
  LocationPing,
  Role,
  Trip,
  TripStatus,
} from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import StatusBadge from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { DateRangePicker } from '@/components/date-range-picker'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { itineraryStatusLabels, announcementTypeLabels, tripStatusLabels } from '@/lib/labels'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

type TripDetail = Trip & { school: { name: string } }
type CodeRow = AccessCode & { trip: { id: string; name: string } }
type ParentRow = { id: string; name: string; email: string }
type MonitorRow = { id: string; name: string; email: string }
type ProgramOption = { id: string; name: string }

const STATUS_OPTIONS: TripStatus[] = ['IN_TRANSIT', 'IN_ACTIVITY', 'RESTING', 'FINISHED']
const roleLabels: Record<Role, string> = { PARENT: 'Apoderado', MONITOR: 'Monitor' }

const EMPTY_EDIT_FORM = { name: '', destination: '', studentCount: '' }
const EMPTY_ITINERARY_FORM = {
  dayNumber: '1',
  time: '',
  title: '',
  location: '',
  description: '',
  requirementsMessage: '',
}
const EMPTY_MONITOR_FORM = { firstName: '', lastName: '', emailAddress: '' }

export default function AdminTripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const searchParams = useSearchParams()
  const autoEditTriggered = useRef(false)
  const [trip, setTrip] = useState<TripDetail | null>(null)
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [ping, setPing] = useState<LocationPing | null>(null)
  const [codes, setCodes] = useState<CodeRow[]>([])
  const [parents, setParents] = useState<ParentRow[]>([])
  const [monitors, setMonitors] = useState<MonitorRow[]>([])
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [addingRole, setAddingRole] = useState<Role | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [addMonitorOpen, setAddMonitorOpen] = useState(false)
  const [monitorForm, setMonitorForm] = useState(EMPTY_MONITOR_FORM)
  const [addingMonitor, setAddingMonitor] = useState(false)
  const [addMonitorError, setAddMonitorError] = useState<string | null>(null)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string | null } | null>(
    null
  )
  const [credentialsCopied, setCredentialsCopied] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM)
  const [editDateRange, setEditDateRange] = useState<DateRange | undefined>()
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [itineraryOpen, setItineraryOpen] = useState(false)
  const [itineraryForm, setItineraryForm] = useState(EMPTY_ITINERARY_FORM)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [savingItinerary, setSavingItinerary] = useState(false)
  const [itineraryError, setItineraryError] = useState<string | null>(null)
  const [activityTemplates, setActivityTemplates] = useState<ActivityTemplate[]>([])
  const [selectedActivityTemplateId, setSelectedActivityTemplateId] = useState<string | null>(null)
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [applyProgramOpen, setApplyProgramOpen] = useState(false)
  const [applyProgramId, setApplyProgramId] = useState<string | null>(null)
  const [applyingProgram, setApplyingProgram] = useState(false)
  const [applyProgramError, setApplyProgramError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [
      tripRes,
      itineraryRes,
      announcementsRes,
      locationRes,
      codesRes,
      rosterRes,
      activityTemplatesRes,
      programsRes,
    ] = await Promise.all([
      fetch(`/api/v1/trips/${tripId}`),
      fetch(`/api/v1/trips/${tripId}/itinerary`),
      fetch(`/api/v1/trips/${tripId}/announcements`),
      fetch(`/api/v1/trips/${tripId}/location`),
      fetch(`/api/v1/admin/codes?tripId=${tripId}`),
      fetch(`/api/v1/trips/${tripId}/roster`),
      fetch('/api/v1/admin/activity-templates'),
      fetch('/api/v1/admin/programs'),
    ])
    if (tripRes.ok) setTrip((await tripRes.json()).trip)
    if (itineraryRes.ok) setItinerary((await itineraryRes.json()).items)
    if (announcementsRes.ok) setAnnouncements((await announcementsRes.json()).announcements)
    if (locationRes.ok) setPing((await locationRes.json()).ping)
    if (codesRes.ok) setCodes((await codesRes.json()).codes)
    if (rosterRes.ok) {
      const roster = await rosterRes.json()
      setParents(roster.parents)
      setMonitors(roster.monitors)
    }
    if (activityTemplatesRes.ok) setActivityTemplates((await activityTemplatesRes.json()).activityTemplates)
    if (programsRes.ok) setPrograms((await programsRes.json()).programs)
  }, [tripId])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(id)
  }, [load])

  async function handleStatusChange(status: TripStatus) {
    if (!trip) return
    setUpdatingStatus(true)
    const res = await fetch(`/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setTrip((await res.json()).trip)
    setUpdatingStatus(false)
  }

  function openEditDialog() {
    if (!trip) return
    setEditForm({
      name: trip.name,
      destination: trip.destination,
      studentCount: String(trip.studentCount),
    })
    setEditDateRange({ from: new Date(trip.startDate), to: new Date(trip.endDate) })
    setEditError(null)
    setEditOpen(true)
  }

  useEffect(() => {
    if (!autoEditTriggered.current && trip && searchParams.get('edit') === '1') {
      autoEditTriggered.current = true
      openEditDialog()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, searchParams])

  async function handleSaveEdit() {
    if (!editDateRange?.from || !editDateRange?.to) return
    setSavingEdit(true)
    setEditError(null)
    const res = await fetch(`/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        destination: editForm.destination,
        studentCount: Number(editForm.studentCount),
        startDate: editDateRange.from.toISOString(),
        endDate: editDateRange.to.toISOString(),
      }),
    })
    setSavingEdit(false)
    if (res.ok) {
      setTrip((await res.json()).trip)
      setEditOpen(false)
    } else {
      const data = await res.json().catch(() => null)
      setEditError(data?.error?.message ?? 'No se pudo guardar la gira.')
    }
  }

  async function handleAddCode(role: Role) {
    setAddingRole(role)
    const res = await fetch('/api/v1/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, role }),
    })
    setAddingRole(null)
    if (res.ok) void load()
  }

  async function handleRevokeCode(id: string) {
    const res = await fetch(`/api/v1/admin/codes/${id}`, { method: 'DELETE' })
    if (res.ok) void load()
  }

  async function handleCopyCode(id: string, code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500)
  }

  function openCreateItinerary() {
    setEditingItemId(null)
    setItineraryForm(EMPTY_ITINERARY_FORM)
    setSelectedActivityTemplateId(null)
    setItineraryError(null)
    setItineraryOpen(true)
  }

  function openEditItinerary(item: ItineraryItem) {
    setEditingItemId(item.id)
    setItineraryForm({
      dayNumber: String(item.dayNumber),
      time: item.time,
      title: item.title,
      location: item.location,
      description: item.description,
      requirementsMessage: item.requirementsMessage ?? '',
    })
    setSelectedActivityTemplateId(null)
    setItineraryError(null)
    setItineraryOpen(true)
  }

  function handleSelectActivityTemplate(id: string | null) {
    setSelectedActivityTemplateId(id)
    const template = activityTemplates.find((t) => t.id === id)
    if (!template) return
    setItineraryForm((p) => ({
      ...p,
      title: template.title,
      location: template.defaultLocation ?? p.location,
      description: template.description,
      requirementsMessage: template.requirementsMessage ?? '',
    }))
  }

  async function handleSaveItinerary() {
    setSavingItinerary(true)
    setItineraryError(null)
    const body: Record<string, unknown> = {
      dayNumber: Number(itineraryForm.dayNumber),
      time: itineraryForm.time,
      title: itineraryForm.title,
      location: itineraryForm.location,
      description: itineraryForm.description,
    }
    if (itineraryForm.requirementsMessage.trim()) {
      body.requirementsMessage = itineraryForm.requirementsMessage.trim()
    } else if (editingItemId) {
      body.requirementsMessage = null
    }
    const res = await fetch(
      editingItemId
        ? `/api/v1/trips/${tripId}/itinerary/${editingItemId}`
        : `/api/v1/trips/${tripId}/itinerary`,
      {
        method: editingItemId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    setSavingItinerary(false)
    if (res.ok) {
      setItineraryOpen(false)
      void load()
    } else {
      const data = await res.json().catch(() => null)
      setItineraryError(data?.error?.message ?? 'No se pudo guardar el ítem.')
    }
  }

  async function handleDeleteItinerary(itemId: string) {
    if (!window.confirm('¿Eliminar este ítem del itinerario?')) return
    const res = await fetch(`/api/v1/trips/${tripId}/itinerary/${itemId}`, { method: 'DELETE' })
    if (res.ok) void load()
  }

  function openApplyProgram() {
    setApplyProgramId(null)
    setApplyProgramError(null)
    setApplyProgramOpen(true)
  }

  async function handleApplyProgram() {
    if (!applyProgramId) return
    setApplyingProgram(true)
    setApplyProgramError(null)
    const res = await fetch(`/api/v1/admin/programs/${applyProgramId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId }),
    })
    setApplyingProgram(false)
    if (res.ok) {
      setApplyProgramOpen(false)
      void load()
    } else {
      const data = await res.json().catch(() => null)
      setApplyProgramError(data?.error?.message ?? 'No se pudo aplicar el programa.')
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    if (!window.confirm('¿Eliminar este comunicado?')) return
    const res = await fetch(`/api/v1/trips/${tripId}/announcements/${id}`, { method: 'DELETE' })
    if (res.ok) void load()
  }

  async function handleRemoveParent(membershipId: string) {
    if (!window.confirm('¿Quitar a este apoderado de la gira?')) return
    const res = await fetch(`/api/v1/trips/${tripId}/roster/${membershipId}`, { method: 'DELETE' })
    if (res.ok) void load()
  }

  async function handleRemoveMonitor(membershipId: string) {
    if (!window.confirm('¿Quitar a este monitor de la gira?')) return
    const res = await fetch(`/api/v1/trips/${tripId}/roster/${membershipId}`, { method: 'DELETE' })
    if (res.ok) void load()
  }

  function openAddMonitor() {
    setMonitorForm(EMPTY_MONITOR_FORM)
    setAddMonitorError(null)
    setCreatedCredentials(null)
    setCredentialsCopied(false)
    setAddMonitorOpen(true)
  }

  async function handleAddMonitor() {
    setAddingMonitor(true)
    setAddMonitorError(null)
    const res = await fetch(`/api/v1/trips/${tripId}/monitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(monitorForm),
    })
    setAddingMonitor(false)
    if (res.ok) {
      const data = await res.json()
      setCreatedCredentials({ email: data.email, password: data.password })
      void load()
    } else {
      const data = await res.json().catch(() => null)
      setAddMonitorError(data?.error?.message ?? 'No se pudo agregar al monitor.')
    }
  }

  async function handleCopyCredentials() {
    if (!createdCredentials?.password) return
    await navigator.clipboard.writeText(
      `Correo: ${createdCredentials.email}\nContraseña: ${createdCredentials.password}`
    )
    setCredentialsCopied(true)
    window.setTimeout(() => setCredentialsCopied(false), 1500)
  }

  if (!trip) {
    return (
      <>
        <SiteHeader title="Gira" />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    )
  }

  return (
    <>
      <SiteHeader
        title={trip.name}
        subtitle={trip.school.name}
        right={
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="xs" onClick={openEditDialog}>
                <PencilIcon />
                Editar gira
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar gira</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-name">Nombre de la gira</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-destination">Destino</Label>
                    <Input
                      id="edit-destination"
                      value={editForm.destination}
                      onChange={(e) => setEditForm((p) => ({ ...p, destination: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-student-count">N° de alumnos</Label>
                    <Input
                      id="edit-student-count"
                      type="number"
                      value={editForm.studentCount}
                      onChange={(e) => setEditForm((p) => ({ ...p, studentCount: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Fechas de la gira</Label>
                  <DateRangePicker value={editDateRange} onChange={setEditDateRange} />
                  {editDateRange?.from && editDateRange?.to ? (
                    <p className="text-xs text-muted-foreground">
                      Duración: {differenceInCalendarDays(editDateRange.to, editDateRange.from) + 1} día
                      {differenceInCalendarDays(editDateRange.to, editDateRange.from) + 1 === 1 ? '' : 's'}
                    </p>
                  ) : null}
                </div>
                {editError ? <p className="text-sm text-destructive">{editError}</p> : null}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !editDateRange?.from || !editDateRange?.to}
                >
                  {savingEdit ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Estado</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <StatusBadge status={trip.status} />
              <Select
                value={trip.status}
                onValueChange={(value) => handleStatusChange(value as TripStatus)}
                disabled={updatingStatus}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {tripStatusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Destino</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{trip.destination}</p>
              <p className="text-sm text-muted-foreground">
                Día {trip.currentDay} de {trip.totalDays}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Alumnos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{trip.studentCount}</p>
              <p className="text-sm text-muted-foreground">{trip.school.name}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Ubicación actual</CardTitle>
          </CardHeader>
          {ping ? (
            <MapView lat={ping.lat} lng={ping.lng} height="360px" label={trip.name} />
          ) : (
            <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
              Sin ubicación reportada todavía.
            </CardContent>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Itinerario</CardTitle>
              <div className="flex items-center gap-2">
                <Dialog open={applyProgramOpen} onOpenChange={setApplyProgramOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={openApplyProgram}>
                      <CalendarRangeIcon />
                      Aplicar programa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Aplicar programa</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Label>Programa</Label>
                        <Combobox
                          options={programs.map((p) => ({ value: p.id, label: p.name }))}
                          value={applyProgramId}
                          onSelect={setApplyProgramId}
                          placeholder="Elegir un programa…"
                          emptyLabel="Sin programas disponibles."
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Agrega las actividades del programa al itinerario de esta gira, sin tocar los ítems
                        que ya existen.
                      </p>
                      {applyProgramError ? (
                        <p className="text-sm text-destructive">{applyProgramError}</p>
                      ) : null}
                    </div>
                    <DialogFooter>
                      <Button onClick={handleApplyProgram} disabled={applyingProgram || !applyProgramId}>
                        {applyingProgram ? 'Aplicando…' : 'Aplicar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={itineraryOpen} onOpenChange={setItineraryOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={openCreateItinerary}>
                      <PlusIcon />
                      Agregar
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItemId ? 'Editar ítem' : 'Nuevo ítem de itinerario'}</DialogTitle>
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
                        <Label htmlFor="itinerary-day">Día</Label>
                        <Select
                          value={itineraryForm.dayNumber}
                          onValueChange={(value) => setItineraryForm((p) => ({ ...p, dayNumber: value }))}
                        >
                          <SelectTrigger id="itinerary-day">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: trip.totalDays }, (_, i) => i + 1).map((day) => (
                              <SelectItem key={day} value={String(day)}>
                                Día {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="itinerary-time">Hora</Label>
                        <Input
                          id="itinerary-time"
                          placeholder="09:00"
                          value={itineraryForm.time}
                          onChange={(e) => setItineraryForm((p) => ({ ...p, time: e.target.value }))}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="itinerary-title">Título</Label>
                        <Input
                          id="itinerary-title"
                          value={itineraryForm.title}
                          onChange={(e) => setItineraryForm((p) => ({ ...p, title: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="itinerary-location">Lugar</Label>
                      <Input
                        id="itinerary-location"
                        value={itineraryForm.location}
                        onChange={(e) => setItineraryForm((p) => ({ ...p, location: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="itinerary-description">Descripción</Label>
                      <Textarea
                        id="itinerary-description"
                        value={itineraryForm.description}
                        onChange={(e) => setItineraryForm((p) => ({ ...p, description: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="itinerary-requirements">Requisitos para apoderados (opcional)</Label>
                      <Textarea
                        id="itinerary-requirements"
                        placeholder="Ej: traer ropa de abrigo y llegar 15 min antes."
                        value={itineraryForm.requirementsMessage}
                        onChange={(e) => setItineraryForm((p) => ({ ...p, requirementsMessage: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        El monitor podrá enviarlo como comunicado con un toque desde la app.
                      </p>
                    </div>
                    {itineraryError ? <p className="text-sm text-destructive">{itineraryError}</p> : null}
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleSaveItinerary}
                      disabled={
                        savingItinerary ||
                        !itineraryForm.time.trim() ||
                        !itineraryForm.title.trim() ||
                        !itineraryForm.location.trim() ||
                        !itineraryForm.description.trim()
                      }
                    >
                      {savingItinerary ? 'Guardando…' : 'Guardar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {itinerary.length ? (
                Object.entries(
                  itinerary.reduce<Record<number, ItineraryItem[]>>((groups, item) => {
                    ;(groups[item.dayNumber] ??= []).push(item)
                    return groups
                  }, {})
                )
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([day, items]) => (
                    <div key={day} className="flex flex-col gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Día {day}
                      </p>
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                        >
                          <div className="flex items-start gap-3">
                            {item.photoUrl ? (
                              <a href={item.photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.photoUrl}
                                  alt={item.title}
                                  className="size-10 rounded-md border object-cover"
                                />
                              </a>
                            ) : null}
                            <div>
                              <p className="text-sm font-medium">
                                {item.time} · {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground">{item.location}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              {itineraryStatusLabels[item.status]}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => openEditItinerary(item)}>
                              <PencilIcon className="size-4" />
                              <span className="sr-only">Editar ítem</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteItinerary(item.id)}>
                              <Trash2Icon className="size-4" />
                              <span className="sr-only">Eliminar ítem</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin ítems de itinerario.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comunicados</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {announcements.length ? (
                announcements.map((announcement) => (
                  <div key={announcement.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{announcement.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {announcementTypeLabels[announcement.type]}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                        >
                          <Trash2Icon className="size-4" />
                          <span className="sr-only">Eliminar comunicado</span>
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{announcement.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin comunicados.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Apoderados ({parents.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {parents.length ? (
              parents.map((parent) => (
                <div key={parent.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{parent.name}</span>
                    <span className="text-xs text-muted-foreground">{parent.email}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveParent(parent.id)}>
                    <UserMinusIcon className="size-4" />
                    <span className="sr-only">Quitar apoderado</span>
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin apoderados registrados todavía.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Monitores ({monitors.length})</CardTitle>
            <Dialog open={addMonitorOpen} onOpenChange={setAddMonitorOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={openAddMonitor}>
                  <UserPlusIcon />
                  Agregar monitor
                </Button>
              </DialogTrigger>
              <DialogContent>
                {createdCredentials ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>Monitor agregado</DialogTitle>
                    </DialogHeader>
                    {createdCredentials.password ? (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                          Comparte estas credenciales con el monitor. La contraseña no se volverá a mostrar.
                        </p>
                        <div className="flex flex-col gap-1 rounded-md border bg-muted/50 p-3 font-mono text-sm">
                          <span>{createdCredentials.email}</span>
                          <span>{createdCredentials.password}</span>
                        </div>
                        <Button variant="outline" onClick={handleCopyCredentials}>
                          {credentialsCopied ? <CheckIcon /> : <CopyIcon />}
                          {credentialsCopied ? 'Copiado' : 'Copiar credenciales'}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {createdCredentials.email} ya tenía una cuenta y quedó asociado a esta gira.
                      </p>
                    )}
                    <DialogFooter>
                      <Button onClick={() => setAddMonitorOpen(false)}>Listo</Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Agregar monitor a esta gira</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="monitor-first-name">Nombre</Label>
                          <Input
                            id="monitor-first-name"
                            value={monitorForm.firstName}
                            onChange={(e) => setMonitorForm((p) => ({ ...p, firstName: e.target.value }))}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="monitor-last-name">Apellido</Label>
                          <Input
                            id="monitor-last-name"
                            value={monitorForm.lastName}
                            onChange={(e) => setMonitorForm((p) => ({ ...p, lastName: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="monitor-email">Correo electrónico</Label>
                        <Input
                          id="monitor-email"
                          type="email"
                          placeholder="nombre@correo.cl"
                          value={monitorForm.emailAddress}
                          onChange={(e) => setMonitorForm((p) => ({ ...p, emailAddress: e.target.value }))}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Se crea la cuenta al tiro con una contraseña generada. Si el correo ya tiene cuenta,
                        solo se asocia a esta gira.
                      </p>
                      {addMonitorError ? <p className="text-sm text-destructive">{addMonitorError}</p> : null}
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleAddMonitor}
                        disabled={
                          addingMonitor ||
                          !monitorForm.firstName.trim() ||
                          !monitorForm.lastName.trim() ||
                          !monitorForm.emailAddress.trim()
                        }
                      >
                        {addingMonitor ? 'Creando…' : 'Crear cuenta'}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {monitors.length ? (
              monitors.map((monitor) => (
                <div key={monitor.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{monitor.name}</span>
                    <span className="text-xs text-muted-foreground">{monitor.email}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveMonitor(monitor.id)}>
                    <UserMinusIcon className="size-4" />
                    <span className="sr-only">Quitar monitor</span>
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin monitores asignados todavía.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Códigos y equipo</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddCode('MONITOR')}
                disabled={addingRole !== null}
              >
                <UserPlusIcon />
                {addingRole === 'MONITOR' ? 'Agregando…' : 'Agregar monitor'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddCode('PARENT')}
                disabled={addingRole !== null}
              >
                <UserPlusIcon />
                {addingRole === 'PARENT' ? 'Agregando…' : 'Agregar apoderado'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {codes.length ? (
              codes.map((code) => (
                <div key={code.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{roleLabels[code.role]}</Badge>
                    <span className="font-mono text-sm">{code.code}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleCopyCode(code.id, code.code)}>
                      {copiedId === code.id ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                      <span className="sr-only">Copiar código</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRevokeCode(code.id)}>
                      <Trash2Icon className="size-4" />
                      <span className="sr-only">Revocar código</span>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin códigos para esta gira todavía.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
