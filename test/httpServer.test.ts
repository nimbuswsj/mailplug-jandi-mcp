import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { request } from "node:http";
import { describe, expect, it } from "vitest";
import { createHttpApp } from "../src/httpServer.js";

const config = {
  mailplug: {
    pop3Host: "pop3.mailplug.co.kr",
    pop3Port: 995,
    smtpHost: "smtp.mailplug.co.kr",
    smtpPort: 465
  },
  jandi: {},
  mcp: {
    publicUrl: "https://mcp.nimbustech.co.kr/mcp",
    httpPort: 8710
  }
};

async function withServer<T>(run: (baseUrl: URL) => Promise<T>): Promise<T> {
  const app = createHttpApp(config);
  const server = app.listen(0, "127.0.0.1");

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("HTTP test server did not expose a TCP address");
  }

  try {
    return await run(new URL(`http://127.0.0.1:${address.port}`));
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
}

async function requestWithHost(baseUrl: URL, path: string, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: baseUrl.hostname,
      port: baseUrl.port,
      path,
      method: "GET",
      headers: { Host: host }
    };

    const clientRequest = request(requestOptions, response => {
      response.resume();
      response.on("end", () => resolve(response.statusCode ?? 0));
    });

    clientRequest.on("error", reject);
    clientRequest.end();
  });
}

describe("HTTP MCP server", () => {
  it("serves a health response for the local backend", async () => {
    await withServer(async baseUrl => {
      const response = await fetch(new URL("/health", baseUrl), {
        headers: { Host: "mcp.nimbustech.co.kr" }
      });

      await expect(response.json()).resolves.toEqual({ status: "ok" });
      expect(response.status).toBe(200);
    });
  });

  it("rejects unexpected Host headers", async () => {
    await withServer(async baseUrl => {
      await expect(requestWithHost(baseUrl, "/health", "evil.example")).resolves.toBe(403);
    });
  });

  it("lists registered MCP tools over Streamable HTTP", async () => {
    await withServer(async baseUrl => {
      const client = new Client({ name: "http-test-client", version: "0.1.0" }, { capabilities: {} });
      const transport = new StreamableHTTPClientTransport(new URL("/mcp", baseUrl), {
        requestInit: {
          headers: { Host: "mcp.nimbustech.co.kr" }
        }
      });

      try {
        await client.connect(transport);
        const tools = await client.listTools();

        expect(tools.tools.map(tool => tool.name)).toEqual([
          "mailplug_list_recent",
          "jandi_build_message",
          "jandi_send_message"
        ]);
      } finally {
        await client.close();
      }
    });
  });

  it("returns 405 for unsupported stateless MCP methods", async () => {
    await withServer(async baseUrl => {
      for (const method of ["GET", "DELETE"] as const) {
        const response = await fetch(new URL("/mcp", baseUrl), {
          method,
          headers: { Host: "mcp.nimbustech.co.kr" }
        });

        expect(response.status).toBe(405);
      }
    });
  });
});
