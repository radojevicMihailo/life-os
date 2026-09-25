import { z } from "zod";

const stringWithContent = (fieldName: string) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required`);

const optionalProviderKey = (fieldName: string) =>
  z
    .string()
    .optional()
    .transform((value) => value?.trim())
    .refine(
      (value) => value === undefined || value.length > 0,
      `${fieldName} must not be empty when provided`,
    );

const positiveInteger = (fieldName: string) =>
  z.coerce
    .number()
    .int(`${fieldName} must be an integer`)
    .positive(`${fieldName} must be greater than zero`);

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid URL")
    .regex(
      /^postgres(ql)?:\/\//,
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
  SESSION_SIGNING_SECRET: z
    .string()
    .min(1, "SESSION_SIGNING_SECRET is required")
    .refine(
      (value) => new TextEncoder().encode(value).length >= 32,
      "SESSION_SIGNING_SECRET must be at least 32 bytes",
    ),
  ACCESS_TOKEN_HASH: stringWithContent("ACCESS_TOKEN_HASH"),
  ACCESS_TOKEN_PEPPER: stringWithContent("ACCESS_TOKEN_PEPPER"),
  ACCESS_TOKEN_VERSION: positiveInteger("ACCESS_TOKEN_VERSION"),
  SHORTCUT_TOKEN_HASH: stringWithContent("SHORTCUT_TOKEN_HASH"),
  CRON_SECRET: stringWithContent("CRON_SECRET"),
  APP_ORIGIN: z
    .string()
    .url("APP_ORIGIN must be a valid URL")
    .regex(/^https?:\/\//, "APP_ORIGIN must start with http:// or https://"),
  REPORTING_CURRENCY: z.literal("EUR").default("EUR"),
  DATABASE_POOL_MAX_CONNECTIONS: positiveInteger(
    "DATABASE_POOL_MAX_CONNECTIONS",
  ),
  DATABASE_CONNECTION_TIMEOUT_MS: positiveInteger(
    "DATABASE_CONNECTION_TIMEOUT_MS",
  ),
  DATABASE_IDLE_TIMEOUT_MS: positiveInteger("DATABASE_IDLE_TIMEOUT_MS"),
  DATABASE_STATEMENT_TIMEOUT_MS: positiveInteger(
    "DATABASE_STATEMENT_TIMEOUT_MS",
  ),
  DATABASE_QUERY_TIMEOUT_MS: positiveInteger("DATABASE_QUERY_TIMEOUT_MS"),
  PROVIDER_TIMEOUT_MS: positiveInteger("PROVIDER_TIMEOUT_MS"),
  EXCHANGE_RATE_STALE_AFTER_HOURS: positiveInteger(
    "EXCHANGE_RATE_STALE_AFTER_HOURS",
  ),
  MARKET_DATA_STALE_AFTER_HOURS: positiveInteger(
    "MARKET_DATA_STALE_AFTER_HOURS",
  ),
  ALPHA_VANTAGE_API_KEY: optionalProviderKey("ALPHA_VANTAGE_API_KEY"),
  ALPHA_VANTAGE_API_URL: z.string().url().optional(),
  COINGECKO_API_KEY: optionalProviderKey("COINGECKO_API_KEY"),
});

export type Env = z.infer<typeof serverEnvSchema>;

let cachedEnv: Env | undefined;

export function parseEnv(input: Record<string, string | undefined>): Env {
  return serverEnvSchema.parse({
    SESSION_SIGNING_SECRET: "inactive-auth-not-a-production-secret",
    ACCESS_TOKEN_HASH: "disabled", ACCESS_TOKEN_PEPPER: "disabled", ACCESS_TOKEN_VERSION: "1",
    SHORTCUT_TOKEN_HASH: "disabled", CRON_SECRET: "disabled",
    APP_ORIGIN: "http://localhost:3000", DATABASE_POOL_MAX_CONNECTIONS: "3",
    DATABASE_CONNECTION_TIMEOUT_MS: "5000", DATABASE_IDLE_TIMEOUT_MS: "10000",
    DATABASE_STATEMENT_TIMEOUT_MS: "15000", DATABASE_QUERY_TIMEOUT_MS: "15000",
    PROVIDER_TIMEOUT_MS: "10000", EXCHANGE_RATE_STALE_AFTER_HOURS: "36", MARKET_DATA_STALE_AFTER_HOURS: "36",
    ...input,
  });
}

function getEnv(): Env {
  cachedEnv ??= parseEnv(process.env);

  return cachedEnv;
}

export const env: Env = new Proxy({} as Env, {
  get(_target, property) {
    return getEnv()[property as keyof Env];
  },
}) as Env;
