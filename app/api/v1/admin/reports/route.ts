import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

export const GET = withApiHandler(async () => {
  await requireAdmin()

  const announcements = await prisma.announcement.findMany({
    where: { type: { in: ['ALERT', 'ACHIEVEMENT'] } },
    include: { trip: { select: { id: true, name: true, school: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ announcements })
})
