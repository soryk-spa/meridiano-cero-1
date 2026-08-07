'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { addDays, eachDayOfInterval, format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { LayoutGridIcon, SearchIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { SiteHeader } from '@/components/site-header'
import { DateRangePicker } from '@/components/date-range-picker'
import { EmptyState } from '@/components/empty-state'
import { FetchError } from '@/components/fetch-error'
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
  destination: string
  school: { name: string }
  program: { name: string }
  studentCount: number
  hotel: string | null
  startDate: string
  endDate: string
  currentDay: number
  totalDays: number
  itineraryItems: { dayNumber: number; time: string; title: string }[]
}

const ALL_SCHOOLS = 'all'
const ALL_DESTINATIONS = 'all'
const MAX_RANGE_DAYS = 62

function itemDate(trip: ScheduleTrip, dayNumber: number) {
  return addDays(new Date(trip.startDate), dayNumber - 1)
}

function defaultRange(): DateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return { from: today, to: addDays(today, 20) }
}

export default function AdminSchedulePage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange)
  const [trips, setTrips] = useState<ScheduleTrip[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState(ALL_SCHOOLS)
  const [destinationFilter, setDestinationFilter] = useState(ALL_DESTINATIONS)

  const load = useCallback(async (from: Date, to: Date) => {
    setTrips(null)
    setLoadError(null)
    const params = new URLSearchParams({ from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') })
    const res = await fetch(`/api/v1/admin/schedule?${params}`)
    if (res.ok) {
      setTrips((await res.json()).trips)
    } else {
      const data = await res.json().catch(() => null)
      setLoadError(data?.error?.message ?? 'No se pudo cargar el calendario.')
    }
  }, [])

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return
    const from = dateRange.from
    const to = dateRange.to
    const id = window.setTimeout(() => void load(from, to), 0)
    return () => window.clearTimeout(id)
  }, [dateRange, load])

  const schoolOptions = useMemo(
    () => Array.from(new Set((trips ?? []).map((trip) => trip.school.name))).sort(),
    [trips]
  )
  const destinationOptions = useMemo(
    () => Array.from(new Set((trips ?? []).map((trip) => trip.destination))).sort(),
    [trips]
  )

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (trips ?? []).filter((trip) => {
      const matchesSearch = !query || trip.name.toLowerCase().includes(query)
      const matchesSchool = schoolFilter === ALL_SCHOOLS || trip.school.name === schoolFilter
      const matchesDestination = destinationFilter === ALL_DESTINATIONS || trip.destination === destinationFilter
      return matchesSearch && matchesSchool && matchesDestination
    })
  }, [trips, search, schoolFilter, destinationFilter])

  const days = useMemo(() => {
    if (!filteredTrips.length) return []
    const starts = filteredTrips.map((trip) => new Date(trip.startDate).getTime())
    const ends = filteredTrips.map((trip) => new Date(trip.endDate).getTime())
    return eachDayOfInterval({ start: new Date(Math.min(...starts)), end: new Date(Math.max(...ends)) })
  }, [filteredTrips])
  const spanTooLarge = days.length > MAX_RANGE_DAYS

  return (
    <>
      <SiteHeader title="Organizador" subtitle="Grilla de actividades por día" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:w-64">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-48">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Buscar gira…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="sm:w-44">
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
            <Select value={destinationFilter} onValueChange={setDestinationFilter}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DESTINATIONS}>Todos los destinos</SelectItem>
                {destinationOptions.map((destination) => (
                  <SelectItem key={destination} value={destination}>
                    {destination}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loadError && !trips ? (
          <FetchError
            message={loadError}
            onRetry={() => dateRange?.from && dateRange?.to && void load(dateRange.from, dateRange.to)}
          />
        ) : !trips ? (
          <Skeleton className="h-96 w-full" />
        ) : spanTooLarge ? (
          <EmptyState
            icon={LayoutGridIcon}
            title="Las giras visibles abarcan un rango muy amplio."
            description={`Achica los filtros o el rango de fechas para ver el detalle día por día (máximo ${MAX_RANGE_DAYS} días).`}
          />
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
                      <TableHead key={day.toISOString()} className="whitespace-nowrap text-center">
                        {format(day, 'd MMM', { locale: es })}
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
                          <p className="text-xs font-normal text-muted-foreground">
                            Día {trip.currentDay} de {trip.totalDays}
                          </p>
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
                            <TableCell key={day.toISOString()} className="min-w-32 text-xs">
                              {dayItems.map((item) => (
                                <span key={item.title} className="flex items-start gap-1.5">
                                  <span className="text-muted-foreground">–</span>
                                  <span>
                                    {item.title} <span className="text-muted-foreground">({item.time})</span>
                                  </span>
                                </span>
                              ))}
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
            title="Sin giras en este rango."
            description="Ajusta las fechas o los filtros para ver otras giras."
          />
        )}
      </div>
    </>
  )
}
