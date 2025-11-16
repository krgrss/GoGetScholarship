/**
 * Tiny in-memory rate limiter for development/hackathon use.
 * Not suitable for multi-instance production.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

function getClientKey(req: Request) {
  // Prefer proxy header, fallback to remote-less global key
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
  const ua = req.headers.get('user-agent') || ''
  return `${ip || 'global'}|${ua.slice(0, 40)}`
}

/**
 * Simple per-client, per-scope in-memory rate limiter.
 * Not suitable for multi-instance production usage.
 * @param request Incoming Request (used to derive a client key from IP/UA headers)
 * @param scope Logical scope name (e.g. 'api:draft')
 * @param windowMs Window in milliseconds
 * @param max Max requests allowed within the window
 * @returns `{ ok: true }` or `{ ok: false, res: Response }` for 429.
 */
export function rateLimit(
  request: Request,
  scope: string,
  { windowMs, max }: { windowMs: number; max: number },
) {
  const base = getClientKey(request)
  const key = `${scope}|${base}`
  const now = Date.now()
  const slot = buckets.get(key)
  if (!slot || now > slot.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true as const }
  }
  if (slot.count < max) {
    slot.count++
    return { ok: true as const }
  }
  const retry = Math.max(0, slot.resetAt - now)
  return {
    ok: false as const,
    res: new Response(
      JSON.stringify({ ok: false, error: 'Rate limit exceeded', retry_ms: retry }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(retry / 1000)),
        },
      },
    ),
  }
}
