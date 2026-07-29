import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

export const GET = withApiHandler<{ id: string }>(async (_request, { params }) => {
  await requireAdmin()
  const { id } = await params

  const program = await prisma.program.findUnique({
    where: { id },
    include: { items: { orderBy: [{ dayNumber: 'asc' }, { order: 'asc' }] } },
  })
  if (!program) throw new ApiError('NOT_FOUND', 'Program not found.')

  return NextResponse.json({ program })
})

const bodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).nullable().optional(),
})

export const PATCH = withApiHandler<{ id: string }>(async (request, { params }) => {
  await requireAdmin()
  const { id } = await params

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Invalid program update payload.')
  if (Object.keys(parsed.data).length === 0) throw new ApiError('VALIDATION_ERROR', 'Nothing to update.')

  const existing = await prisma.program.findUnique({ where: { id } })
  if (!existing) throw new ApiError('NOT_FOUND', 'Program not found.')

  const program = await prisma.program.update({ where: { id }, data: parsed.data })

  return NextResponse.json({ program })
})

export const DELETE = withApiHandler<{ id: string }>(async (_request, { params }) => {
  await requireAdmin()
  const { id } = await params

  const existing = await prisma.program.findUnique({ where: { id } })
  if (!existing) throw new ApiError('NOT_FOUND', 'Program not found.')

  const tripCount = await prisma.trip.count({ where: { programId: id } })
  if (tripCount > 0) {
    throw new ApiError(
      'VALIDATION_ERROR',
      `Cannot delete: ${tripCount} trip${tripCount === 1 ? '' : 's'} still use${tripCount === 1 ? 's' : ''} this program.`
    )
  }

  await prisma.program.delete({ where: { id } })

  return NextResponse.json({ ok: true })
})
