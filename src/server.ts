import { Server } from "http";
import app from "./app";
import config from "./app/config";
import { dbManager } from "./app/config/db";

let server: Server;

async function main() {
  await dbManager.initialize();

  app.listen(config.port, () => {
    console.log(`Example app listening on port ${config.port}`);
  });
}

main().catch((err) => console.log(err));

process.on("unhandledRejection", () => {
  console.log(`unhandledRejection is detected, shutting down...`);
  if (server) {
    server.close(() => {
      dbManager.closeAllConnections();
      process.exit(1);
    });
  }
  process.exit(1);
});

process.on("uncaughtException", () => {
  console.log(`unhandledRejection is detected, shutting down...`);
  process.exit(1);
});
