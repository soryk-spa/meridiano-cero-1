'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeftIcon, ChevronRightIcon, LayoutGridIcon, SearchIcon } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { EmptyState } from '@/components/empty-state'
import { FetchError } from '@/components/fetch-error'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ScheduleTrip = {
  id: string
  name: string
  school: { name: string }
  program: { name: string }
  studentCount: number
  hotel: string | null
  startDate: string
  endDate: string
  itineraryItems: { dayNumber: number; title: string }[]
}

const ALL_SCHOOLS = 'all'

/** Validated 8-slot categorical palette (light/dark steps) — never cycled past 8, see docs/SISTEMA.md dataviz notes. */
const SLOT_DOT_CLASSES = [
  'bg-[#2a78d6] dark:bg-[#3987e5]',
  'bg-[#eb6834] dark:bg-[#d95926]',
  'bg-[#1baf7a] dark:bg-[#199e70]',
  'bg-[#eda100] dark:bg-[#c98500]',
  'bg-[#e87ba4] dark:bg-[#d55181]',
  'bg-[#008300] dark:bg-[#008300]',
  'bg-[#4a3aa7] dark:bg-[#9085e9]',
  'bg-[#e34948] dark:bg-[#e66767]',
]

function itemDate(trip: ScheduleTrip, dayNumber: number) {
  return addDays(new Date(trip.startDate), dayNumber - 1)
}

export default function AdminSchedulePage() {
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()))
  const [trips, setTrips] = useState<ScheduleTrip[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState(ALL_SCHOOLS)

  const load = useCallback(async (month: Date) => {
    setTrips(null)
    setLoadError(null)
    const res = await fetch(`/api/v1/admin/schedule?month=${format(month, 'yyyy-MM')}`)
    if (res.ok) {
      setTrips((await res.json()).trips)
    } else {
      const data = await res.json().catch(() => null)
      setLoadError(data?.error?.message ?? 'No se pudo cargar el calendario.')
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => void load(monthDate), 0)
    return () => window.clearTimeout(id)
  }, [monthDate, load])

  const schoolOptions = useMemo(
    () => Array.from(new Set((trips ?? []).map((trip) => trip.school.name))).sort(),
    [trips]
  )

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (trips ?? []).filter((trip) => {
      const matchesSearch = !query || trip.name.toLowerCase().includes(query)
      const matchesSchool = schoolFilter === ALL_SCHOOLS || trip.school.name === schoolFilter
      return matchesSearch && matchesSchool
    })
  }, [trips, search, schoolFilter])

  const days = useMemo(() => eachDayOfInterval({ start: monthDate, end: endOfMonth(monthDate) }), [monthDate])

  const slotByTitle = useMemo(() => {
    const map = new Map<string, number>()
    for (const trip of filteredTrips) {
      for (const item of [...trip.itineraryItems].sort((a, b) => a.dayNumber - b.dayNumber)) {
        if (!map.has(item.title) && map.size < SLOT_DOT_CLASSES.length) {
          map.set(item.title, map.size)
        }
      }
    }
    return map
  }, [filteredTrips])

  return (
    <>
      <SiteHeader title="Organizador" subtitle="Grilla de actividades por día" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setMonthDate((d) => subMonths(d, 1))}>
              <ChevronLeftIcon className="size-4" />
              <span className="sr-only">Mes anterior</span>
            </Button>
            <span className="min-w-36 text-center text-sm font-semibold capitalize">
              {format(monthDate, 'MMMM yyyy', { locale: es })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setMonthDate((d) => addMonths(d, 1))}>
              <ChevronRightIcon className="size-4" />
              <span className="sr-only">Mes siguiente</span>
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-56">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Buscar gira…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="sm:w-52">
                <SelectValue placeholder="Colegio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SCHOOLS}>Todos los colegios</SelectItem>
                {schoolOptions.map((school) => (
                  <SelectItem key={school} value={school}>
                    {school}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {slotByTitle.size ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {Array.from(slotByTitle.entries()).map(([title, slot]) => (
              <span key={title} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`size-2.5 shrink-0 rounded-full ${SLOT_DOT_CLASSES[slot]}`} />
                {title}
              </span>
            ))}
          </div>
        ) : null}

        {loadError && !trips ? (
          <FetchError message={loadError} onRetry={() => void load(monthDate)} />
        ) : !trips ? (
          <Skeleton className="h-96 w-full" />
        ) : filteredTrips.length ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-background">Gira</TableHead>
                    <TableHead>Colegio</TableHead>
                    <TableHead>Programa</TableHead>
                    <TableHead>Pax</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>In-Out</TableHead>
                    {days.map((day) => (
                      <TableHead key={day.toISOString()} className="text-center">
                        {format(day, 'd')}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrips.map((trip) => {
                    const start = new Date(trip.startDate)
                    const end = new Date(trip.endDate)
                    return (
                      <TableRow key={trip.id}>
                        <TableCell className="sticky left-0 z-10 bg-background font-medium">
                          <Link href={`/admin/trips/${trip.id}`} className="hover:underline">
                            {trip.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{trip.school.name}</TableCell>
                        <TableCell className="text-muted-foreground">{trip.program.name}</TableCell>
                        <TableCell>{trip.studentCount}</TableCell>
                        <TableCell className="text-muted-foreground">{trip.hotel ?? '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {format(start, 'd MMM', { locale: es })}–{format(end, 'd MMM', { locale: es })}
                        </TableCell>
                        {days.map((day) => {
                          if (day < start || day > end) {
                            return <TableCell key={day.toISOString()} className="bg-muted/20" />
                          }
                          const dayItems = trip.itineraryItems.filter((item) => isSameDay(itemDate(trip, item.dayNumber), day))
                          return (
                            <TableCell key={day.toISOString()} className="min-w-28 text-xs">
                              {dayItems.map((item) => {
                                const slot = slotByTitle.get(item.title)
                                return (
                                  <span key={item.title} className="flex items-center gap-1.5">
                                    {slot !== undefined ? (
                                      <span className={`size-1.5 shrink-0 rounded-full ${SLOT_DOT_CLASSES[slot]}`} />
                                    ) : null}
                                    {item.title}
                                  </span>
                                )
                              })}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={LayoutGridIcon}
            title="Sin giras este mes."
            description="Ajusta el mes o los filtros para ver otras giras."
          />
        )}
      </div>
    </>
  )
}
