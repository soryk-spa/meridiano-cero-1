'use client'

import { SearchIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Input } from '@/components/ui/input'
import { MultiSelectFilter } from '@/components/multi-select-filter'
import { DateRangePicker } from '@/components/date-range-picker'

/**
 * Consistent filter row (Grupo/búsqueda, Colegio, Destino, Coordinador, Fechas)
 * reused across Dashboard, Mapa, Organizador, Reportes y Usuarios. Each control
 * only renders when its `on*Change` handler is passed, so a page can opt into
 * just the filters relevant to it.
 */
export function GlobalFilters({
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar grupo…',
  groupOptions,
  groupFilter,
  onGroupFilterChange,
  schoolOptions,
  schoolFilter,
  onSchoolFilterChange,
  destinationOptions,
  destinationFilter,
  onDestinationFilterChange,
  monitorOptions,
  monitorFilter,
  onMonitorFilterChange,
  dateRange,
  onDateRangeChange,
}: {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /** Discrete Grupo multi-select — for pages where free-text `search` means something else (e.g. searching people). */
  groupOptions?: string[]
  groupFilter?: string[]
  onGroupFilterChange?: (value: string[]) => void
  schoolOptions?: string[]
  schoolFilter?: string[]
  onSchoolFilterChange?: (value: string[]) => void
  destinationOptions?: string[]
  destinationFilter?: string[]
  onDestinationFilterChange?: (value: string[]) => void
  monitorOptions?: string[]
  monitorFilter?: string[]
  onMonitorFilterChange?: (value: string[]) => void
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange | undefined) => void
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {onSearchChange ? (
        <div className="relative sm:w-56">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
      ) : null}
      {onGroupFilterChange ? (
        <MultiSelectFilter
          options={groupOptions ?? []}
          selected={groupFilter ?? []}
          onChange={onGroupFilterChange}
          placeholder="Grupo"
          className="sm:w-44"
        />
      ) : null}
      {onSchoolFilterChange ? (
        <MultiSelectFilter
          options={schoolOptions ?? []}
          selected={schoolFilter ?? []}
          onChange={onSchoolFilterChange}
          placeholder="Colegio"
          className="sm:w-44"
        />
      ) : null}
      {onDestinationFilterChange ? (
        <MultiSelectFilter
          options={destinationOptions ?? []}
          selected={destinationFilter ?? []}
          onChange={onDestinationFilterChange}
          placeholder="Destino"
          className="sm:w-44"
        />
      ) : null}
      {onMonitorFilterChange ? (
        <MultiSelectFilter
          options={monitorOptions ?? []}
          selected={monitorFilter ?? []}
          onChange={onMonitorFilterChange}
          placeholder="Coordinador"
          className="sm:w-44"
        />
      ) : null}
      {onDateRangeChange ? (
        <div className="sm:w-56">
          <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
        </div>
      ) : null}
    </div>
  )
}
