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
  // Allow explicit bypass ONLY when ADMIN_API_KEY is not set, or when server-side flag is true.
  const bypass = !expected || process.env.ADMIN_API_KEY_BYPASS === 'true'
  if (bypass) return { ok: true as const }
  if (!expected) return { ok: true as const }
  // Accept multiple header names to stay compatible with existing clients
  const provided =
    request.headers.get('x-admin-key') ||
    request.headers.get('admin-api-key') ||
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

export function parseCookies(request: Request): Record<string, string> {
  const raw = request.headers.get('cookie') || ''
  return raw.split(';').reduce((acc, part) => {
    const [k, v] = part.split('=').map((s) => s?.trim())
    if (k && v) acc[k] = decodeURIComponent(v)
    return acc
  }, {} as Record<string, string>)
}

const STUDENT_COOKIE = 'student_id'

export function getStudentIdFromRequest(request: Request): string | null {
  const cookies = parseCookies(request)
  return cookies[STUDENT_COOKIE] || null
}

export function setStudentCookie(studentId: string) {
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days
  return `student_id=${encodeURIComponent(studentId)}; HttpOnly; Path=/; SameSite=Lax; Expires=${expires.toUTCString()}`
}

export function clearStudentCookie() {
  return `student_id=; HttpOnly; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
}
