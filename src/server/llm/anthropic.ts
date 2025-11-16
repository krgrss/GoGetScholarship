/**
 * Anthropic client utilities
 * - Shared SDK client sourced from ENV.
 * - `askClaude` helper centralizes default model and adds an optional timeout.
 */
import Anthropic from '@anthropic-ai/sdk'
import { ENV } from '../env'

// Single Anthropic client + centralized default model
export const anthropic = new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY })

const DEFAULT_ANTHROPIC_MODEL = ENV.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest'

/**
 * askClaude: thin wrapper around Anthropic messages.create with optional timeout.
 * - Centralizes the default model to avoid drift across modules.
 * - Supports a soft timeout; it will reject after timeoutMs but cannot cancel the HTTP request.
 */
export async function askClaude({
  system,
  user,
  model = DEFAULT_ANTHROPIC_MODEL,
  max_tokens = 1000,
  timeoutMs = 20000,
}: {
  system?: string
  user: string
  model?: string
  max_tokens?: number
  timeoutMs?: number
}) {
  /**
   * Call Anthropic Messages API with a single user message.
   * @param system Optional system prompt.
   * @param user User content (string) to send.
   * @param model Model name; defaults to ENV.ANTHROPIC_MODEL.
   * @param max_tokens Max output tokens.
   * @param timeoutMs Soft timeout for the call (ms).
   * @returns Anthropic `Message` response.
   */
  const work = anthropic.messages.create({
    model,
    max_tokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const timeout = new Promise((_, rej) =>
    setTimeout(() => rej(new Error(`Claude timeout after ${timeoutMs}ms`)), timeoutMs),
  )
  return (await Promise.race([work, timeout])) as Awaited<typeof work>
}
