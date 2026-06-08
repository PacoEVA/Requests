import sql from "mssql";
import { env } from "./env";

const dbConfig: sql.config = {
  server: env.DB_SERVER,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: env.DB_ENCRYPT,
    trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE
  }
};

let pool: sql.ConnectionPool | null = null;

export async function getDbPool() {
  if (!pool) {
    pool = await sql.connect(dbConfig);
  }

  return pool;
}

export { sql };
