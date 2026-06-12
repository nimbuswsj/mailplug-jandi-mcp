# MCP Tooling Notes

이 문서는 MCP tool을 추가하거나 수정할 때 참고할 개발 메모입니다. 운영 절차는 `docs/runbook.md`, public HTTP 인증과 credential routing 설계는 `docs/auth-credential-plan.md`를 기준으로 합니다.

## Current SDK Shape

현재 프로젝트는 `@modelcontextprotocol/sdk`의 고수준 서버 API를 사용합니다.

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "mailplug-jandi-mcp", version: "0.1.0" });
```

`McpServer`는 tool, resource, prompt를 MCP client에 노출하는 서버 객체입니다. 저수준 protocol framing은 SDK가 처리하며, 이 프로젝트는 직접 MCP protocol class를 구현하지 않습니다.

Transport는 통신 방식만 담당합니다.

| Transport | 현재 용도 |
| --- | --- |
| `StdioServerTransport` | Codex CLI 같은 local MCP client가 서버 프로세스를 직접 실행할 때 사용 |
| `StreamableHTTPServerTransport` | local HTTP smoke 또는 향후 Apache reverse proxy 뒤 HTTP backend에서 사용 |

## registerTool

`registerTool`은 `McpServer` 인스턴스에 에이전트가 호출할 수 있는 tool을 등록하는 SDK 메서드입니다.

```ts
server.registerTool(
  "jandi_send_message",
  {
    title: "Send JANDI webhook message",
    description: "Send a message to the configured JANDI Incoming Webhook URL.",
    inputSchema: {
      body: z.string().min(1),
      color: z.string().optional()
    }
  },
  async input => {
    // tool handler
  }
);
```

Tool registration has three responsibilities:

1. Tool name: stable identifier used by MCP clients, such as `jandi_send_message`.
2. Tool metadata: `title`, `description`, `inputSchema`, and optional annotations that help the agent decide when and how to call the tool.
3. Handler: server-side code that validates final policy and performs the action.

Agents do not inspect the implementation file before calling a tool. They primarily see the exposed tool name, description, schema, and returned result or error. Therefore, tool metadata should be clear, but safety must not rely on metadata alone.

## Zod Schema

The `z` prefix comes from Zod:

```ts
import { z } from "zod";
```

Zod is a TypeScript/JavaScript schema validation library. In this project it describes tool inputs.

| Expression | Meaning |
| --- | --- |
| `z.string()` | value must be a string |
| `z.string().min(1)` | value must be a non-empty string |
| `z.string().optional()` | value may be omitted; if present, it must be a string |
| `z.object({ ... })` | value must be an object with the described fields |
| `z.array(schema)` | value must be an array of values matching `schema` |

For example, the current JANDI field schema means that `fields` is optional, but when present it must be an array of objects with `title`, `description`, and optional `imageUrl`.

```ts
fields: z.array(
  z.object({
    title: z.string(),
    description: z.string(),
    imageUrl: z.string().optional()
  })
).optional()
```

## Agent-Facing Metadata vs Server Enforcement

Use tool metadata to guide the agent:

- Describe what the tool does.
- Describe required inputs.
- Tell the agent to ask the user when required context is missing.
- Mark dangerous or side-effecting tools with appropriate annotations when added.

Use handler validation and server policy to enforce safety:

- Reject missing required fields.
- Reject unknown destination keys.
- Reject unauthorized destinations.
- Never infer a secret webhook URL from user-provided free text.
- Never fall back to an arbitrary default room when multiple destinations exist.

Good future multi-destination shape:

```ts
server.registerTool(
  "jandi_send_message",
  {
    description: "Send a message to an allowed JANDI destination. Ask the user for destination_key if it is not specified.",
    inputSchema: {
      destination_key: z.enum(["salesmap-alerts", "dev-alerts"]),
      body: z.string().min(1)
    }
  },
  async input => {
    // Look up destination_key in a server-side allowlist.
    // Reject missing, unknown, disabled, or unauthorized destinations.
  }
);
```

Avoid this pattern after multi-room support is added:

```ts
destination_key: z.string().optional()
```

Optional destination plus default fallback can cause accidental messages to be sent to the wrong JANDI room.

## Resources And Prompts

MCP servers can expose more than tools. Future versions may add:

| MCP capability | Possible use |
| --- | --- |
| Resource | `jandi://destinations` listing non-secret destination keys, display names, and usage notes |
| Prompt | A reusable prompt template for sending a JANDI alert safely |

These are guidance surfaces for the agent. They do not replace server-side validation.

## References

- MCP TypeScript SDK server docs: https://ts.sdk.modelcontextprotocol.io/documents/server.html
- MCP TypeScript SDK source: https://github.com/modelcontextprotocol/typescript-sdk
- Zod docs: https://zod.dev/
