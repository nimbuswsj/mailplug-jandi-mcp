# Auth와 Credential 설계 계획

이 문서는 `https://mcp.nimbustech.co.kr/mcp`를 public HTTPS로 노출하기 전에 필요한 multi-user auth, 사용자별 credential routing, secret storage 요구사항을 정리합니다. 현재 구현은 local systemd service가 `127.0.0.1:8710`에서 동작하는 단계이며, public Apache route는 이 문서의 gate가 충족될 때까지 활성화하지 않습니다.

## 목적

- MCP HTTP 요청에서 호출 사용자를 안정적으로 식별합니다.
- 식별된 사용자별로 Mailplug credential과 JANDI destination을 분리합니다.
- Mailplug app password, JANDI Incoming Webhook URL, bearer token 같은 secret을 repository와 문서에 남기지 않습니다.
- public MCP 접근은 opaque `Bearer` token 방식으로 제한하고, Mailplug credential은 사용자별로 별도 등록합니다.

## 현재 상태

- TypeScript MCP server는 stdio backend와 Streamable HTTP backend를 함께 제공합니다.
- HTTP backend는 `/health`, `/mcp` endpoint를 제공하며 Apache TLS reverse proxy 뒤에서 사용할 예정입니다.
- 현재 `src/env.ts`와 `src/types.ts`의 `MAILPLUG_*`, `JANDI_WEBHOOK_URL`, `MCP_*` 설정은 global `.env` 기준입니다.
- 현재 tool인 `mailplug_list_recent`, `jandi_build_message`, `jandi_send_message`는 caller identity를 받거나 사용자별 설정을 조회하지 않습니다.
- 따라서 현재 상태에서 public `/mcp`를 열면 모든 사용자가 같은 global Mailplug/JANDI 설정을 공유하게 됩니다.

## Non-goals

- 이 문서는 auth code 구현 문서가 아닙니다.
- 이 문서는 실제 Mailplug password, JANDI webhook URL, private key, bearer token 값을 기록하지 않습니다.
- 이 문서는 token을 URL query string으로 전달하는 방식을 허용하지 않습니다.
- 이 문서는 Mailplug 비공개 API, domain-wide delegation, delegated login이 있다고 가정하지 않습니다.

## Identity model

Streamable HTTP MCP에서는 client software name이나 접속 PC만으로 사용자를 식별하지 않습니다. 사용자 식별은 MCP request의 `Authorization` header로 전달된 opaque token 검증 결과로 결정합니다.

요구사항:

- 모든 public `/mcp` 요청은 인증된 `user_id`로 매핑되어야 합니다.
- 인증 실패, 만료, 회수된 token은 tool 실행 전에 거부해야 합니다.
- `clientInfo`는 software 식별 보조 정보로만 사용하고 사용자 identity로 사용하지 않습니다.
- 같은 PC에서 여러 사용자가 설정을 바꿔 쓸 수 있으므로 PC identity에 의존하지 않습니다.

## Auth path

public MCP 접근은 opaque per-user token을 `Authorization` header로 전달하는 방식을 사용합니다.

요구사항:

- token은 사용자별로 발급하고 server-side hash 또는 동등한 안전한 형태로 저장합니다.
- client는 `Authorization` header의 `Bearer` scheme으로 token을 보냅니다.
- server는 token을 검증해 `user_id`를 결정합니다.
- token에는 만료, 회수, 재발급 절차가 있어야 합니다.
- token 값은 log, docs, issue, shell history, live-state note에 남기지 않습니다.
- URL query string, path segment, request body를 auth token 전달 경로로 사용하지 않습니다.

이 방식은 Claude Code, Cursor, `mcp-remote`처럼 custom header 또는 env interpolation을 지원하는 client에서 검증합니다. static `Authorization` header를 지원하지 않는 client는 지원 대상에서 제외하거나 bridge 구성을 별도로 검토합니다.

## Per-user credential model

인증된 `user_id`를 기준으로 아래 데이터를 분리합니다.

- 사용자 계정 상태와 auth subject/token metadata.
- 사용자별 Mailplug account와 encrypted app password 또는 동등한 user-scoped credential.
- 사용자별 JANDI destination 또는 Incoming Webhook integration.
- 사용자별 mail sync/cache 상태와 마지막 sync cursor.
- 사용자별 tool execution audit metadata.

tool handler는 global `.env`에서 Mailplug/JANDI credential을 직접 읽지 않고, request context의 `user_id`로 credential store를 조회해야 합니다.

## Mailplug credential storage

현재 공개 문서 기준으로 Mailplug 연동은 POP3/IMAP/SMTP와 app password 중심으로 봅니다. 따라서 multi-user 운영에서는 사용자별 Mailplug app password 또는 동등한 user-scoped credential을 저장해야 합니다.

요구사항:

- credential은 encryption at rest를 적용해 저장합니다.
- encryption key의 위치, 접근 권한, rotation owner를 정합니다.
- DB dump, backup, log, error report에 secret 값이 포함되지 않게 합니다.
- app password 만료, 미사용 삭제, 사용자 재등록 flow를 운영 절차에 포함합니다.
- credential 사용 시점과 실패 사유는 감사 가능해야 하지만 secret 값은 기록하지 않습니다.

## JANDI credential routing

JANDI Incoming Webhook URL은 caller identity가 아니라 destination/integration secret입니다. 하나의 `JANDI_WEBHOOK_URL`은 하나의 destination으로 봐야 하며, 여러 사용자가 공유하면 메시지 발송 대상과 권한이 섞입니다.

요구사항:

- 사용자별 또는 팀별 JANDI destination을 명시적으로 등록합니다.
- `jandi_send_message`는 인증된 `user_id`가 접근 가능한 destination만 사용할 수 있어야 합니다.
- webhook URL은 encrypted secret으로 저장합니다.
- 발송 audit에는 사용자, destination identifier, timestamp, 결과를 기록하되 webhook URL은 기록하지 않습니다.
- destination 삭제 또는 rotation 시 기존 token/webhook을 즉시 사용할 수 없게 합니다.

## Multi-destination webhook storage model

1차 MVP 이후 여러 JANDI 채팅방을 지원할 때는 실제 webhook URL을 tool input으로 받지 않습니다. 호출자는 `destination_key`만 전달하고, server는 등록된 allowlist에서 해당 key를 실제 Incoming Webhook secret으로 해석합니다.

권장 모델:

| Field | 설명 | Secret 여부 |
| --- | --- | --- |
| `destination_key` | 사람이 읽을 수 있는 stable key. 예: `salesmap-alerts`, `dev-alerts` | No |
| `display_name` | 운영자가 구분할 수 있는 채팅방 설명 | No |
| `owner_user_id` 또는 `team_id` | destination 소유자 또는 접근 범위 | No |
| `webhook_secret_ref` | encrypted secret 또는 secret-store entry를 가리키는 참조 | No |
| `webhook_url` | JANDI Incoming Webhook 원문 URL | Yes |
| `enabled` | 발송 허용 여부 | No |
| `created_at`, `rotated_at` | audit와 rotation 추적용 metadata | No |

처리 흐름:

1. `jandi_send_message`는 `destination_key`를 입력으로 받습니다.
2. 인증된 `user_id`가 해당 destination에 접근 가능한지 확인합니다.
3. server-side store에서 webhook secret을 조회합니다.
4. JANDI로 전송합니다.
5. audit event에는 `user_id`, `destination_key`, timestamp, 결과만 기록하고 webhook URL은 기록하지 않습니다.

초기 allowlist 단계에서는 단일 운영자 관리 파일이나 server-side secret store를 사용할 수 있지만, public `/mcp` 단계에서는 encrypted storage, per-user authorization, revocation, rotation 절차가 필요합니다.

## Agent-facing destination safety

여러 JANDI 채팅방을 지원하는 순간부터 destination 선택은 에이전트의 추론이나 기본값에 맡기지 않습니다. Tool metadata는 에이전트에게 사용법을 안내하지만, 오발송 방지는 schema와 handler validation으로 강제합니다.

요구사항:

- `destination_key`는 `jandi_send_message`의 필수 입력으로 둡니다.
- 단일 global `JANDI_WEBHOOK_URL` fallback은 multi-destination 단계에서 제거하거나 local-only로 제한합니다.
- destination이 없는 요청은 tool error로 실패시키고, 에이전트가 사용자에게 대상 채팅방을 다시 묻게 합니다.
- 등록되지 않은 `destination_key`, disabled destination, 권한 없는 destination은 모두 거부합니다.
- tool description에는 “destination이 명시되지 않으면 사용자에게 확인한다”는 지침을 포함합니다.
- 사용 가능한 destination 목록은 secret-free `destination_key`, `display_name`, usage note만 노출합니다.
- 실제 webhook URL은 tool argument, tool result, MCP resource, prompt, log, audit event에 포함하지 않습니다.

권장 tool 입력 모델:

```ts
inputSchema: {
  destination_key: z.enum(["salesmap-alerts", "dev-alerts"]),
  body: z.string().min(1),
  color: z.string().optional(),
  fields: z.array(z.object({
    title: z.string(),
    description: z.string(),
    imageUrl: z.string().optional()
  })).optional()
}
```

금지할 모델:

```ts
inputSchema: {
  destination_key: z.string().optional(),
  body: z.string().min(1)
}
```

`destination_key`를 optional로 두고 기본 채팅방으로 보내는 방식은 사용자가 대상을 명시하지 않은 요청을 임의 room으로 전송할 수 있으므로 사용하지 않습니다.

향후 read-only helper를 추가한다면 `jandi_list_destinations` 또는 `jandi://destinations` resource처럼 secret 없는 destination 목록만 반환합니다. 이 helper도 권한 범위 안의 destination만 보여줘야 합니다.

## POP3 limitations와 cache/search model

POP3는 실시간 검색 API가 아니라 제한된 mailbox retrieval protocol로 취급합니다. 공개 문서 기준으로 POP3는 받은 메일함 중심이며 최초 연결 시 최근 기간 메일만 가져오는 제약이 있을 수 있습니다.

권장 모델:

- 사용자별 Mailplug credential로 background sync를 수행합니다.
- sync 결과를 사용자별 mail cache/search index에 저장합니다.
- `mailplug_list_recent`와 향후 검색 tool은 Mailplug POP3에 매 요청 직접 질의하지 않고 cache를 조회합니다.
- sync cursor, failure backoff, credential 만료 상태를 사용자별로 관리합니다.
- 오래된 메일, 전체 mailbox, folder sync가 필요하면 IMAP 가능성 또는 Mailplug 지원 정책을 별도로 확인합니다.

## Public HTTPS exposure gate

다음 조건이 충족되기 전까지 public `/mcp` HTTPS route를 활성화하지 않습니다.

- 모든 `/mcp` 요청이 인증을 요구합니다.
- 인증 결과가 안정적인 `user_id`로 매핑됩니다.
- tool handler가 `user_id` 기준으로 Mailplug/JANDI credential을 조회합니다.
- global `JANDI_WEBHOOK_URL`, `MAILPLUG_EMAIL`, `MAILPLUG_APP_PASSWORD` 기반 public 동작이 제거되거나 local-only로 제한됩니다.
- token revocation, credential rotation, audit log가 운영 가능해야 합니다.
- public endpoint smoke test가 unauthenticated request를 거부하고 authenticated request만 tool 실행을 허용해야 합니다.

## Audit, rotation, revocation

운영 요구사항:

- auth success/failure, token revocation, credential 등록/삭제/rotation, JANDI 발송 시도를 audit event로 남깁니다.
- audit event에는 secret 원문, webhook URL, app password, bearer token을 포함하지 않습니다.
- 사용자 token은 즉시 revocation이 가능해야 합니다.
- Mailplug app password와 JANDI webhook은 사용자 요청 또는 incident 대응 시 rotation할 수 있어야 합니다.
- key rotation 시 기존 encrypted credential을 재암호화하거나 단계적 migration할 절차를 둡니다.

## Secret safety rules

- repository, README, docs, issue, commit message, shell history에 secret 값을 기록하지 않습니다.
- token은 `Authorization` header로만 전달합니다.
- URL query string으로 token이나 credential을 전달하지 않습니다.
- 문서에는 실제 값뿐 아니라 그럴듯한 fake token, fake webhook URL, fake password도 넣지 않습니다.
- `/opt/mailplug-jandi-mcp/.env` 또는 승인된 server-side secret store만 runtime secret 위치로 사용합니다.
- live-state note에는 secret-free 상태 정보만 기록합니다.

## Future implementation checklist

- HTTP request context에서 `Authorization` header를 읽고 검증합니다.
- 검증 결과를 `user_id`로 변환하고 tool handler에 전달합니다.
- 사용자, token metadata, Mailplug account, JANDI destination, mail cache table 또는 동등한 storage model을 정의합니다.
- JANDI destination은 `destination_key`와 encrypted webhook secret reference로 분리합니다.
- Mailplug/JANDI secret은 encryption at rest와 access control을 적용해 저장합니다.
- `jandi_send_message`는 사용자별 destination 권한을 확인한 뒤 발송합니다.
- `mailplug_list_recent`는 사용자별 cache를 조회하도록 변경합니다.
- unauthenticated request, revoked token, credential missing, unauthorized destination, successful send에 대한 test를 추가합니다.
- public Apache route 활성화 전 unauthenticated `/mcp`가 거부되는 smoke test를 실행합니다.
