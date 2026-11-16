import { z } from 'zod';

/**
 * Zod schema for environment variable validation at application startup.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_TIMEZONE: z.string().default('Asia/Dhaka'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().default('mess_meal_manager'),

  JWT_ACCESS_SECRET: z.string().min(16).default('development_jwt_access_secret_key_32_chars_min'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16).default('development_jwt_refresh_secret_key_32_chars_min'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16).default('development_cookie_secret_key_32_chars_min'),

  THROTTLE_TTL: z.coerce.number().default(60),
  THROTTLE_LIMIT: z.coerce.number().default(100),

  CORS_ORIGIN: z.string().default('http://localhost:3000')
});

export type EnvConfig = z.infer<typeof EnvSchema>;

/**
 * Validates process environment variables.
 *
 * @param config - Raw process.env record.
 * @returns Validated environment configuration object.
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Environment validation failed: ${errorDetails}`);
  }
  return result.data;
}
