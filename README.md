# Mailplug JANDI MCP

Mailplug 메일 워크플로우와 JANDI 알림을 연결하기 위한 TypeScript MCP scaffold입니다. 현재 구현은 stdio MCP server와 Streamable HTTP backend를 함께 제공합니다. 실제 Mailplug POP3/SMTP 연동과 JANDI 인증 정보는 나중에 로컬 또는 서버 `.env`에서 설정하도록 의도적으로 비워 두었습니다.

## 현재 범위

- `@modelcontextprotocol/sdk@1.29.0` 기반 MCP stdio server.
- Apache reverse proxy 뒤에서 사용할 Streamable HTTP backend (`/mcp`, `/health`).
- MVP에서 사용할 tool 이름:
  - `mailplug_list_recent`
  - `jandi_build_message`
  - `jandi_send_message`
- JANDI Incoming Webhook payload builder와 sender.
- Mailplug 인증 정보와 POP3 동작 방식이 확정되기 전까지 빈 목록을 반환하는 placeholder recent-message tool.
- `mcp.nimbustech.co.kr`용 Apache vhost 예시. 원격 적용은 별도 승인 후 진행합니다.

## 설정

```bash
npm install
cp .env.example .env
npm run check
npm run build
```

`.env`, 실제 webhook URL, Mailplug app password, token, certificate path, secret은 commit하지 마세요.

## 환경 변수

| Variable | Purpose |
| --- | --- |
| `MAILPLUG_EMAIL` | 향후 POP3/SMTP 연동에 사용할 Mailplug mailbox address. |
| `MAILPLUG_APP_PASSWORD` | 향후 POP3/SMTP 연동에 사용할 Mailplug app password. |
| `MAILPLUG_POP3_HOST` | 기본값은 `pop3.mailplug.co.kr`. |
| `MAILPLUG_POP3_PORT` | 기본값은 `995`. |
| `MAILPLUG_SMTP_HOST` | 기본값은 `smtp.mailplug.co.kr`. |
| `MAILPLUG_SMTP_PORT` | 기본값은 `465`. |
| `JANDI_WEBHOOK_URL` | JANDI Incoming Webhook URL. 로컬 `.env`에만 입력합니다. |
| `MCP_PUBLIC_URL` | Public URL, `https://mcp.nimbustech.co.kr/mcp`. |
| `MCP_HTTP_PORT` | Streamable HTTP backend port, 현재 `8710`. |

## 개발 명령어

```bash
npm run dev       # 로컬 stdio MCP server 실행
npm run dev:http  # 로컬 Streamable HTTP backend 실행
npm test          # unit test 실행
npm run typecheck # TypeScript 검사만 실행
npm run build     # dist/ 출력
npm run check     # typecheck + tests
```

## 배포 문서

이 repo가 재현 가능한 배포 절차와 운영 문서의 source of truth입니다. 서버에는 live runtime file, secret, 그리고 배포 commit, enabled service, certificate 상태, 승인된 host-specific deviation 같은 non-secret live-state note만 둡니다.

- `docs/deployment.md`는 target server shape, 필요한 operator input, preflight check, HTTP/vhost 절차를 문서화합니다.
- `docs/runbook.md`는 운영 점검, troubleshooting command, DNS check, secret handling, rollback을 문서화합니다.
- `docs/auth-credential-plan.md`는 public `/mcp` HTTPS 노출 전 필요한 multi-user auth, per-user credential routing, secret storage 요구사항을 문서화합니다.
- `docs/mcp-tooling-notes.md`는 MCP SDK, `registerTool`, Zod schema, agent-facing tool metadata 작성 원칙을 문서화합니다.
- `deploy/apache/`에는 Apache 예시가 있습니다.
- `deploy/systemd/`에는 systemd 예시가 있습니다.

`mcp.nimbustech.co.kr`의 DNS target은 `49.247.207.165`입니다. 변경 직후 resolver별 propagation/cache 지연이 있을 수 있습니다. DNS, certificate 발급, systemd 설치, Apache reload, 배포 타이밍이 명시적으로 승인되기 전까지 live server config를 적용하지 마세요. Public `/mcp` HTTPS 노출은 `docs/auth-credential-plan.md`의 auth와 per-user credential routing 요구사항이 구현될 때까지 차단합니다. `nimbus`에 live-state note가 필요하면 `/opt/mailplug-jandi-mcp/DEPLOYMENT_STATE.md`에 server-local로 두고 모든 secret은 제외합니다.
