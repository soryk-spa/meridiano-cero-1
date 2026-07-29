'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CalendarRangeIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { ActivityTemplate, ProgramItem } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import { ActivityItemSheet, type ActivityItemEditing, type ActivityItemValues } from '@/components/activity-item-form'
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from '@/components/reui/timeline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'

type ProgramDetail = {
  id: string
  name: string
  description: string | null
  items: ProgramItem[]
}

export default function AdminProgramDetailPage() {
  const { programId } = useParams<{ programId: string }>()
  const [program, setProgram] = useState<ProgramDetail | null>(null)
  const [activityTemplates, setActivityTemplates] = useState<ActivityTemplate[]>([])
  const [itemOpen, setItemOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ActivityItemEditing | null>(null)

  const load = useCallback(async () => {
    const [programRes, activityTemplatesRes] = await Promise.all([
      fetch(`/api/v1/admin/programs/${programId}`),
      fetch('/api/v1/admin/activity-templates'),
    ])
    if (programRes.ok) setProgram((await programRes.json()).program)
    if (activityTemplatesRes.ok) setActivityTemplates((await activityTemplatesRes.json()).activityTemplates)
  }, [programId])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [load])

  function openCreateItem() {
    setEditingItem(null)
    setItemOpen(true)
  }

  function openEditItem(item: ProgramItem) {
    setEditingItem({
      id: item.id,
      dayNumber: item.dayNumber,
      time: item.time,
      title: item.title,
      location: item.location,
      description: item.description,
      requirementsMessage: item.requirementsMessage,
    })
    setItemOpen(true)
  }

  async function handleSaveItem(values: ActivityItemValues, editingItemId: string | null) {
    const res = await fetch(
      editingItemId
        ? `/api/v1/admin/programs/${programId}/items/${editingItemId}`
        : `/api/v1/admin/programs/${programId}/items`,
      {
        method: editingItemId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }
    )
    if (res.ok) {
      void load()
      return { ok: true }
    }
    const data = await res.json().catch(() => null)
    return { ok: false, error: data?.error?.message ?? 'No se pudo guardar la actividad.' }
  }

  async function handleDeleteItem(itemId: string) {
    if (!window.confirm('¿Eliminar esta actividad del programa?')) return
    const res = await fetch(`/api/v1/admin/programs/${programId}/items/${itemId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Actividad eliminada.')
      void load()
    } else {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? 'No se pudo eliminar la actividad.')
    }
  }

  if (!program) {
    return (
      <>
        <SiteHeader title="Programa" />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    )
  }

  const groupedByDay = Object.entries(
    program.items.reduce<Record<number, ProgramItem[]>>((groups, item) => {
      ;(groups[item.dayNumber] ??= []).push(item)
      return groups
    }, {})
  ).sort(([a], [b]) => Number(a) - Number(b))

  return (
    <>
      <SiteHeader title={program.name} subtitle={program.description ?? 'Programa reutilizable'} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Actividades del programa</CardTitle>
            <Button variant="outline" size="sm" onClick={openCreateItem}>
              <PlusIcon />
              Agregar
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-8">
            {groupedByDay.length ? (
              groupedByDay.map(([day, items]) => (
                <div key={day} className="flex flex-col gap-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Día {day}
                  </p>
                  <Timeline className="w-full">
                    {items.map((item, itemIdx) => (
                      <TimelineItem key={item.id} step={itemIdx + 1}>
                        <TimelineHeader className="flex items-start justify-between gap-3">
                          <div>
                            <TimelineSeparator />
                            <TimelineIndicator />
                            <TimelineDate>{item.time}</TimelineDate>
                            <TimelineTitle>{item.title}</TimelineTitle>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}>
                              <PencilIcon className="size-4" />
                              <span className="sr-only">Editar actividad</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2Icon className="size-4" />
                              <span className="sr-only">Eliminar actividad</span>
                            </Button>
                          </div>
                        </TimelineHeader>
                        <TimelineContent>
                          <p>{item.location}</p>
                          {item.description ? <p className="mt-1">{item.description}</p> : null}
                          {item.requirementsMessage ? (
                            <p className="mt-1">Requiere: {item.requirementsMessage}</p>
                          ) : null}
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                </div>
              ))
            ) : (
              <EmptyState
                icon={CalendarRangeIcon}
                title="Sin actividades todavía."
                description="Agrega la primera actividad de este programa."
              />
            )}
          </CardContent>
        </Card>
      </div>
      <ActivityItemSheet
        open={itemOpen}
        onOpenChange={setItemOpen}
        activityTemplates={activityTemplates}
        editingItem={editingItem}
        onSubmit={handleSaveItem}
      />
    </>
  )
}
