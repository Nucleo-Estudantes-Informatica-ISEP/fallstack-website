# Sanitized proxy transfer tracing

Use the existing Traefik proxy and its durable Compose configuration. Snapshot
that configuration first, validate the edited Compose, and apply during a stable
staging window. Keep routing, TLS, request deadlines and existing bounded
`json-file` rotation unchanged. Do not deploy another proxy for diagnosis.

Enable JSON access logs with `fields.defaultMode=drop` and
`fields.headers.defaultMode=drop`. Keep only:

```text
StartUTC RequestCount RequestMethod RequestProtocol RequestContentSize
DownstreamContentSize OriginContentSize DownstreamStatus OriginStatus
Duration OriginDuration Overhead RetryAttempts
```

`RequestCount` is a process-local correlation sequence, not a persistent user
identifier. Correlate UTC time, method, request bytes and duration with synthetic
client timings and bounded storage traces. No caller-provided identifier is
trusted or logged. Keep addresses, paths (including student codes), query strings,
headers, routers and backend names dropped at the proxy before writing.

Send a harmless synthetic request containing canary query/header values; verify
neither value nor URL/address/header fields appears in stored JSON. Confirm
origin status and duration are present, the existing health probes succeed and
rotation remains bounded. Export only aggregate histograms and sanitized timing
records. Logs from the shared proxy include unrelated traffic; aggregate host
queue metrics are not proof that a specific application request failed.

Before recreating the proxy, snapshot every live Docker network attachment and alias. Compose does not preserve manually attached application networks. Reattach all prior networks immediately after recreation and verify all affected service health probes; never infer success from proxy health alone. Keep the private attachment inventory out of commits.
