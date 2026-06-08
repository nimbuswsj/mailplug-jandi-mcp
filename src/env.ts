import type { AppConfig } from "./types.js";

const DEFAULT_POP3_HOST = "pop3.mailplug.co.kr";
const DEFAULT_POP3_PORT = 995;
const DEFAULT_SMTP_HOST = "smtp.mailplug.co.kr";
const DEFAULT_SMTP_PORT = 465;
const DEFAULT_MCP_PUBLIC_URL = "https://mcp.nimbustech.co.kr/mcp";
const DEFAULT_MCP_HTTP_PORT = 8710;

function optionalValue(value: string | undefined): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return value.trim();
}

function readPort(env: NodeJS.ProcessEnv | Record<string, string | undefined>, name: string, fallback: number): number {
  const raw = env[name];
  if (!raw || raw.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be a valid TCP port`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): AppConfig {
  return {
    mailplug: {
      email: optionalValue(env.MAILPLUG_EMAIL),
      appPassword: optionalValue(env.MAILPLUG_APP_PASSWORD),
      pop3Host: optionalValue(env.MAILPLUG_POP3_HOST) ?? DEFAULT_POP3_HOST,
      pop3Port: readPort(env, "MAILPLUG_POP3_PORT", DEFAULT_POP3_PORT),
      smtpHost: optionalValue(env.MAILPLUG_SMTP_HOST) ?? DEFAULT_SMTP_HOST,
      smtpPort: readPort(env, "MAILPLUG_SMTP_PORT", DEFAULT_SMTP_PORT)
    },
    jandi: {
      webhookUrl: optionalValue(env.JANDI_WEBHOOK_URL)
    },
    mcp: {
      publicUrl: optionalValue(env.MCP_PUBLIC_URL) ?? DEFAULT_MCP_PUBLIC_URL,
      httpPort: readPort(env, "MCP_HTTP_PORT", DEFAULT_MCP_HTTP_PORT)
    }
  };
}
