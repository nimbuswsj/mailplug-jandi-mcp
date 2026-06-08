import { describe, expect, it, vi } from "vitest";
import { buildJandiMessage, sendJandiMessage } from "../src/jandi.js";

describe("JANDI message helpers", () => {
  it("builds a deterministic JANDI Incoming Webhook payload", () => {
    expect(
      buildJandiMessage({
        body: "New Mailplug message",
        color: "#FAC11B",
        fields: [
          { title: "From", description: "customer@example.com" },
          { title: "Subject", description: "Quote request" }
        ]
      })
    ).toEqual({
      body: "New Mailplug message",
      connectColor: "#FAC11B",
      connectInfo: [
        { title: "From", description: "customer@example.com" },
        { title: "Subject", description: "Quote request" }
      ]
    });
  });

  it("fails clearly before network when webhook URL is missing", async () => {
    await expect(
      sendJandiMessage(undefined, { body: "hello" }, vi.fn())
    ).rejects.toThrow("JANDI_WEBHOOK_URL is required to send a message");
  });

  it("posts with JANDI-required headers when configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "ok" });

    await sendJandiMessage("https://wh.jandi.com/connect-api/webhook/test-token", { body: "hello" }, fetchMock);

    expect(fetchMock).toHaveBeenCalledWith("https://wh.jandi.com/connect-api/webhook/test-token", {
      method: "POST",
      headers: {
        Accept: "application/vnd.tosslab.jandi-v2+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ body: "hello" })
    });
  });
});
