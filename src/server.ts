import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppConfig } from "./types.js";
import { registerTools } from "./tools.js";

export function createServer(config: AppConfig): McpServer {
  const server = new McpServer({ name: "mailplug-jandi-mcp", version: "0.1.0" });
  registerTools(server, config);
  return server;
}
