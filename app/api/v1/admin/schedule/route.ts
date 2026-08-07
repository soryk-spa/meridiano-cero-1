import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

const MAX_RANGE_DAYS = 90
const DEFAULT_RANGE_DAYS = 21

function parseRange(fromParam: string | null, toParam: string | null): { start: Date; end: Date } {
  const now = new Date()
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const defaultEnd = new Date(defaultStart)
  defaultEnd.setDate(defaultEnd.getDate() + DEFAULT_RANGE_DAYS)

  const start = fromParam && !Number.isNaN(Date.parse(fromParam)) ? new Date(fromParam) : defaultStart
  const end = toParam && !Number.isNaN(Date.parse(toParam)) ? new Date(toParam) : defaultEnd

  if (end < start) throw new ApiError('VALIDATION_ERROR', 'to must be on or after from.')

  const rangeDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  if (rangeDays > MAX_RANGE_DAYS) {
    throw new ApiError('VALIDATION_ERROR', `Range too large: max ${MAX_RANGE_DAYS} days.`)
  }

  return { start, end }
}

export const GET = withApiHandler(async (request) => {
  await requireAdmin()

  const { searchParams } = new URL(request.url)
  const { start, end } = parseRange(searchParams.get('from'), searchParams.get('to'))

  const trips = await prisma.trip.findMany({
    where: { startDate: { lte: end }, endDate: { gte: start } },
    include: {
      school: { select: { name: true } },
      program: { select: { name: true } },
      itineraryItems: { select: { dayNumber: true, title: true, time: true }, orderBy: { dayNumber: 'asc' } },
    },
    orderBy: { startDate: 'asc' },
  })

  return NextResponse.json({ range: { start, end }, trips })
})
