import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireTripAccess } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

export const DELETE = withApiHandler<{ tripId: string; membershipId: string }>(async (_request, { params }) => {
  const { tripId, membershipId } = await params
  const { role: callerRole } = await requireTripAccess(tripId)

  const membership = await prisma.tripMembership.findUnique({ where: { id: membershipId } })
  if (!membership || membership.tripId !== tripId) {
    throw new ApiError('NOT_FOUND', 'Roster entry not found.')
  }

  if (membership.role === Role.MONITOR && callerRole !== 'ADMIN') {
    throw new ApiError('FORBIDDEN', 'Only admins can remove a monitor from a trip.')
  }
  if (membership.role === Role.PARENT && callerRole !== 'ADMIN' && callerRole !== 'MONITOR') {
    throw new ApiError('FORBIDDEN', 'You do not have permission to remove this member.')
  }

  await prisma.tripMembership.delete({ where: { id: membershipId } })

  return NextResponse.json({ ok: true })
})
