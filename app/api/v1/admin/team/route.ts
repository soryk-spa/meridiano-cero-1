import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api/require-role'
import { describeUsers } from '@/lib/api/clerk-users'
import { withApiHandler } from '@/lib/api/handler'

export const GET = withApiHandler(async () => {
  const { clerkUserId: currentUserId } = await requireAdmin()

  const [adminUsers, monitorMemberships] = await Promise.all([
    prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.tripMembership.findMany({
      where: { role: 'MONITOR' },
      include: { trip: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const monitorsByUser = new Map<string, { trips: { membershipId: string; id: string; name: string }[] }>()
  for (const membership of monitorMemberships) {
    const entry = monitorsByUser.get(membership.clerkUserId) ?? { trips: [] }
    entry.trips.push({ membershipId: membership.id, ...membership.trip })
    monitorsByUser.set(membership.clerkUserId, entry)
  }

  const users = await describeUsers([
    ...adminUsers.map((admin) => admin.clerkUserId),
    ...monitorsByUser.keys(),
  ])

  const admins = adminUsers.map((admin) => ({
    ...users.get(admin.clerkUserId)!,
    createdAt: admin.createdAt,
    isCurrentUser: admin.clerkUserId === currentUserId,
  }))
  const monitors = Array.from(monitorsByUser.entries()).map(([clerkUserId, { trips }]) => ({
    ...users.get(clerkUserId)!,
    trips,
  }))

  return NextResponse.json({ admins, monitors })
})
