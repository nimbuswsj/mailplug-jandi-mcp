import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppConfig } from "./types.js";
import { buildJandiMessage, sendJandiMessage } from "./jandi.js";
import { listRecentMailplugMessages } from "./mailplug.js";

export const TOOL_NAMES = ["mailplug_list_recent", "jandi_build_message", "jandi_send_message"] as const;

export function listToolNames(): string[] {
  return [...TOOL_NAMES];
}

export function registerTools(server: McpServer, config: AppConfig): void {
  server.registerTool(
    "mailplug_list_recent",
    {
      title: "List recent Mailplug messages",
      description: "Placeholder tool for future POP3-based Mailplug ingestion.",
      inputSchema: {}
    },
    async () => {
      const messages = await listRecentMailplugMessages();
      return { content: [{ type: "text", text: JSON.stringify({ messages }) }] };
    }
  );

  server.registerTool(
    "jandi_build_message",
    {
      title: "Build JANDI webhook payload",
      description: "Build a JANDI Incoming Webhook payload without sending it.",
      inputSchema: {
        body: z.string().min(1),
        color: z.string().optional(),
        fields: z.array(z.object({ title: z.string(), description: z.string(), imageUrl: z.string().optional() })).optional()
      }
    },
    async input => {
      const payload = buildJandiMessage(input);
      return { content: [{ type: "text", text: JSON.stringify(payload) }] };
    }
  );

  server.registerTool(
    "jandi_send_message",
    {
      title: "Send JANDI webhook message",
      description: "Send a message to the configured JANDI Incoming Webhook URL.",
      inputSchema: {
        body: z.string().min(1),
        color: z.string().optional(),
        fields: z.array(z.object({ title: z.string(), description: z.string(), imageUrl: z.string().optional() })).optional()
      }
    },
    async input => {
      const payload = buildJandiMessage(input);
      await sendJandiMessage(config.jandi.webhookUrl, payload);
      return { content: [{ type: "text", text: "sent" }] };
    }
  );
}
