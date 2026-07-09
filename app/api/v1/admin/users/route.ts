import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

const PAGE_SIZE = 20

export const GET = withApiHandler(async (request) => {
  await requireAdmin()

  const url = new URL(request.url)
  const query = url.searchParams.get('query')?.trim() || undefined
  const offset = Math.max(Number(url.searchParams.get('offset') ?? '0') || 0, 0)

  const client = await clerkClient()
  const { data: clerkUsers, totalCount } = await client.users.getUserList({
    limit: PAGE_SIZE,
    offset,
    query,
    orderBy: '-created_at',
  })

  const ids = clerkUsers.map((user) => user.id)
  const [adminRows, memberships] = await Promise.all([
    prisma.adminUser.findMany({ where: { clerkUserId: { in: ids } } }),
    prisma.tripMembership.findMany({
      where: { clerkUserId: { in: ids } },
      include: { trip: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const adminIds = new Set(adminRows.map((row) => row.clerkUserId))
  const membershipsByUser = new Map<
    string,
    { id: string; role: Role; tripId: string; tripName: string }[]
  >()
  for (const membership of memberships) {
    const list = membershipsByUser.get(membership.clerkUserId) ?? []
    list.push({ id: membership.id, role: membership.role, tripId: membership.tripId, tripName: membership.trip.name })
    membershipsByUser.set(membership.clerkUserId, list)
  }

  const users = clerkUsers.map((user) => ({
    clerkUserId: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Sin nombre',
    email: user.emailAddresses[0]?.emailAddress ?? '',
    imageUrl: user.imageUrl,
    createdAt: user.createdAt,
    isAdmin: adminIds.has(user.id),
    memberships: membershipsByUser.get(user.id) ?? [],
  }))

  return NextResponse.json({ users, totalCount, offset, limit: PAGE_SIZE })
})
