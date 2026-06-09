import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Express, Request, Response } from "express";
import type { AppConfig } from "./types.js";
import { createServer } from "./server.js";

function publicHostname(publicUrl: string): string {
  return new URL(publicUrl).hostname;
}

function allowedHosts(config: AppConfig): string[] {
  return ["127.0.0.1", "localhost", publicHostname(config.mcp.publicUrl)];
}

function methodNotAllowed(_request: Request, response: Response): void {
  response.status(405).set("Allow", "POST").json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  });
}

export function createHttpApp(config: AppConfig): Express {
  const app = createMcpExpressApp({ allowedHosts: allowedHosts(config) });

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.post("/mcp", async (request, response) => {
    const server = createServer(config);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    try {
      response.on("close", () => {
        void transport.close();
        void server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      if (!response.headersSent) {
        response.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error"
          },
          id: null
        });
      }
    }
  });

  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  return app;
}
