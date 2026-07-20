import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AnnouncementType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

const bodySchema = z.object({
  title: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1).optional(),
  type: z.enum(AnnouncementType).optional(),
  category: z.string().trim().min(1).nullable().optional(),
})

export const PATCH = withApiHandler<{ id: string }>(async (request, { params }) => {
  await requireAdmin()
  const { id } = await params

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Invalid template update payload.')
  if (Object.keys(parsed.data).length === 0) throw new ApiError('VALIDATION_ERROR', 'Nothing to update.')

  const existing = await prisma.announcementTemplate.findUnique({ where: { id } })
  if (!existing) throw new ApiError('NOT_FOUND', 'Template not found.')

  const template = await prisma.announcementTemplate.update({ where: { id }, data: parsed.data })

  return NextResponse.json({ template })
})

export const DELETE = withApiHandler<{ id: string }>(async (_request, { params }) => {
  await requireAdmin()
  const { id } = await params

  const existing = await prisma.announcementTemplate.findUnique({ where: { id } })
  if (!existing) throw new ApiError('NOT_FOUND', 'Template not found.')

  await prisma.announcementTemplate.delete({ where: { id } })

  return NextResponse.json({ ok: true })
})
