'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPinPlusIcon, RefreshCwIcon } from 'lucide-react'
import { differenceInCalendarDays } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DateRangePicker } from '@/components/date-range-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KNOWN_DESTINATIONS } from '@/lib/destinations'
import { generateAccessCode } from '@/lib/generate-code'

const CUSTOM_DESTINATION = 'custom'

const EMPTY_FORM = {
  name: '',
  schoolName: '',
  destination: '',
  studentCount: '',
  initialLat: '',
  initialLng: '',
  parentCode: '',
  monitorCode: '',
}

export default function NewTripPage() {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY_FORM)
  const [destinationId, setDestinationId] = useState('')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCustomDestination = destinationId === CUSTOM_DESTINATION
  const totalDays =
    dateRange?.from && dateRange?.to ? differenceInCalendarDays(dateRange.to, dateRange.from) + 1 : null

  function handleDestinationChange(id: string) {
    setDestinationId(id)
    if (id === CUSTOM_DESTINATION) {
      setForm((p) => ({ ...p, destination: '', initialLat: '', initialLng: '' }))
      return
    }
    const known = KNOWN_DESTINATIONS.find((d) => d.id === id)
    if (known) {
      setForm((p) => ({ ...p, destination: known.label, initialLat: String(known.lat), initialLng: String(known.lng) }))
    }
  }

  async function handleCreateTrip() {
    if (!dateRange?.from || !dateRange?.to) return
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/v1/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        studentCount: Number(form.studentCount),
        initialLat: Number(form.initialLat),
        initialLng: Number(form.initialLng),
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      const { trip } = await res.json()
      router.push(`/admin/trips/${trip.id}`)
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error?.message ?? 'No se pudo crear la gira.')
    }
  }

  const canSubmit =
    !submitting &&
    !!dateRange?.from &&
    !!dateRange?.to &&
    !!destinationId &&
    form.destination.trim() &&
    form.initialLat !== '' &&
    form.initialLng !== ''

  return (
    <>
      <SiteHeader title="Nueva gira" subtitle="Crea una gira y genera sus códigos de acceso" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <Card className="mx-auto w-full max-w-4xl">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <MapPinPlusIcon size={18} />
              </span>
              <div>
                <p className="font-semibold">Detalles de la gira</p>
                <p className="text-sm text-muted-foreground">
                  Estos datos quedarán disponibles para apoderados y monitores.
                </p>
              </div>
            </div>

            <form
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nombre de la gira</Label>
                <Input
                  id="name"
                  placeholder="Nombre de la gira"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="schoolName">Colegio</Label>
                <Input
                  id="schoolName"
                  placeholder="Colegio"
                  value={form.schoolName}
                  onChange={(e) => setForm((p) => ({ ...p, schoolName: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Destino</Label>
                <Select value={destinationId} onValueChange={handleDestinationChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWN_DESTINATIONS.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_DESTINATION}>Otro destino…</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isCustomDestination ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="destination">Nombre del destino</Label>
                  <Input
                    id="destination"
                    placeholder="Nombre del destino"
                    value={form.destination}
                    onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))}
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>Fechas de la gira</Label>
                <DateRangePicker value={dateRange} onChange={setDateRange} />
                {totalDays ? (
                  <p className="text-xs text-muted-foreground">
                    Duración: {totalDays} día{totalDays === 1 ? '' : 's'}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="studentCount">N° de alumnos</Label>
                <Input
                  id="studentCount"
                  type="number"
                  placeholder="N° de alumnos"
                  value={form.studentCount}
                  onChange={(e) => setForm((p) => ({ ...p, studentCount: e.target.value }))}
                />
              </div>

              {isCustomDestination ? (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="initialLat">Latitud inicial</Label>
                    <Input
                      id="initialLat"
                      type="number"
                      placeholder="Latitud inicial"
                      value={form.initialLat}
                      onChange={(e) => setForm((p) => ({ ...p, initialLat: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="initialLng">Longitud inicial</Label>
                    <Input
                      id="initialLng"
                      type="number"
                      placeholder="Longitud inicial"
                      value={form.initialLng}
                      onChange={(e) => setForm((p) => ({ ...p, initialLng: e.target.value }))}
                    />
                  </div>
                </>
              ) : destinationId ? (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Coordenadas iniciales: {form.initialLat}, {form.initialLng}
                </p>
              ) : null}

              <div className="flex flex-col gap-2">
                <Label htmlFor="parentCode">Código apoderado</Label>
                <div className="flex gap-2">
                  <Input
                    id="parentCode"
                    placeholder="Código apoderado"
                    className="flex-1"
                    value={form.parentCode}
                    onChange={(e) => setForm((p) => ({ ...p, parentCode: e.target.value.toUpperCase() }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setForm((p) => ({ ...p, parentCode: generateAccessCode() }))}
                  >
                    <RefreshCwIcon className="size-4" />
                    <span className="sr-only">Generar código</span>
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="monitorCode">Código monitor</Label>
                <div className="flex gap-2">
                  <Input
                    id="monitorCode"
                    placeholder="Código monitor"
                    className="flex-1"
                    value={form.monitorCode}
                    onChange={(e) => setForm((p) => ({ ...p, monitorCode: e.target.value.toUpperCase() }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setForm((p) => ({ ...p, monitorCode: generateAccessCode() }))}
                  >
                    <RefreshCwIcon className="size-4" />
                    <span className="sr-only">Generar código</span>
                  </Button>
                </div>
              </div>
            </form>

            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" asChild>
                <Link href="/admin/trips">Cancelar</Link>
              </Button>
              <Button onClick={handleCreateTrip} disabled={!canSubmit}>
                {submitting ? 'Creando…' : 'Crear gira'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
