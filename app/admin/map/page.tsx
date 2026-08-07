'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { SearchIcon } from 'lucide-react'
import type { TripStatus } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import StatusBadge from '@/components/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { FetchError } from '@/components/fetch-error'
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

export default function AdminMapPage() {
  const [fleet, setFleet] = useState<FleetTrip[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState<string[]>([])
  const [destinationFilter, setDestinationFilter] = useState<string[]>([])

  const load = useCallback(async () => {
    setError(null)
    const res = await fetch('/api/v1/admin/map')
    if (res.ok) {
      setFleet((await res.json()).fleet)
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error?.message ?? 'No se pudo cargar el mapa.')
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(id)
  }, [load])

  const schoolOptions = useMemo(
    () => Array.from(new Set((fleet ?? []).map((trip) => trip.school))).sort(),
    [fleet]
  )
  const destinationOptions = useMemo(
    () => Array.from(new Set((fleet ?? []).map((trip) => trip.destination))).sort(),
    [fleet]
  )

  const filteredFleet = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (fleet ?? []).filter((trip) => {
      const matchesSearch =
        !query || trip.name.toLowerCase().includes(query) || trip.destination.toLowerCase().includes(query)
      const matchesSchool = schoolFilter.length === 0 || schoolFilter.includes(trip.school)
      const matchesDestination = destinationFilter.length === 0 || destinationFilter.includes(trip.destination)
      return matchesSearch && matchesSchool && matchesDestination
    })
  }, [fleet, search, schoolFilter, destinationFilter])

  if (error && !fleet) {
    return (
      <>
        <SiteHeader title="Mapa operativo" subtitle="Giras en terreno en tiempo real" />
        <FetchError message={error} onRetry={load} />
      </>
    )
  }

  if (!fleet) {
    return (
      <>
        <SiteHeader title="Mapa operativo" subtitle="Giras en terreno en tiempo real" />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <Skeleton className="h-[calc(100vh-180px)] w-full" />
        </div>
      </>
    )
  }

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
      <SiteHeader title="Mapa operativo" subtitle="Giras en terreno en tiempo real" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar gira o destino…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <MultiSelectFilter
            options={schoolOptions}
            selected={schoolFilter}
            onChange={setSchoolFilter}
            placeholder="Colegio"
            className="sm:w-56"
          />
          <MultiSelectFilter
            options={destinationOptions}
            selected={destinationFilter}
            onChange={setDestinationFilter}
            placeholder="Destino"
            className="sm:w-56"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            {markers.length ? (
              <FleetMapView
                markers={markers}
                selectedId={selectedId}
                onMarkerClick={setSelectedId}
                height="calc(100vh - 232px)"
              />
            ) : (
              <CardContent className="flex h-[calc(100vh-232px)] items-center justify-center text-muted-foreground">
                {fleet && fleet.length > 0 ? 'Sin giras que coincidan con el filtro.' : 'Sin giras en terreno actualmente.'}
              </CardContent>
            )}
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="flex h-[calc(100vh-232px)] flex-col gap-1 overflow-y-auto p-2">
              {filteredFleet.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => setSelectedId(trip.id)}
                  className={`flex flex-col gap-1 rounded-md p-3 text-left transition-colors hover:bg-muted ${selectedId === trip.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{trip.name}</span>
                    <StatusBadge status={trip.status} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {trip.school} · {trip.destination}
                  </span>
                  {trip.ping ? (
                    <span className="text-xs text-muted-foreground">
                      Última señal {new Date(trip.ping.createdAt).toLocaleTimeString('es-CL')}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin señal reciente</span>
                  )}
                </button>
              ))}
              {filteredFleet.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  {fleet && fleet.length > 0 ? 'Sin giras que coincidan con el filtro.' : 'Sin giras en terreno actualmente.'}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
