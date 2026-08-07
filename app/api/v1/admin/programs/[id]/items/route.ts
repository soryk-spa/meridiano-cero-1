import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

const bodySchema = z.object({
  dayNumber: z.number().int().min(1),
  time: z.string().trim().min(1),
  title: z.string().trim().min(1),
  location: z.string().trim().min(1),
  description: z.string().trim().min(1),
  order: z.number().int().nonnegative().optional(),
  requirementsMessage: z.string().trim().min(1).nullable().optional(),
})

export const POST = withApiHandler<{ id: string }>(async (request, { params }) => {
  await requireAdmin()
  const { id: programId } = await params

  const program = await prisma.program.findUnique({ where: { id: programId } })
  if (!program) throw new ApiError('NOT_FOUND', 'Program not found.')

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Missing or invalid program item fields.')

  let order = parsed.data.order
  if (order === undefined) {
    const last = await prisma.programItem.findFirst({ where: { programId }, orderBy: { order: 'desc' } })
    order = (last?.order ?? -1) + 1
  }

  const item = await prisma.programItem.create({
    data: { ...parsed.data, order, programId },
  })

  return NextResponse.json({ item }, { status: 201 })
})
