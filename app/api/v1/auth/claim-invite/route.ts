import { NextResponse } from 'next/server'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { withApiHandler } from '@/lib/api/handler'

/**
 * Grants access if the signed-in user accepted an invitation carrying
 * pendingAdminInvite or pendingMonitorInvite metadata (set by the team/trip
 * invite endpoints). This is the only way admin/monitor access is granted on
 * the web — there is no code-redemption flow here.
 */
export const POST = withApiHandler(async () => {
  const user = await currentUser()
  if (!user) throw new ApiError('UNAUTHENTICATED', 'You must be signed in.')

  const pendingAdminInvite = user.publicMetadata.pendingAdminInvite === true
  const pendingMonitorTripId =
    typeof user.publicMetadata.pendingMonitorInvite === 'string'
      ? user.publicMetadata.pendingMonitorInvite
      : null

  if (!pendingAdminInvite && !pendingMonitorTripId) {
    return NextResponse.json({ granted: false })
  }

  if (pendingAdminInvite) {
    await prisma.adminUser.upsert({
      where: { clerkUserId: user.id },
      update: {},
      create: { clerkUserId: user.id },
    })
  }

  if (pendingMonitorTripId) {
    await prisma.tripMembership.upsert({
      where: {
        clerkUserId_tripId_role: {
          clerkUserId: user.id,
          tripId: pendingMonitorTripId,
          role: Role.MONITOR,
        },
      },
      update: {},
      create: { clerkUserId: user.id, tripId: pendingMonitorTripId, role: Role.MONITOR },
    })
  }

  const remainingMetadata = { ...user.publicMetadata }
  delete remainingMetadata.pendingAdminInvite
  delete remainingMetadata.pendingMonitorInvite
  const client = await clerkClient()
  await client.users.updateUser(user.id, { publicMetadata: remainingMetadata })

  return NextResponse.json({ granted: true })
})
