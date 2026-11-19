import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/server/db';
import { HttpError } from '@/lib/server/auth';
import { handleAuthRoute } from '@/lib/server/handlers/auth-handlers';
import { handleMessRootRoute, handleMessSubRoute } from '@/lib/server/handlers/mess-handlers';
import { handleMealRoute } from '@/lib/server/handlers/meal-handlers';
import { handleFinanceRoute } from '@/lib/server/handlers/finance-handlers';

export const dynamic = 'force-dynamic';

async function dispatch(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path: segments } = await context.params;
  const fullPath = `/api/${segments.join('/')}`;

  try {
    await ensureSchema();

    let body: Record<string, unknown> = {};
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method.toUpperCase())) {
      const text = await req.text();
      if (text.trim()) {
        try {
          body = JSON.parse(text) as Record<string, unknown>;
        } catch {
          throw new HttpError(400, 'INVALID_JSON', 'Request body must be valid JSON');
        }
      }
    }

    const root = segments[0];

    if (root === 'health') {
      return NextResponse.json({ data: { status: 'ok', database: 'postgresql' } });
    }

    if (root === 'auth') {
      return await handleAuthRoute(req, segments.slice(1).join('/'), body);
    }

    if (root === 'messes') {
      // /api/messes, /api/messes/my, PATCH /api/messes/:messId
      if (segments.length <= 2) {
        return await handleMessRootRoute(req, segments, body);
      }

      const messId = segments[1]!;
      const subSegments = segments.slice(2);
      const resource = subSegments[0];

      if (
        resource === 'members' ||
        resource === 'notices' ||
        resource === 'audit' ||
        resource === 'join-requests'
      ) {
        return await handleMessSubRoute(req, messId, subSegments, body);
      }

      if (resource === 'meals' || resource === 'menus') {
        return await handleMealRoute(req, messId, subSegments, body);
      }

      if (
        resource === 'roster' ||
        resource === 'expenses' ||
        resource === 'ledger' ||
        resource === 'reports' ||
        resource === 'rates'
      ) {
        return await handleFinanceRoute(req, messId, subSegments, body);
      }
    }

    throw new HttpError(404, 'NOT_FOUND', 'Endpoint not found');
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      return NextResponse.json(
        {
          statusCode: err.statusCode,
          errorCode: err.errorCode,
          message: err.message,
          timestamp: new Date().toISOString(),
          path: fullPath
        },
        { status: err.statusCode }
      );
    }

    console.error('[API ERROR]', fullPath, err instanceof Error ? err.message : err);
    return NextResponse.json(
      {
        statusCode: 500,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong on the server. Please try again.',
        timestamp: new Date().toISOString(),
        path: fullPath
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, ctx);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, ctx);
}
