# Apache 배포 Notes

이 파일들은 `mcp.nimbustech.co.kr`용 Apache 예시입니다. 사용자가 live vhost 작업을 승인하기 전까지 enable하지 마세요.

예정 구조:

```text
Apache 443 mcp.nimbustech.co.kr
  -> http://127.0.0.1:8710/
```

이 예시는 `/`를 backend root로 proxy하므로 `https://mcp.nimbustech.co.kr/mcp`는 `http://127.0.0.1:8710/mcp`에 도달하고, `https://mcp.nimbustech.co.kr/health`는 `http://127.0.0.1:8710/health`에 도달합니다. Backend route local smoke test가 통과하기 전까지 vhost를 enable하지 마세요.

Live 환경에 적용하기 전에:

1. Server와 public resolver에서 `mcp.nimbustech.co.kr`이 nimbus public IP `49.247.207.165`로 resolve되는지 확인합니다. DNS propagation/cache 지연이 있을 수 있습니다.
2. MCP app이 `127.0.0.1:8710`에서 실행 중인지 확인합니다.
3. Backend가 `/mcp`와 문서화된 health route를 구현했는지 확인합니다.
4. `mcp.nimbustech.co.kr`용 Let's Encrypt certificate를 발급했거나 사용할 수 있는지 확인합니다.
5. Reload 전에 `apache2ctl configtest`를 실행합니다.
