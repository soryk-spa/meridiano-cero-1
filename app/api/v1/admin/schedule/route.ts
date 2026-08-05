import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

function parseMonth(param: string | null): { start: Date; end: Date } {
  const match = param?.match(/^(\d{4})-(\d{2})$/)
  const now = new Date()
  const year = match ? Number(match[1]) : now.getUTCFullYear()
  const monthIndex = match ? Number(match[2]) - 1 : now.getUTCMonth()

  const start = new Date(Date.UTC(year, monthIndex, 1))
  const end = new Date(Date.UTC(year, monthIndex + 1, 1))
  return { start, end }
}

export const GET = withApiHandler(async (request) => {
  await requireAdmin()

  const { searchParams } = new URL(request.url)
  const { start, end } = parseMonth(searchParams.get('month'))

  const trips = await prisma.trip.findMany({
    where: { startDate: { lt: end }, endDate: { gte: start } },
    include: {
      school: { select: { name: true } },
      program: { select: { name: true } },
      itineraryItems: { select: { dayNumber: true, title: true }, orderBy: { dayNumber: 'asc' } },
    },
    orderBy: { startDate: 'asc' },
  })

  return NextResponse.json({ month: { start, end }, trips })
})
