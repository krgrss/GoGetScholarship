/**
 * Lightweight telemetry helpers.
 * - Currently log timings and outcomes to console.
 * - Designed so we can later swap in Langfuse/OpenTelemetry with minimal changes.
 */
export type TelemetryStep =
  | 'embed'
  | 'retrieve'
  | 'rerank'
  | 'draft'
  | 'personality'
  | 'explain-fit'
  | 'grade'
  | 'pipeline'

export type TelemetryEvent = {
  step: TelemetryStep
  ok: boolean
  durationMs: number
  meta?: Record<string, unknown>
  error?: string
}

const MAX_EVENTS = 200
const buffer: TelemetryEvent[] = []

export function recordTelemetry(event: TelemetryEvent) {
  const metaWithTs = { ...(event.meta ?? {}), ts: Date.now() }
  const enriched: TelemetryEvent = { ...event, meta: metaWithTs }
  buffer.push(enriched)
  if (buffer.length > MAX_EVENTS) {
    buffer.splice(0, buffer.length - MAX_EVENTS)
  }

  const { step, ok, durationMs, meta, error } = enriched
  const payload = { step, ok, durationMs, meta, error }
  // eslint-disable-next-line no-console
  console.log('[telemetry]', JSON.stringify(payload))
}

export function getTelemetryEvents(limit = 100): TelemetryEvent[] {
  if (limit <= 0) return []
  const slice = buffer.slice(-limit)
  return slice.reverse()
}
