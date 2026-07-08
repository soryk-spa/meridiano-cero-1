import { NextResponse } from 'next/server'
import { z } from 'zod'
import { del } from '@vercel/blob'
import { ItineraryStatus, Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireTripWrite } from '@/lib/api/require-role'
import { findItineraryItem } from '@/lib/api/itinerary'
import { withApiHandler } from '@/lib/api/handler'

const bodySchema = z.object({
  status: z.enum(ItineraryStatus).optional(),
  time: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  order: z.number().int().nonnegative().optional(),
})

export const PATCH = withApiHandler<{ tripId: string; itemId: string }>(async (request, { params }) => {
  const { tripId, itemId } = await params
  await requireTripWrite(tripId, [Role.MONITOR])

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Invalid itinerary item update payload.')
  if (Object.keys(parsed.data).length === 0) throw new ApiError('VALIDATION_ERROR', 'Nothing to update.')

  await findItineraryItem(tripId, itemId)

  const updated = await prisma.itineraryItem.update({
    where: { id: itemId },
    data: parsed.data,
  })

  return NextResponse.json({ item: updated })
})

export const DELETE = withApiHandler<{ tripId: string; itemId: string }>(async (_request, { params }) => {
  const { tripId, itemId } = await params
  await requireTripWrite(tripId, [Role.MONITOR])

  const item = await findItineraryItem(tripId, itemId)
  if (item.photoUrl) {
    await del(item.photoUrl).catch(() => {})
  }

  await prisma.itineraryItem.delete({ where: { id: itemId } })

  return NextResponse.json({ ok: true })
})
