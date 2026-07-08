import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireTripAccess } from '@/lib/api/require-role'
import { describeUsers } from '@/lib/api/clerk-users'
import { withApiHandler } from '@/lib/api/handler'

export const GET = withApiHandler<{ tripId: string }>(async (_request, { params }) => {
  const { tripId } = await params
  const { role } = await requireTripAccess(tripId)
  if (role !== 'ADMIN' && role !== 'MONITOR') {
    throw new ApiError('FORBIDDEN', 'Only monitors or admins can view the roster.')
  }

  const memberships = await prisma.tripMembership.findMany({
    where: { tripId, role: { in: [Role.PARENT, Role.MONITOR] } },
    orderBy: { createdAt: 'asc' },
  })

  const users = await describeUsers(memberships.map((membership) => membership.clerkUserId))
  const toRow = (membership: (typeof memberships)[number]) => ({
    id: membership.id,
    ...users.get(membership.clerkUserId)!,
  })
  const parents = memberships.filter((m) => m.role === Role.PARENT).map(toRow)
  const monitors = memberships.filter((m) => m.role === Role.MONITOR).map(toRow)

  return NextResponse.json({ parents, monitors })
})
