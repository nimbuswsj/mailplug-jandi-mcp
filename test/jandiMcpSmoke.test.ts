import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Server } from "node:http";
import express from "express";
import { describe, expect, it } from "vitest";
import { createHttpApp } from "../src/httpServer.js";

const requestHost = "mcp.nimbustech.co.kr";

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }
  return address.port;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
  });
}

async function withJandiWebhook<T>(run: (webhookUrl: string, received: unknown[]) => Promise<T>): Promise<T> {
  const received: unknown[] = [];
  const app = express();
  app.use(express.json());
  app.post("/webhook", (request, response) => {
    received.push({ headers: request.headers, body: request.body });
    response.json({ ok: true });
  });

  const server = app.listen(0, "127.0.0.1");
  const port = await listen(server);

  try {
    return await run(`http://127.0.0.1:${port}/webhook`, received);
  } finally {
    await close(server);
  }
}

async function withMcpServer<T>(webhookUrl: string, run: (baseUrl: URL) => Promise<T>): Promise<T> {
  const app = createHttpApp({
    mailplug: {
      pop3Host: "pop3.mailplug.co.kr",
      pop3Port: 995,
      smtpHost: "smtp.mailplug.co.kr",
      smtpPort: 465
    },
    jandi: { webhookUrl },
    mcp: {
      publicUrl: "https://mcp.nimbustech.co.kr/mcp",
      httpPort: 8710
    }
  });
  const server = app.listen(0, "127.0.0.1");
  const port = await listen(server);

  try {
    return await run(new URL(`http://127.0.0.1:${port}`));
  } finally {
    await close(server);
  }
}

describe("JANDI MCP smoke path", () => {
  it("sends a JANDI message through local MCP HTTP to a fake local webhook", async () => {
    await withJandiWebhook(async (webhookUrl, received) => {
      await withMcpServer(webhookUrl, async baseUrl => {
        const client = new Client({ name: "jandi-smoke-test", version: "0.1.0" }, { capabilities: {} });
        const transport = new StreamableHTTPClientTransport(new URL("/mcp", baseUrl), {
          requestInit: {
            headers: { Host: requestHost }
          }
        });

        try {
          await client.connect(transport);
          const result = await client.callTool({
            name: "jandi_send_message",
            arguments: {
              body: "SalesMap smoke notification",
              color: "#FAC11B",
              fields: [{ title: "candidate", description: "dry-run" }]
            }
          });

          expect(result.content).toEqual([{ type: "text", text: "sent" }]);
        } finally {
          await client.close();
        }
      });

      expect(received).toEqual([
        {
          headers: expect.objectContaining({
            accept: "application/vnd.tosslab.jandi-v2+json",
            "content-type": "application/json"
          }),
          body: {
            body: "SalesMap smoke notification",
            connectColor: "#FAC11B",
            connectInfo: [{ title: "candidate", description: "dry-run" }]
          }
        }
      ]);
    });
  });
});
