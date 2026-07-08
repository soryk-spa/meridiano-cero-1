import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'

export async function findItineraryItem(tripId: string, itemId: string) {
  const item = await prisma.itineraryItem.findUnique({ where: { id: itemId } })
  if (!item || item.tripId !== tripId) throw new ApiError('NOT_FOUND', 'Itinerary item not found.')
  return item
}
