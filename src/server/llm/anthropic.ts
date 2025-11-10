import Anthropic from '@anthropic-ai/sdk'
import { ENV } from '../env'

// Official messages.create usage pattern (model id updated as needed) 
export const anthropic = new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY })

export async function askClaude({
  system,
  user,
  model = 'claude-sonnet-4-5-20250929', // keep as constant/param; update to the latest Sonnet 4.5 alias you have
  max_tokens = 1000,
}: {
  system?: string
  user: string
  model?: string
  max_tokens?: number
}) {
  return anthropic.messages.create({
    model,
    max_tokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
}
