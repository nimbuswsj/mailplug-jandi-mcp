# Mailplug JANDI MCP

TypeScript MCP scaffold for Mailplug email workflows and JANDI notifications. The current implementation is a safe stdio MCP scaffold with JANDI payload helpers and placeholder Mailplug tooling; live Mailplug POP3/SMTP and JANDI credentials are intentionally left for local `.env` setup later.

## Current Scope

- MCP stdio server using `@modelcontextprotocol/sdk@1.29.0`.
- Tool names reserved for the MVP:
  - `mailplug_list_recent`
  - `jandi_build_message`
  - `jandi_send_message`
- JANDI Incoming Webhook payload builder and sender.
- Placeholder Mailplug recent-message tool that returns an empty list until credentials and POP3 behavior are approved.
- Future-only Apache vhost examples for `mcp.nimbustech.co.kr`.

## Setup

```bash
npm install
cp .env.example .env
npm run check
npm run build
```

Do not commit `.env` or any real webhook URL, Mailplug app password, token, certificate path, or secret.

## Environment

| Variable | Purpose |
| --- | --- |
| `MAILPLUG_EMAIL` | Mailplug mailbox address for future POP3/SMTP use. |
| `MAILPLUG_APP_PASSWORD` | Mailplug app password for future POP3/SMTP use. |
| `MAILPLUG_POP3_HOST` | Defaults to `pop3.mailplug.co.kr`. |
| `MAILPLUG_POP3_PORT` | Defaults to `995`. |
| `MAILPLUG_SMTP_HOST` | Defaults to `smtp.mailplug.co.kr`. |
| `MAILPLUG_SMTP_PORT` | Defaults to `465`. |
| `JANDI_WEBHOOK_URL` | JANDI Incoming Webhook URL. Fill only in local `.env`. |
| `MCP_PUBLIC_URL` | Planned public URL, `https://mcp.nimbustech.co.kr/mcp`. |
| `MCP_HTTP_PORT` | Future HTTP backend port, currently `8710`. |

## Development Commands

```bash
npm run dev       # run stdio MCP server locally
npm test          # run unit tests
npm run typecheck # TypeScript only
npm run build     # emit dist/
npm run check     # typecheck + tests
```

## Future Apache Vhost Plan

The target public host is `mcp.nimbustech.co.kr`. Public DNS currently resolves to the nimbus server IP from outside, but the nimbus server resolver may remain stale until DNS cache refreshes. Do not apply the vhost until DNS, certificate issuance, and deployment timing are explicitly approved.

Example-only config lives in `deploy/apache/`. It is not a live Apache configuration and should not be copied blindly.

## Push Readiness

This repo has no remote configured yet. To push, provide the target Git remote URL and confirm whether the first branch should remain `master` or be renamed to `main`.
