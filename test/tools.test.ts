import { describe, expect, it } from "vitest";
import { listToolNames } from "../src/tools.js";

describe("MCP tool registry", () => {
  it("exposes the planned Mailplug and JANDI tool names", () => {
    expect(listToolNames()).toEqual([
      "mailplug_list_recent",
      "jandi_build_message",
      "jandi_send_message"
    ]);
  });
});
