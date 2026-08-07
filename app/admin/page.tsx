'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowRightIcon, SearchIcon } from 'lucide-react'
import type { TripStatus } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import { SectionCards } from '@/components/section-cards'
import { type TripRow } from '@/components/data-table'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MultiSelectFilter } from '@/components/multi-select-filter'
import type { FleetMarker } from '@/components/FleetMapView'

const FleetMapView = dynamic(() => import('@/components/FleetMapView'), { ssr: false })

type FleetTrip = {
  id: string
  name: string
  destination: string
  status: TripStatus
  school: string
  ping: { lat: number; lng: number; createdAt: string } | null
  initialLat: number
  initialLng: number
}

const STATUS_COLOR: Record<TripStatus, string> = {
  IN_TRANSIT: '#f59e0b',
  IN_ACTIVITY: '#3b82f6',
  RESTING: '#22c55e',
  FINISHED: '#94a3b8',
}

export default function AdminPage() {
  const [trips, setTrips] = useState<TripRow[]>([])
  const [fleet, setFleet] = useState<FleetTrip[] | null>(null)
  const [mapSearch, setMapSearch] = useState('')
  const [mapSchoolFilter, setMapSchoolFilter] = useState<string[]>([])
  const [mapDestinationFilter, setMapDestinationFilter] = useState<string[]>([])

  useEffect(() => {
    const id = window.setTimeout(async () => {
      const res = await fetch('/api/v1/trips')
      if (res.ok) setTrips((await res.json()).trips)
    }, 0)

    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(async () => {
      const res = await fetch('/api/v1/admin/map')
      if (res.ok) setFleet((await res.json()).fleet)
    }, 0)

    return () => window.clearTimeout(id)
  }, [])

  const schoolCount = new Set(trips.map((t) => t.school.name)).size
  const codeCount = trips.reduce((sum, t) => sum + t.accessCodes.length, 0)
  const monitorCount = trips.reduce(
    (sum, t) => sum + t.accessCodes.filter((code) => code.role === 'MONITOR').length,
    0
  )
  const recentTrips = trips.slice(0, 5)

  const mapSchoolOptions = useMemo(
    () => Array.from(new Set((fleet ?? []).map((trip) => trip.school))).sort(),
    [fleet]
  )
  const mapDestinationOptions = useMemo(
    () => Array.from(new Set((fleet ?? []).map((trip) => trip.destination))).sort(),
    [fleet]
  )
  const filteredFleet = useMemo(() => {
    const query = mapSearch.trim().toLowerCase()
    return (fleet ?? []).filter((trip) => {
      const matchesSearch =
        !query || trip.name.toLowerCase().includes(query) || trip.destination.toLowerCase().includes(query)
      const matchesSchool = mapSchoolFilter.length === 0 || mapSchoolFilter.includes(trip.school)
      const matchesDestination = mapDestinationFilter.length === 0 || mapDestinationFilter.includes(trip.destination)
      return matchesSearch && matchesSchool && matchesDestination
    })
  }, [fleet, mapSearch, mapSchoolFilter, mapDestinationFilter])

  const markers: FleetMarker[] = filteredFleet.map((trip) => ({
    id: trip.id,
    lat: trip.ping?.lat ?? trip.initialLat,
    lng: trip.ping?.lng ?? trip.initialLng,
    label: trip.name,
    sublabel: trip.destination,
    color: STATUS_COLOR[trip.status],
  }))

  return (
    <>
      <SiteHeader title="Dashboard" subtitle="Administración de giras" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards
              tripCount={trips.length}
              codeCount={codeCount}
              schoolCount={schoolCount}
              monitorCount={monitorCount}
            />
            <div className="px-4 lg:px-6">
              <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Mapa operativo</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/map">
                      Ver mapa completo
                      <ArrowRightIcon />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative sm:w-56">
                      <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar gira o destino…"
                        value={mapSearch}
                        onChange={(e) => setMapSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <MultiSelectFilter
                      options={mapSchoolOptions}
                      selected={mapSchoolFilter}
                      onChange={setMapSchoolFilter}
                      placeholder="Colegio"
                      className="sm:w-48"
                    />
                    <MultiSelectFilter
                      options={mapDestinationOptions}
                      selected={mapDestinationFilter}
                      onChange={setMapDestinationFilter}
                      placeholder="Destino"
                      className="sm:w-48"
                    />
                  </div>
                  {markers.length ? (
                    <FleetMapView markers={markers} height="380px" />
                  ) : (
                    <div className="flex h-95 items-center justify-center rounded-lg border text-muted-foreground">
                      {fleet && fleet.length > 0 ? 'Sin giras que coincidan con el filtro.' : 'Sin giras en terreno actualmente.'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Giras recientes</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/trips">
                      Ver todas
                      <ArrowRightIcon />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Colegio</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>In-Out</TableHead>
                        <TableHead>Actividad actual</TableHead>
                        <TableHead>Monitor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTrips.length ? (
                        recentTrips.map((trip) => {
                          const currentActivity = trip.itineraryItems.find((item) => item.status !== 'COMPLETED')
                          return (
                            <TableRow key={trip.id}>
                              <TableCell>
                                <Link href={`/admin/trips/${trip.id}`} className="font-medium hover:underline">
                                  {trip.name}
                                </Link>
                              </TableCell>
                              <TableCell>{trip.school.name}</TableCell>
                              <TableCell>
                                <StatusBadge status={trip.status} />
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {format(new Date(trip.startDate), 'd MMM', { locale: es })}–
                                {format(new Date(trip.endDate), 'd MMM', { locale: es })}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{currentActivity?.title ?? '—'}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {trip.monitorNames.join(', ') || '—'}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Sin giras todavía.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
