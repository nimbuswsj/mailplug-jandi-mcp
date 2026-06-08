import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/env.js";

describe("loadConfig", () => {
  it("applies Mailplug defaults and local MCP defaults", () => {
    const config = loadConfig({});

    expect(config.mailplug.pop3Host).toBe("pop3.mailplug.co.kr");
    expect(config.mailplug.pop3Port).toBe(995);
    expect(config.mailplug.smtpHost).toBe("smtp.mailplug.co.kr");
    expect(config.mailplug.smtpPort).toBe(465);
    expect(config.mcp.publicUrl).toBe("https://mcp.nimbustech.co.kr/mcp");
    expect(config.mcp.httpPort).toBe(8710);
  });

  it("does not require secrets or webhook URL at startup", () => {
    const config = loadConfig({ MAILPLUG_EMAIL: "", MAILPLUG_APP_PASSWORD: "", JANDI_WEBHOOK_URL: "" });

    expect(config.mailplug.email).toBeUndefined();
    expect(config.mailplug.appPassword).toBeUndefined();
    expect(config.jandi.webhookUrl).toBeUndefined();
  });

  it("rejects invalid numeric ports", () => {
    expect(() => loadConfig({ MAILPLUG_POP3_PORT: "not-a-port" })).toThrow("MAILPLUG_POP3_PORT must be a valid TCP port");
    expect(() => loadConfig({ MCP_HTTP_PORT: "70000" })).toThrow("MCP_HTTP_PORT must be a valid TCP port");
  });
});
