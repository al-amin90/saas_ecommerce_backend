import EventEmitter from "events";
import mongoose, { Connection } from "mongoose";
import config from ".";
import {
  ConnectionMetadata,
  ConnectionStats,
  DBConfig,
  HealthCheck,
  TenancyType,
} from "../interface/db";
import AppError from "../errors/AppError";
import status from "http-status";

class DBManager extends EventEmitter {
  private centralConnection: Connection | null = null;
  private singleConnection: Connection | null = null;
  private tenantConnections: Map<string, Connection> = new Map();
  private connectionMetadata: Map<string, ConnectionMetadata> = new Map();

  public tenancyType: TenancyType;
  private isProduction: boolean;
  private config: DBConfig;

  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private isShuttingDown: boolean = false;

  constructor() {
    super();

    this.tenancyType = (config.db.tenancy_type as TenancyType) || "single";
    this.isProduction = config.node_env === "production";

    this.config = {
      maxIdleTime: config.poolConfig.maxConnectionIdleTime,
      maxConnections: config.poolConfig.maxTenantConnections,
      cleanupInterval: config.poolConfig.cleanupInterval,
      connectionTimeout: config.poolConfig.connectionTimeout,
      poolSize: config.poolConfig.poolSize,
    };

    // Prevent memory leaks from event listeners
    this.setMaxListeners(50);
  }

  // :::) get software db urls
  private getDbUris() {
    return this.isProduction
      ? {
          central: config.db.centralProductionUri!,
          single: config.db.singleProductionUri!,
          tenantBase: config.db.multiProductionUri!,
        }
      : {
          central: config.db.centralUri!,
          single: config.db.singleUri!,
          tenantBase: config.db.multiUri!,
        };
  }

  // :::) set pool size and connections
  private getConnectionOptions(poolSize: { min: number; max: number }) {
    return {
      maxPoolSize: poolSize.max,
      minPoolSize: poolSize.min,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: this.config.connectionTimeout,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
      maxIdleTimeMS: this.config.maxIdleTime,
    };
  }

  // :::) db connections from here
  async initialize() {
    if (this.tenancyType === "multi") {
      await this.initCentralConnection();
    } else {
      await this.getSingleConnection();
    }

    this.startCleanupJob();
  }

  private async initCentralConnection() {
    if (this.centralConnection?.readyState === 1) return this.centralConnection;

    const uris = this.getDbUris();
    const options = this.getConnectionOptions(this.config.poolSize.central);
    console.log("Connecting to Central DB...");

    try {
      this.centralConnection = await mongoose
        .createConnection(uris.central, options)
        .asPromise();

      this.setupConnectionHandlers(this.centralConnection, "CENTRAL_DB");
      console.log("Central DB connected.....");

      this.emit("centralConnected");
    } catch (error) {
      console.error("Failed to connect to Central DB:", error);
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        "Central database connection failed",
      );
    }

    return this.centralConnection;
  }

  private async getSingleConnection(): Promise<Connection> {
    if (this.singleConnection?.readyState === 1) return this.singleConnection;

    const uris = this.getDbUris();
    const options = this.getConnectionOptions(this.config.poolSize.single);

    console.log("🔄 Connecting to Single Tenant DB...");
    try {
      this.singleConnection = await mongoose
        .createConnection(uris.single, options)
        .asPromise();

      this.setupConnectionHandlers(this.singleConnection, "SINGLE_DB");
      console.log("✅ Single DB connected");
      this.emit("singleConnected");
    } catch (error) {
      console.error("Failed to connect to Single DB:", error);
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        "Single database connection failed",
      );
    }

    return this.singleConnection;
  }

  // :::) for every method call this method for connection
  async getConnection(tenantId?: string): Promise<Connection> {
    if (this.isShuttingDown)
      throw new AppError(status.INTERNAL_SERVER_ERROR, "System shutting down");

    if (this.tenancyType === "single") return this.getSingleConnection();

    if (!tenantId)
      throw new AppError(
        status.UNPROCESSABLE_ENTITY,
        "tenantId required in multi-tenant mode",
      );

    return this.getTenantConnection(tenantId);
  }

  getCentralConnection(): Connection | null {
    return this.centralConnection?.readyState === 1
      ? this.centralConnection
      : null;
  }

  // :::) tenant connection management
  private async getTenantConnection(tenantId: string): Promise<Connection> {
    const existing = this.tenantConnections.get(tenantId);

    if (existing) {
      if (existing.readyState === 1) {
        this.updateConnectionMetadata(tenantId);
        return existing;
      }

      await this.removeConnection(tenantId);
    }

    if (this.tenantConnections.size >= this.config.maxConnections) {
      await this.removeOldestIdleConnection();
    }

    return this.createTenantConnection(tenantId);
  }

  private async createTenantConnection(tenantId: string): Promise<Connection> {
    const uris = this.getDbUris();
    const tenantDBName = `tenant_${tenantId}`;

    const baseUri = uris.tenantBase.replace(/\/$/, "").replace(/\?.*$/, "");
    const authParams = uris.tenantBase.match(/\?.*$/)?.[0] ?? "";
    const tenantUri = `${baseUri}/${tenantDBName}${authParams}`;

    const options = {
      ...this.getConnectionOptions(this.config.poolSize.tenant),
      dbName: tenantDBName,
    };

    console.log(`Creating connection: ${tenantId}///`);

    try {
      const connection = await mongoose
        .createConnection(tenantUri, options)
        .asPromise();

      if (!connection.db) {
        await connection.close().catch(() => {});
        throw new AppError(
          status.INTERNAL_SERVER_ERROR,
          `DB not initialized for tenant: ${tenantId}`,
        );
      }

      // :::) verify correct DB
      if (connection.db.databaseName !== tenantDBName) {
        await connection.close().catch(() => {});
        throw new AppError(
          status.INTERNAL_SERVER_ERROR,
          `Wrong DB connected: ${connection.db.databaseName}, expected: ${tenantDBName}`,
        );
      }

      this.setupConnectionHandlers(connection, tenantId);
      this.tenantConnections.set(tenantId, connection);
      this.updateConnectionMetadata(tenantId);

      console.log(
        `✅ Tenant connected: ${tenantId} (total: ${this.tenantConnections.size})`,
      );
      this.emit("tenantConnectionCreated", {
        tenantId,
        total: this.tenantConnections.size,
      });

      return connection;
    } catch (error) {
      console.error(
        `Failed to create tenant connection for ${tenantId}:`,
        error,
      );
      throw error;
    }
  }

  // :::) metadata methods are here
  private updateConnectionMetadata(tenantId: string): void {
    const existing = this.connectionMetadata.get(tenantId);
    this.connectionMetadata.set(tenantId, {
      lastAccess: Date.now(),
      accessCount: (existing?.accessCount ?? 0) + 1,
      createdAt: existing?.createdAt ?? Date.now(),
    });
  }

  // :::) cleanup methods are here
  private async removeConnection(tenantId: string): Promise<void> {
    const conn = this.tenantConnections.get(tenantId);
    if (!conn) return;

    try {
      await conn.close();
    } catch (error) {
      console.error(`Error closing connection for ${tenantId}:`, error);
    } finally {
      this.tenantConnections.delete(tenantId);
      this.connectionMetadata.delete(tenantId);
      console.log(`Removed: ${tenantId}`);
      this.emit("connectionRemoved", { tenantId });
    }
  }

  private async removeOldestIdleConnection(): Promise<void> {
    let oldestId: string | null = null;
    let oldestTime: number = Date.now();

    for (const [id, meta] of this.connectionMetadata) {
      if (meta.lastAccess < oldestTime) {
        oldestTime = meta.lastAccess;
        oldestId = id;
      }
    }

    if (oldestId) {
      await this.removeConnection(oldestId).catch((err) =>
        console.error(`Error removing oldest connection ${oldestId}:`, err),
      );
    }
  }

  private startCleanupJob(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      if (this.isShuttingDown) return;
      const now = Date.now();

      for (const [tenantId, meta] of this.connectionMetadata) {
        if (now - meta.lastAccess > this.config.maxIdleTime) {
          this.removeConnection(tenantId).catch((err) =>
            console.error(`Cleanup error for ${tenantId}:`, err),
          );
        }
      }
    }, this.config.cleanupInterval);

    this.emit("cleanupStarted");
  }

  // :::) utils are here ----------- Connection event handlers
  private setupConnectionHandlers(connection: Connection, id: string): void {
    connection.on("error", (err: Error) => {
      console.error(`❌ DB error [${id}]:`, err.message);
      this.emit("connectionError", { id, error: err });
    });

    connection.on("disconnected", () => {
      console.warn(`🔌 Disconnected: ${id}`);

      if (id !== "CENTRAL_DB" && id !== "SINGLE_DB") {
        this.tenantConnections.delete(id);
        this.connectionMetadata.delete(id);
      }
      this.emit("connectionDisconnected", { id });
    });

    connection.on("reconnected", () => {
      console.log(`🔄 Reconnected: ${id}`);
      this.emit("connectionReconnected", { id });
    });
  }

  // :::) Monitoring are here
  getStats(): ConnectionStats {
    const tenants = [...this.connectionMetadata.entries()]
      .map(([tenantId, meta]) => ({
        tenantId,
        readyState: this.tenantConnections.get(tenantId)?.readyState,
        lastAccess: new Date(meta.lastAccess),
        accessCount: meta.accessCount,
        idleTime: Date.now() - meta.lastAccess,
        age: Date.now() - meta.createdAt,
      }))
      .sort((a, b) => b.idleTime - a.idleTime);

    return {
      tenancyType: this.tenancyType,
      environment: this.isProduction ? "production" : "development",
      activeConnections: this.tenantConnections.size,
      maxConnections: this.config.maxConnections,
      central: this.centralConnection
        ? {
            readyState: this.centralConnection.readyState,
            name: this.centralConnection.name,
          }
        : null,
      single: this.singleConnection
        ? {
            readyState: this.singleConnection.readyState,
            name: this.singleConnection.name,
          }
        : null,
      tenants,
    };
  }

  async healthCheck(): Promise<HealthCheck> {
    const health: HealthCheck = {
      status: "healthy",
      timestamp: new Date(),
      checks: {},
    };

    const ping = async (
      conn: Connection | null,
      key: string,
    ): Promise<void> => {
      if (!conn) {
        health.checks[key] = "not_initialized";
        return;
      }
      try {
        await conn.db?.admin().ping();
        health.checks[key] = "connected";
      } catch (error) {
        health.checks[key] = "error";
        health.status = "unhealthy";
      }
    };

    if (this.tenancyType === "multi") {
      await ping(this.centralConnection, "central");
    }
    if (this.tenancyType === "single") {
      await ping(this.singleConnection, "single");
    }

    health.checks["tenantCount"] = this.tenantConnections.size;
    return health;
  }

  // :::) gracefully shut down are here
  async closeAllConnections(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log("Starting graceful shutdown...");

    // Stop accepting new connections
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Close all tenant connections
    const closing = [...this.tenantConnections.values()].map((conn) =>
      conn
        .close()
        .catch((err) => console.error("Error closing tenant connection:", err)),
    );

    await Promise.allSettled(closing);
    this.tenantConnections.clear();
    this.connectionMetadata.clear();

    // Close central connection
    if (this.centralConnection) {
      try {
        await this.centralConnection.close();
      } catch (err) {
        console.error("Error closing central connection:", err);
      }
      this.centralConnection = null;
    }

    // Close single connection
    if (this.singleConnection) {
      try {
        await this.singleConnection.close();
      } catch (err) {
        console.error("Error closing single connection:", err);
      }
      this.singleConnection = null;
    }

    // Remove all event listeners to prevent memory leaks
    this.removeAllListeners();

    console.log("✅ All DB connections closed");
    this.emit("shutdownComplete");
  }
}

export const dbManager = new DBManager();
