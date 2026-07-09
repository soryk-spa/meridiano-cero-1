import { NextResponse } from 'next/server'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { withApiHandler } from '@/lib/api/handler'

/** Grants admin access if the signed-in user accepted an invitation created with pendingAdminInvite metadata. */
export const POST = withApiHandler(async () => {
  const user = await currentUser()
  if (!user) throw new ApiError('UNAUTHENTICATED', 'You must be signed in.')

  if (user.publicMetadata.pendingAdminInvite !== true) {
    return NextResponse.json({ granted: false })
  }

  await prisma.adminUser.upsert({
    where: { clerkUserId: user.id },
    update: {},
    create: { clerkUserId: user.id },
  })

  const remainingMetadata = { ...user.publicMetadata }
  delete remainingMetadata.pendingAdminInvite
  const client = await clerkClient()
  await client.users.updateUser(user.id, { publicMetadata: remainingMetadata })

  return NextResponse.json({ granted: true })
})
