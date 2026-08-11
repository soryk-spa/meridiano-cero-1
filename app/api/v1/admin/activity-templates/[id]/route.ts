import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

const bodySchema = z.object({
  title: z.string().trim().min(1).optional(),
  destination: z.string().trim().min(1).nullable().optional(),
  defaultLocation: z.string().trim().min(1).nullable().optional(),
  description: z.string().trim().min(1).optional(),
  requirementsMessage: z.string().trim().min(1).nullable().optional(),
})

export const PATCH = withApiHandler<{ id: string }>(async (request, { params }) => {
  await requireAdmin()
  const { id } = await params

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Invalid activity template update payload.')
  if (Object.keys(parsed.data).length === 0) throw new ApiError('VALIDATION_ERROR', 'Nothing to update.')

  const existing = await prisma.activityTemplate.findUnique({ where: { id } })
  if (!existing) throw new ApiError('NOT_FOUND', 'Activity template not found.')

  const activityTemplate = await prisma.activityTemplate.update({ where: { id }, data: parsed.data })

  return NextResponse.json({ activityTemplate })
})

export const DELETE = withApiHandler<{ id: string }>(async (_request, { params }) => {
  await requireAdmin()
  const { id } = await params

  const existing = await prisma.activityTemplate.findUnique({ where: { id } })
  if (!existing) throw new ApiError('NOT_FOUND', 'Activity template not found.')

  await prisma.activityTemplate.delete({ where: { id } })

  return NextResponse.json({ ok: true })
})
