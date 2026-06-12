# 운영 Runbook

이 runbook은 local check와 live HTTP 운영에 사용합니다. 현재 application은 stdio와 Streamable HTTP backend를 모두 제공하지만, `https://mcp.nimbustech.co.kr/mcp` public endpoint는 DNS, certificate, systemd, Apache 작업이 승인된 뒤에만 활성화합니다.

Public `/mcp` 노출 전에는 [Auth와 Credential 설계 계획](./auth-credential-plan.md)의 요구사항을 먼저 확인합니다. 인증, per-user credential routing, token revocation, credential rotation, audit logging이 미완료이면 Apache public route를 활성화하지 않습니다.

## 문서 위치

재현 가능한 배포 절차, template, rollback 단계는 이 repository에 둡니다. `nimbus`에는 non-secret live host fact만 두며, 배포가 시작된 뒤에는 `/opt/mailplug-jandi-mcp/DEPLOYMENT_STATE.md`를 권장합니다.

Server live-state note에는 아래 내용을 기록할 수 있습니다:

- Deployed git commit.
- Deployment timestamp.
- Enabled systemd service와 Apache vhost name.
- Key content를 제외한 certificate path와 expiry date.
- `docs/deployment.md`에서 승인된 host-specific deviation.

Mailplug password, JANDI webhook URL, token, private key, certificate content는 repo docs나 live-state note에 기록하지 마세요.

## Local Project Checks

```bash
cd /opt/mailplug-jandi-mcp
npm run check
npm run build
npm audit --audit-level=critical
```

## Stdio MCP Smoke Test

현재 scaffold는 stdio로 실행됩니다. Smoke test가 성공하면 등록된 tool name이 반환되어야 합니다.

```bash
node dist/index.js
```

자동화된 check에는 MCP client 또는 작은 JSON-RPC stdin script를 사용합니다. 예상 tool은 아래와 같습니다:

- `mailplug_list_recent`
- `jandi_build_message`
- `jandi_send_message`

## Codex CLI MCP Usage

Codex CLI는 local stdio MCP server를 직접 실행할 수 있습니다. 이 방식은 별도 HTTP server를 미리 띄우지 않아도 되고, `cwd`를 project root로 맞추면 local `.env`의 `JANDI_WEBHOOK_URL`을 읽을 수 있습니다.

먼저 build를 실행합니다.

```bash
cd /home/user/mailplug-jandi-mcp
npm run build
```

Codex MCP server 등록 예시:

```bash
codex mcp add mailplug-jandi -- bash -lc 'cd /home/user/mailplug-jandi-mcp && node dist/index.js'
```

개발 중 build 없이 확인해야 할 때만 아래 형태를 사용합니다.

```bash
codex mcp add mailplug-jandi-dev -- bash -lc 'cd /home/user/mailplug-jandi-mcp && ./node_modules/.bin/tsx src/index.ts'
```

등록 확인:

```bash
codex mcp list
codex mcp get mailplug-jandi
```

Codex interactive session 안에서는 `/mcp` 또는 `/mcp verbose`로 현재 session에서 보이는 MCP server와 tool을 확인합니다. `/mcp`는 tool 호출 명령이 아니라 확인용입니다. 실제 tool 사용은 자연어로 요청합니다.

권장 dry-run prompt:

```text
mailplug-jandi MCP의 jandi_build_message로 먼저 payload만 만들어줘.
body는 "Codex MCP dry run"으로 해줘.
실제 전송은 하지 마.
```

실제 전송 prompt:

```text
mailplug-jandi MCP의 jandi_send_message를 사용해서 잔디에 테스트 메시지를 보내줘.
body는 "Codex MCP 연결 테스트"로 해줘.
fields에는 source=codex-cli, mode=smoke를 넣어줘.
```

운영 원칙:

- 실제 webhook URL은 Codex prompt, Codex config, shell history, docs에 적지 않습니다.
- Codex MCP config에는 secret을 직접 넣지 말고 project root의 local `.env`를 읽게 합니다.
- 여러 JANDI destination을 지원하기 전까지 이 server는 단일 `JANDI_WEBHOOK_URL`만 사용합니다.
- 여러 destination이 추가되면 사용자가 destination을 명시하지 않은 요청은 보내지 않고 확인해야 합니다.

## HTTP Service Checks

Local backend 확인:

```bash
npm run build
MCP_HTTP_PORT=8710 npm run start:http
curl -i http://127.0.0.1:8710/health
```

systemd service가 enable된 뒤:

```bash
systemctl status mailplug-jandi-mcp --no-pager
journalctl -u mailplug-jandi-mcp -n 100 --no-pager
curl -i http://127.0.0.1:8710/health
```

Apache vhost가 enable된 뒤:

```bash
apache2ctl configtest
curl -i https://mcp.nimbustech.co.kr/mcp
```

## DNS Checks

```bash
getent hosts mcp.nimbustech.co.kr
dig @1.1.1.1 +short mcp.nimbustech.co.kr A
dig @8.8.8.8 +short mcp.nimbustech.co.kr A
```

예상 DNS target은 `49.247.207.165`입니다. Server resolver가 stale이지만 public resolver가 올바르다면, certificate 또는 vhost 검증 전에 cache refresh를 기다립니다.

## Secret Handling

실제 값은 `/opt/mailplug-jandi-mcp/.env` 또는 승인된 server-side secret store에만 둡니다. 아래 항목을 GitHub, README file, Apache example, shell history, issue comment에 붙여넣지 마세요:

- `MAILPLUG_APP_PASSWORD`
- `JANDI_WEBHOOK_URL`
- certificate private key
- 향후 bearer token 또는 API key

## Rollback

Code rollback:

```bash
cd /opt/mailplug-jandi-mcp
git log --oneline -5
git checkout <known-good-commit>
npm install
npm run build
systemctl restart mailplug-jandi-mcp
```

Apache rollback은 새 vhost를 disable하거나 이전 config를 복원한 뒤 아래를 실행합니다:

```bash
apache2ctl configtest
systemctl reload apache2
```

## JANDI-only MVP Day 1 Checklist (2026-06-12)

오늘 범위는 단일 JANDI Incoming Webhook 전송을 위한 운영 결정을 확정하는 것입니다. 실제 JANDI 전송, public `/mcp` 노출, Mailplug POP3/SMTP 연동은 오늘 범위가 아닙니다.

### Decisions To Confirm

| Decision | Current value | Done when |
| --- | --- | --- |
| Primary JANDI room | Decided | 1차 검증 채팅방은 정해졌지만 채팅방 이름과 webhook URL은 repo 문서에 남기지 않음 |
| Webhook storage | Local `.env` first for MVP; server `/opt/mailplug-jandi-mcp/.env` only after approval | 실제 secret 보관 위치와 수정 권한자가 정해짐 |
| First MCP client | TBD, OpenCode or Codex CLI | 2026-06-15 smoke test에 사용할 client가 정해짐 |
| Test message purpose | SalesMap/RAG-ATS result notification smoke | 메시지 문구가 운영 알림과 혼동되지 않는 테스트로 정해짐 |

### Secret-safe Setup Notes

- `JANDI_WEBHOOK_URL`은 JANDI Incoming Webhook URL이며 repository, issue, chat transcript, shell history, live-state note에 기록하지 않습니다.
- Local smoke 전에는 `.env.example`을 `.env`로 복사하고 실제 값은 `.env`에만 입력합니다.
- Server 적용은 별도 승인 전까지 하지 않습니다. 승인 후에도 secret은 `/opt/mailplug-jandi-mcp/.env` 또는 승인된 secret store에만 둡니다.
- `.env` 권한은 local에서는 개인 작업 디렉터리 권한을 따르고, server에서는 `chmod 600 /opt/mailplug-jandi-mcp/.env`를 기준으로 확인합니다.
- Public `/mcp`는 auth, per-user credential routing, revocation, audit 요구사항이 구현되기 전까지 활성화하지 않습니다.

### Next Smoke Test Preparation

2026-06-15에는 아래 중 하나만 선택해 smoke test를 진행합니다.

1. Local stdio MCP client에서 `jandi_build_message`가 payload를 만드는지 확인합니다.
2. Local HTTP MCP server에서 fake local webhook으로 `jandi_send_message` 경로를 확인합니다.
3. 실제 JANDI Incoming Webhook 전송은 사용자가 채팅방과 webhook 보관 위치를 확인한 뒤 별도 승인으로 진행합니다.

### Single Webhook Smoke Setup

1차 MVP는 단일 `JANDI_WEBHOOK_URL`만 사용합니다. 여러 채팅방 destination은 1차 검증 후 `destination_key -> webhook_url` allowlist로 확장합니다.

Local smoke 준비:

1. `.env.example`을 `.env`로 복사합니다.
2. 실제 JANDI Incoming Webhook URL은 `.env`의 `JANDI_WEBHOOK_URL`에만 입력합니다.
3. `npm run smoke:jandi`로 dry-run을 먼저 실행해 MCP client, local HTTP `/mcp`, `jandi_build_message` 경로를 확인합니다.
4. 실제 JANDI 전송은 채팅방, 메시지 문구, 승인자를 확인한 뒤 `JANDI_SMOKE_SEND=1 npm run smoke:jandi`로 실행합니다.

운영 원칙:

- tool argument, 로그, result record에는 실제 webhook URL을 넣지 않습니다.
- 여러 webhook이 필요해지면 호출자는 URL이 아니라 `destination_key`만 넘깁니다.
- server secret은 명시 승인 전까지 작성하지 않고, 승인 후에도 `/opt/mailplug-jandi-mcp/.env` 또는 승인된 secret store에만 둡니다.

Acceptance for day 1:

- Mailplug, Outgoing Webhook, multi-room, public `/mcp`는 backlog로 유지됩니다.
- 단일 Incoming Webhook 채팅방과 secret 보관 원칙은 결정됐으며, 실제 값은 문서에 기록하지 않습니다.
- 실제 webhook URL, token, password, certificate private key가 문서에 없습니다.
