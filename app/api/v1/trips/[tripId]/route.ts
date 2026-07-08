import { NextResponse } from 'next/server'
import { z } from 'zod'
import { differenceInCalendarDays } from 'date-fns'
import { TripStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireTripAccess } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

export const GET = withApiHandler<{ tripId: string }>(async (_request, { params }) => {
  const { tripId } = await params
  await requireTripAccess(tripId)

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { school: { select: { name: true } } },
  })
  if (!trip) throw new ApiError('NOT_FOUND', 'Trip not found.')

  return NextResponse.json({ trip })
})

const patchSchema = z.object({
  status: z.enum(TripStatus).optional(),
  name: z.string().trim().min(1).optional(),
  destination: z.string().trim().min(1).optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  studentCount: z.number().int().nonnegative().optional(),
})

export const PATCH = withApiHandler<{ tripId: string }>(async (request, { params }) => {
  const { tripId } = await params
  const { role } = await requireTripAccess(tripId)

  const json = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Invalid trip update payload.')

  const { status, startDate, endDate, ...detailFields } = parsed.data
  const hasDetailFields = startDate !== undefined || endDate !== undefined || Object.keys(detailFields).length > 0

  if (hasDetailFields && role !== 'ADMIN') {
    throw new ApiError('FORBIDDEN', 'Only admins can edit trip details.')
  }
  if (status !== undefined && role !== 'ADMIN' && role !== 'MONITOR') {
    throw new ApiError('FORBIDDEN', 'Only monitors or admins can update trip status.')
  }
  if (!hasDetailFields && status === undefined) {
    throw new ApiError('VALIDATION_ERROR', 'Nothing to update.')
  }

  const existing = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { status: true, startDate: true, endDate: true },
  })
  if (!existing) throw new ApiError('NOT_FOUND', 'Trip not found.')

  if (status !== undefined && existing.status === 'FINISHED' && status !== 'FINISHED') {
    throw new ApiError('VALIDATION_ERROR', 'Finished trips cannot change status.')
  }

  let totalDays: number | undefined
  if (startDate !== undefined || endDate !== undefined) {
    const effectiveStart = startDate !== undefined ? new Date(startDate) : existing.startDate
    const effectiveEnd = endDate !== undefined ? new Date(endDate) : existing.endDate
    if (effectiveEnd < effectiveStart) {
      throw new ApiError('VALIDATION_ERROR', 'endDate must be on or after startDate.')
    }
    totalDays = differenceInCalendarDays(effectiveEnd, effectiveStart) + 1
  }

  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...detailFields,
      ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
      ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}),
      ...(totalDays !== undefined ? { totalDays } : {}),
    },
  })

  return NextResponse.json({ trip })
})
