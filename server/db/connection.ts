// ─────────────────────────────────────────────────────────────────────────────
// Database Connection — PostgreSQL + pgvector configuration.
// Uses connection pooling for production, single connection for development.
// ─────────────────────────────────────────────────────────────────────────────

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections: number;
  idleTimeoutMs: number;
}

export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    database: process.env.DB_NAME ?? "pran",
    user: process.env.DB_USER ?? "pran",
    password: process.env.DB_PASSWORD ?? "pran",
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS ?? "10", 10),
    idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT ?? "30000", 10),
  };
}

export function getConnectionString(): string {
  const config = getDatabaseConfig();
  return `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
}
