/**
 * Extract the concatenated text content from an Anthropic Message response.
 * Tolerates structured content arrays; returns a best-effort string for parsing.
 */
export function extractAnthropicText(res: any): string {
  try {
    const content = Array.isArray(res?.content) ? res.content : []
    const text = content
      .map((c: any) => (typeof c?.text === 'string' ? c.text : ''))
      .join('')
      .trim()
    if (text) return text
  } catch {}
  return typeof res === 'string' ? res : JSON.stringify(res ?? {})
}

/**
 * Coerce a possibly fenced/verbose string into parseable JSON.
 * - Strips Markdown code fences if present
 * - Trims outer content to the first/last curly brace pair
 */
export function coerceMinifiedJson<T = unknown>(s: string): T {
  let t = s.trim()
  // Strip markdown code fences if present
  if (t.startsWith('```')) {
    t = t.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '')
  }
  // Trim to outermost JSON object
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) t = t.slice(start, end + 1)
  return JSON.parse(t) as T
}
