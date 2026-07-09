"use client"

import { useState } from "react"
import { PlusIcon, RefreshCwIcon } from "lucide-react"
import { differenceInCalendarDays } from "date-fns"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/date-range-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { KNOWN_DESTINATIONS } from "@/lib/destinations"
import { generateAccessCode } from "@/lib/generate-code"

const CUSTOM_DESTINATION = "custom"

const EMPTY_FORM = {
  name: "",
  schoolName: "",
  destination: "",
  studentCount: "",
  initialLat: "",
  initialLng: "",
  parentCode: "",
  monitorCode: "",
}

export function CreateTripSheet({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [destinationId, setDestinationId] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [submitting, setSubmitting] = useState(false)

  const isCustomDestination = destinationId === CUSTOM_DESTINATION
  const totalDays =
    dateRange?.from && dateRange?.to ? differenceInCalendarDays(dateRange.to, dateRange.from) + 1 : null

  function handleDestinationChange(id: string) {
    setDestinationId(id)
    if (id === CUSTOM_DESTINATION) {
      setForm((p) => ({ ...p, destination: "", initialLat: "", initialLng: "" }))
      return
    }
    const known = KNOWN_DESTINATIONS.find((d) => d.id === id)
    if (known) {
      setForm((p) => ({ ...p, destination: known.label, initialLat: String(known.lat), initialLng: String(known.lng) }))
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setDestinationId("")
    setDateRange(undefined)
  }

  async function handleCreateTrip() {
    if (!dateRange?.from || !dateRange?.to) return
    setSubmitting(true)
    const res = await fetch("/api/v1/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      resetForm()
      setOpen(false)
      onCreated()
    }
  }

  const canSubmit =
    !submitting &&
    !!dateRange?.from &&
    !!dateRange?.to &&
    !!destinationId &&
    form.destination.trim() &&
    form.initialLat !== "" &&
    form.initialLng !== ""

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          <span className="hidden lg:inline">Nueva gira</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="gap-1">
          <SheetTitle>Nueva gira</SheetTitle>
          <SheetDescription>
            Crea una gira y genera sus códigos de acceso para apoderados y monitor.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4 text-sm">
          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
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

            <div className="flex flex-col gap-2">
              <Label>Fechas de la gira</Label>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              {totalDays ? (
                <p className="text-xs text-muted-foreground">
                  Duración: {totalDays} día{totalDays === 1 ? "" : "s"}
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
              <div className="grid grid-cols-2 gap-4">
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
              </div>
            ) : destinationId ? (
              <p className="text-xs text-muted-foreground">
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
        </div>
        <SheetFooter className="mt-auto flex gap-2 sm:flex-col sm:space-x-0">
          <Button className="w-full" onClick={handleCreateTrip} disabled={!canSubmit}>
            {submitting ? "Creando…" : "Crear gira"}
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
