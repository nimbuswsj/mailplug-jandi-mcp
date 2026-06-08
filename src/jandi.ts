import type { BuildJandiMessageInput, JandiPayload } from "./types.js";

type FetchLike = (input: string, init: RequestInit) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

export function buildJandiMessage(input: BuildJandiMessageInput): JandiPayload {
  const payload: JandiPayload = { body: input.body };

  if (input.color) {
    payload.connectColor = input.color;
  }
  if (input.fields && input.fields.length > 0) {
    payload.connectInfo = input.fields;
  }

  return payload;
}

export async function sendJandiMessage(
  webhookUrl: string | undefined,
  payload: JandiPayload,
  fetcher: FetchLike = fetch
): Promise<void> {
  if (!webhookUrl) {
    throw new Error("JANDI_WEBHOOK_URL is required to send a message");
  }

  const response = await fetcher(webhookUrl, {
    method: "POST",
    headers: {
      Accept: "application/vnd.tosslab.jandi-v2+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`JANDI webhook request failed with ${response.status}: ${responseBody}`);
  }
}
