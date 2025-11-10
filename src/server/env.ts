import { z } from 'zod'

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  VOYAGE_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
})

export const ENV = EnvSchema.parse({
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  VOYAGE_API_KEY: process.env.VOYAGE_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
})
