/**
 * Simple API key check for admin-only endpoints.
 *
 * Usage:
 *   const auth = checkAdminKey(request, ENV.ADMIN_API_KEY)
 *   if (!auth.ok) return auth.res
 */
/**
 * Validate admin API key for protected routes.
 * Accepts `x-admin-key`, `x-api-key`, or `Authorization: Bearer` headers.
 * @param request Incoming Request
 * @param expected Expected key from ENV.ADMIN_API_KEY (optional). If not set, always passes.
 * @returns `{ ok: true }` or `{ ok: false, res: Response }` for 401.
 */
export function checkAdminKey(request: Request, expected?: string) {
  if (!expected) return { ok: true as const }
  const provided =
    request.headers.get('x-admin-key') ||
    request.headers.get('x-api-key') ||
    (request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '')
  if (provided && provided === expected) return { ok: true as const }
  return {
    ok: false as const,
    res: new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  }
}
