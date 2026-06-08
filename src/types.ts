export interface MailplugConfig {
  email?: string;
  appPassword?: string;
  pop3Host: string;
  pop3Port: number;
  smtpHost: string;
  smtpPort: number;
}

export interface JandiConfig {
  webhookUrl?: string;
}

export interface McpConfig {
  publicUrl: string;
  httpPort: number;
}

export interface AppConfig {
  mailplug: MailplugConfig;
  jandi: JandiConfig;
  mcp: McpConfig;
}

export interface JandiField {
  title: string;
  description: string;
  imageUrl?: string;
}

export interface BuildJandiMessageInput {
  body: string;
  color?: string;
  fields?: JandiField[];
}

export interface JandiPayload {
  body: string;
  connectColor?: string;
  connectInfo?: JandiField[];
}
