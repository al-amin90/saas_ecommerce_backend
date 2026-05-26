import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV,
  port: process.env.PORT,

  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  default_password: process.env.DEFAULT_PASSWORD,

  single_admin_email: process.env.SINGLE_ADMIN_EMAIL,
  single_admin_password: process.env.SINGLE_ADMIN_PASSWORD,
  super_admin_email: process.env.SUPER_ADMIN_EMAIL,
  super_admin_password: process.env.SUPER_ADMIN_PASSWORD,

  cloudinary_url: process.env.CLOUDINARY_URL,

  webhook_secret: process.env.WEBHOOK_SECRET,
  webhook_url: process.env.WEBHOOK_URL,

  jwt: {
    access_token: process.env.JWT_ACCESS_TOKEN as string,
    refresh_token: process.env.JWT_REFRESH_TOKEN as string,
    access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN as string,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN as string,
  },
  db: {
    tenancy_type: process.env.TENANCY_TYPE,
    singleUri: process.env.SINGLE_DB_URL,
    multiUri: process.env.MULTI_DB_URL,
    centralUri: process.env.CENTRAL_DB_URL,

    singleProductionUri: process.env.SINGLE_PRODUCTION_DB_URL,
    multiProductionUri: process.env.MULTI_PRODUCTION_DB_URL,
    centralProductionUri: process.env.CENTRAL_PRODUCTION_DB_URL,
  },

  // ========== PATHAO SANDBOX ==========
  pathao_sandbox: {
    base_url: process.env.PATHAO_SANDBOX_BASE_URL,
    client_id: process.env.PATHAO_SANDBOX_CLIENT_ID,
    client_secret: process.env.PATHAO_SANDBOX_CLIENT_SECRET,
    username: process.env.PATHAO_SANDBOX_USERNAME,
    password: process.env.PATHAO_SANDBOX_PASSWORD,
  },

  // ========== PATHAO LIVE ==========
  pathao_live: {
    base_url: process.env.PATHAO_LIVE_BASE_URL,
    client_id: process.env.PATHAO_LIVE_CLIENT_ID,
    client_secret: process.env.PATHAO_LIVE_CLIENT_SECRET,
    username: process.env.PATHAO_LIVE_USERNAME,
    password: process.env.PATHAO_LIVE_PASSWORD,
  },

  // ========== PATHAO ENVIRONMENT ==========
  pathao_environment:
    (process.env.PATHAO_ENVIRONMENT as "sandbox" | "live") || "sandbox",

  poolConfig: {
    maxTenantConnections: parseInt(process.env.MAX_TENANT_CONNECTIONS ?? "100"),
    maxConnectionIdleTime: parseInt(
      process.env.MAX_CONNECTION_IDLE_TIME ?? "300000",
    ),
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL ?? "60000"),
    connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT ?? "10000"),
    poolSize: {
      central: { min: 2, max: 10 },
      single: { min: 10, max: 50 },
      tenant: { min: 2, max: 10 },
    },
  },
};
