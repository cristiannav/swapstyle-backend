import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),

  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  GRPC_PORT: z.string().transform(Number).default('50051'),

  MAX_FILE_SIZE: z.string().transform(Number).default('5242880'),
  UPLOAD_PATH: z.string().default('./uploads'),

  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),

  CORS_ORIGIN: z.string().default('http://localhost:3001'),

  // Future integrations
  AI_SERVICE_URL: z.string().optional(),
  VISION_SERVICE_URL: z.string().optional(),
  BLOCKCHAIN_RPC_URL: z.string().optional(),
  MAPS_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  env: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  apiVersion: parsed.data.API_VERSION,

  database: {
    url: parsed.data.DATABASE_URL,
  },

  redis: {
    url: parsed.data.REDIS_URL,
  },

  jwt: {
    secret: parsed.data.JWT_SECRET,
    expiresIn: parsed.data.JWT_EXPIRES_IN,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    refreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,
  },

  grpc: {
    port: parsed.data.GRPC_PORT,
  },

  upload: {
    maxFileSize: parsed.data.MAX_FILE_SIZE,
    path: parsed.data.UPLOAD_PATH,
  },

  rateLimit: {
    windowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
    max: parsed.data.RATE_LIMIT_MAX,
  },

  cors: {
    origin: parsed.data.CORS_ORIGIN,
  },

  services: {
    ai: parsed.data.AI_SERVICE_URL,
    vision: parsed.data.VISION_SERVICE_URL,
    blockchain: parsed.data.BLOCKCHAIN_RPC_URL,
    mapsApiKey: parsed.data.MAPS_API_KEY,
  },

  isProd: parsed.data.NODE_ENV === 'production',
  isDev: parsed.data.NODE_ENV === 'development',
  isTest: parsed.data.NODE_ENV === 'test',
} as const;

export type Config = typeof config;
