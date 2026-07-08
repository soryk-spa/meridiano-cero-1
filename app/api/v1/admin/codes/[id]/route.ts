import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

export const DELETE = withApiHandler<{ id: string }>(async (_request, { params }) => {
  await requireAdmin()
  const { id } = await params

  await prisma.accessCode.delete({ where: { id } })

  return NextResponse.json({ ok: true })
})
