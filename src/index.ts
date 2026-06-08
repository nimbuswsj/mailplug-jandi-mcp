import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./env.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer(loadConfig());
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
