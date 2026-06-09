# 배포 가이드

이 repository가 배포 절차, template, 필수 설정, rollback 단계의 source of truth입니다. 서버에는 live runtime file, secret, 그리고 해당 host에서만 사실인 내용을 담은 짧은 non-secret live-state note만 둡니다.

## 현재 배포 상태

현재 application은 stdio MCP server와 Streamable HTTP backend를 모두 제공합니다. HTTP backend는 `127.0.0.1:MCP_HTTP_PORT`에 bind되고 Apache TLS reverse proxy 뒤에서 사용합니다. DNS, certificate, service process가 검증되고 사용자가 승인하기 전까지 Apache vhost를 적용하거나 public-facing systemd service를 설치하지 마세요.

## 목표 구조

```text
MCP client
  -> https://mcp.nimbustech.co.kr/mcp
  -> Apache :443
  -> http://127.0.0.1:8710/mcp
  -> mailplug-jandi-mcp service
```

외부 traffic은 반드시 HTTPS를 사용해야 합니다. `http://127.0.0.1:8710` 구간은 Apache TLS termination 뒤의 server-local traffic입니다.

## Repo와 Server 책임 분리

| Location | Belongs there |
| --- | --- |
| `README.md` | Project overview와 setup docs 링크. |
| `.env.example` | placeholder만 포함한 전체 environment variable reference. |
| `docs/deployment.md` | 재현 가능한 배포 절차와 preflight check. |
| `docs/runbook.md` | 운영 점검과 troubleshooting command. |
| `deploy/apache/*.example` | Apache vhost config 예시만 보관. |
| `deploy/systemd/*.example` | systemd service config 예시만 보관. |
| `/opt/mailplug-jandi-mcp/.env` on server | 실제 secret과 runtime value. 절대 commit하지 않습니다. |
| `/opt/mailplug-jandi-mcp/DEPLOYMENT_STATE.md` on server | 배포 commit, enabled service, certificate 상태, host-specific deviation을 담는 optional non-secret live state. |
| `/etc/apache2/sites-available/` on server | Live Apache vhost config. |
| `/etc/systemd/system/` on server | Live systemd service config. |

재현 가능한 절차는 이 repo에 둡니다. Host-specific state는 repo에 안전하고 정확하게 표현할 수 없을 때만 서버에 둡니다. Server secret, webhook URL, app password, private key, certificate material은 어느 위치에도 복사하지 마세요.

배포가 시작된 뒤 권장하는 server live-state note 경로:

```text
/opt/mailplug-jandi-mcp/DEPLOYMENT_STATE.md
```

이 note에는 deployed git commit, deployment timestamp, service/vhost name, private key 내용이 없는 active certificate path, 이 guide에서 승인된 deviation을 기록할 수 있습니다. Secret value는 기록하면 안 됩니다.

## 필요한 Server 입력값

Live deployment 전에 operator에게 아래 값을 요청합니다:

- Mailplug mailbox address.
- Mailplug app password.
- JANDI Incoming Webhook URL.
- Public resolver와 서버에서 `mcp.nimbustech.co.kr`이 nimbus public IP `49.247.207.165`로 resolve되는지 확인.
- `mcp.nimbustech.co.kr`용 Let's Encrypt certificate 발급 또는 재사용 승인.
- Apache vhost enable과 Apache reload 승인.

## 승인 Gate

Remote work 전에 local check는 실행할 수 있습니다. Host state를 바꾸는 각 remote action 전에는 명시적 승인을 받습니다:

- `/opt/mailplug-jandi-mcp` 생성 또는 수정.
- `/opt/mailplug-jandi-mcp/.env` 또는 secret-store entry 작성.
- Dependency 설치 또는 Node, Apache, Certbot, system package 변경.
- `mcp.nimbustech.co.kr`용 Let's Encrypt certificate 발급 또는 재발급.
- systemd service 설치, enable, start, restart.
- Apache vhost enable 또는 Apache reload.
- Live JANDI webhook request 전송.

Read-only SSH preflight는 서버 준비 상태를 확인하는 데 사용할 수 있습니다. 단, file 생성, package 설치, service reload, secret이 포함된 shell history 기록은 하면 안 됩니다.

## Preflight Checklist

Live config 적용 전에 아래를 실행합니다:

```bash
node --version
npm --version
apache2ctl -M | grep -E 'proxy|proxy_http|ssl|headers|rewrite'
getent hosts mcp.nimbustech.co.kr
dig @1.1.1.1 +short mcp.nimbustech.co.kr A
dig @8.8.8.8 +short mcp.nimbustech.co.kr A
```

`mcp.nimbustech.co.kr`의 예상 DNS target은 `49.247.207.165`입니다. DNS record 변경 직후에는 resolver별 propagation/cache 지연으로 서버 resolver와 public resolver 응답이 일시적으로 다를 수 있습니다.

## Build Procedure

`nimbus`에 무언가를 copy 또는 clone하기 전에 local verification을 실행합니다:

```bash
npm run check
npm run build
npm run dev:http
```

Local verification과 HTTP backend smoke test가 통과한 뒤에만 remote build 준비를 진행합니다.

```bash
git clone git@github.com:nimbuswsj/mailplug-jandi-mcp.git /opt/mailplug-jandi-mcp
cd /opt/mailplug-jandi-mcp
npm install
npm run check
npm run build
cp .env.example .env
chmod 600 .env
```

`/opt/mailplug-jandi-mcp/.env`는 서버에서만 수정합니다. 실제 값을 repo로 다시 복사하지 마세요.

## 향후 HTTP Service 절차

HTTP backend local verification이 통과하고 원격 작업 승인을 받은 뒤:

1. Path와 user를 검토한 뒤 `deploy/systemd/mailplug-jandi-mcp.service.example`을 참고해 live systemd service를 설치합니다.
2. `127.0.0.1:8710`에 bind된 service를 시작합니다.
3. Apache를 건드리기 전에 server-local health/MCP endpoint를 검증합니다.
4. `deploy/apache/mcp.nimbustech.co.kr.conf.example`을 참고해 Apache vhost를 설치합니다.
5. `apache2ctl configtest`를 실행합니다.
6. configtest가 성공한 뒤에만 Apache를 reload합니다.
7. 서버 외부에서 `https://mcp.nimbustech.co.kr/mcp`를 테스트합니다.
