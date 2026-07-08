import { clerkClient } from '@clerk/nextjs/server'

export type UserSummary = {
  clerkUserId: string
  name: string
  email: string
  imageUrl: string
}

/** Batches a Clerk user lookup for many ids into a single API call instead of one per id. */
export async function describeUsers(clerkUserIds: string[]): Promise<Map<string, UserSummary>> {
  const uniqueIds = Array.from(new Set(clerkUserIds))
  const result = new Map<string, UserSummary>()
  if (uniqueIds.length === 0) return result

  const client = await clerkClient()
  const { data: users } = await client.users.getUserList({
    userId: uniqueIds,
    limit: Math.min(uniqueIds.length, 500),
  })

  for (const user of users) {
    result.set(user.id, {
      clerkUserId: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Sin nombre',
      email: user.emailAddresses[0]?.emailAddress ?? '',
      imageUrl: user.imageUrl,
    })
  }

  for (const id of uniqueIds) {
    if (!result.has(id)) {
      result.set(id, { clerkUserId: id, name: 'Usuario no encontrado', email: '', imageUrl: '' })
    }
  }

  return result
}
