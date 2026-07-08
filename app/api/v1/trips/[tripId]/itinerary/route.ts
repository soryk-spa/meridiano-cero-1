import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireTripAccess, requireTripWrite } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

export const GET = withApiHandler<{ tripId: string }>(async (_request, { params }) => {
  const { tripId } = await params
  await requireTripAccess(tripId)

  const items = await prisma.itineraryItem.findMany({
    where: { tripId },
    orderBy: { order: 'asc' },
  })

  return NextResponse.json({ items })
})

const bodySchema = z.object({
  time: z.string().trim().min(1),
  title: z.string().trim().min(1),
  location: z.string().trim().min(1),
  description: z.string().trim().min(1),
  order: z.number().int().nonnegative().optional(),
})

export const POST = withApiHandler<{ tripId: string }>(async (request, { params }) => {
  const { tripId } = await params
  await requireTripWrite(tripId, [Role.MONITOR])

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Missing or invalid itinerary item fields.')

  let order = parsed.data.order
  if (order === undefined) {
    const last = await prisma.itineraryItem.findFirst({ where: { tripId }, orderBy: { order: 'desc' } })
    order = (last?.order ?? -1) + 1
  }

  const item = await prisma.itineraryItem.create({
    data: { ...parsed.data, order, tripId },
  })

  return NextResponse.json({ item }, { status: 201 })
})
