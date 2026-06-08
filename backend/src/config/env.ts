import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return false;
  });

const numberFromEnv = (defaultValue: number) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === "number") return value;
      if (typeof value === "string" && value.trim().length > 0) return Number(value);
      return defaultValue;
    });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: numberFromEnv(4000),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  CLIENT_ORIGINS: z.string().optional(),
  JWT_SECRET: z.string().min(12).default("change-this-secret"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  DB_SERVER: z.string().default("localhost"),
  DB_PORT: numberFromEnv(1433),
  DB_NAME: z.string().default("Requests"),
  DB_USER: z.string().default("sa"),
  DB_PASSWORD: z.string().default(""),
  DB_ENCRYPT: booleanFromEnv.default(false),
  DB_TRUST_SERVER_CERTIFICATE: booleanFromEnv.default(true)
});

export const env = envSchema.parse(process.env);

export const allowedClientOrigins = Array.from(
  new Set([
    env.CLIENT_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...(env.CLIENT_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [])
  ])
);
