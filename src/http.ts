import "dotenv/config";
import { loadConfig } from "./env.js";
import { createHttpApp } from "./httpServer.js";

const HTTP_HOST = "127.0.0.1";

async function main(): Promise<void> {
  const config = loadConfig();
  const app = createHttpApp(config);
  const server = app.listen(config.mcp.httpPort, HTTP_HOST, () => {
    console.log(`Mailplug JANDI MCP HTTP server listening on http://${HTTP_HOST}:${config.mcp.httpPort}`);
  });

  server.on("error", error => {
    console.error(error);
    process.exitCode = 1;
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      server.close(() => {
        process.exitCode = 0;
      });
    });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
