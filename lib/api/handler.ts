import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api/errors'

type RouteContext<Params> = { params: Promise<Params> }
type RouteHandler<Params> = (
  request: Request,
  context: RouteContext<Params>
) => Promise<NextResponse>

/** Wraps a route handler so thrown ApiErrors (and unexpected errors) become the right HTTP response. */
export function withApiHandler<Params = Record<string, never>>(
  handler: RouteHandler<Params>
): RouteHandler<Params> {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
