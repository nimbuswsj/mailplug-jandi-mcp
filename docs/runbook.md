# 운영 Runbook

이 runbook은 local check와 live HTTP 운영에 사용합니다. 현재 application은 stdio와 Streamable HTTP backend를 모두 제공하지만, `https://mcp.nimbustech.co.kr/mcp` public endpoint는 DNS, certificate, systemd, Apache 작업이 승인된 뒤에만 활성화합니다.

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
