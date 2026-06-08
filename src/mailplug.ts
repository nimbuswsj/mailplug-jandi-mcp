export interface MailplugRecentMessage {
  id: string;
  from: string;
  subject: string;
  receivedAt?: string;
}

export async function listRecentMailplugMessages(): Promise<MailplugRecentMessage[]> {
  return [];
}
