import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Server } from "node:http";
import { createHttpApp } from "./httpServer.js";
import { loadConfig } from "./env.js";

const HTTP_HOST = "127.0.0.1";
const REQUEST_HOST = "mcp.nimbustech.co.kr";

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("JANDI smoke server did not expose a TCP address");
  }
  return address.port;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  const app = createHttpApp(config);
  const server = app.listen(0, HTTP_HOST);
  const port = await listen(server);
  const client = new Client({ name: "jandi-smoke", version: "0.1.0" }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(`http://${HTTP_HOST}:${port}/mcp`), {
    requestInit: {
      headers: { Host: REQUEST_HOST }
    }
  });

  try {
    await client.connect(transport);
    await client.callTool({
      name: "jandi_build_message",
      arguments: {
        body: "JANDI MCP smoke test",
        color: "#FAC11B",
        fields: [{ title: "mode", description: process.env.JANDI_SMOKE_SEND === "1" ? "send" : "dry-run" }]
      }
    });

    if (process.env.JANDI_SMOKE_SEND === "1") {
      await client.callTool({
        name: "jandi_send_message",
        arguments: {
          body: "JANDI MCP smoke test",
          color: "#FAC11B",
          fields: [{ title: "source", description: "mailplug-jandi-mcp" }]
        }
      });
      console.log("JANDI MCP smoke sent a message through the configured webhook.");
    } else {
      console.log("JANDI MCP smoke dry-run completed. Set JANDI_SMOKE_SEND=1 to send through local .env.");
    }
  } finally {
    await client.close();
    await close(server);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
