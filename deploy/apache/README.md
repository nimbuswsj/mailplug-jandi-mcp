# Apache Deployment Notes

These files are future-only examples for `mcp.nimbustech.co.kr`. They should not be enabled until the user approves live vhost work.

Planned shape:

```text
Apache 443 mcp.nimbustech.co.kr
  -> http://127.0.0.1:8710/
```

Before applying anything live:

1. Confirm `mcp.nimbustech.co.kr` resolves to the nimbus public IP from the server and public resolvers.
2. Confirm the MCP app is running on `127.0.0.1:8710`.
3. Issue or confirm the Let's Encrypt certificate for `mcp.nimbustech.co.kr`.
4. Run `apache2ctl configtest` before reload.
