/**
 * Environment loader (zod-validated)
 * Required:
 * - ANTHROPIC_API_KEY, VOYAGE_API_KEY, DATABASE_URL
 * Defaults:
 * - ANTHROPIC_MODEL=claude-3-5-sonnet-latest, VOYAGE_MODEL=voyage-3.5, EMBED_DIM=1024
 * Optional:
 * - ADMIN_API_KEY (enables admin guard on certain routes)
 */
import { z } from 'zod'

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  VOYAGE_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  ANTHROPIC_MODEL: z.string().min(1).optional().default('claude-3-5-sonnet-latest'),
  VOYAGE_MODEL: z.string().min(1).optional().default('voyage-3.5'),
  EMBED_DIM: z.coerce.number().int().positive().optional().default(1024),
  ADMIN_API_KEY: z.string().optional(),
})

export const ENV = EnvSchema.parse({
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  VOYAGE_API_KEY: process.env.VOYAGE_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  VOYAGE_MODEL: process.env.VOYAGE_MODEL,
  EMBED_DIM: process.env.EMBED_DIM,
  ADMIN_API_KEY: process.env.ADMIN_API_KEY,
})
