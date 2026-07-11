# Goja Runtime Reference

## Entrypoints

The runtime loads the manifest `entrypoints.main` script and reads functions from `globalThis`.

```javascript
globalThis.dashboard = function(ctx) { return { title: "Dashboard", components: [] }; };
globalThis.detail = function(ctx) { return { title: "Detail", components: [] }; };
globalThis.widget = function(ctx) { return { title: "Widget", components: [] }; };
globalThis.background = function(ctx) { return {}; };
globalThis.actions = {
  refresh: function(ctx) { return { effects: [{ refresh: { surface: "current" } }] }; }
};
```

Required:

- `dashboard(ctx)` for dashboard rendering.

Optional:

- `detail(ctx)` for plugin detail pages. Called when `surface` is `detail`.
- `widget(ctx)` for manifest-declared widgets.
- `background(ctx)` for scheduled background work.
- `globalThis.actions.<actionId>(ctx)` for button/card/form/action menu/confirm interactions.

## Context

Every entrypoint receives a plain object:

```javascript
{
  config: { key: "value" },
  log: { info: Function, error: Function },
  // render only
  surface: "dashboard" | "detail",
  route: "",
  // action only
  actionId: "refresh",
  params: { target: "main" },
  // background only
  taskId: "refresh-demo",
  // widget only
  widgetId: "summary",
  widgetSize: "small" | "medium" | "large" | "unspecified",
  widgetSizeValue: 0 | 1 | 2 | 3
}
```

Permission-gated APIs are only present when the manifest requests the matching permission:

- `ctx.shell`
- `ctx.http`
- `ctx.httpUnix`
- `ctx.cache`

Always check whether an optional API exists before using it if the plugin can run with reduced permissions.

## Shell API

Manifest requirements:

- Permission: `type: "shell"`
- At least one `commands` entry
- Permission shell `command_ids` should include each command ID

Runtime call:

```javascript
const result = ctx.shell.run("docker-ps", { filter: "running" });
// result: { stdout, stderr, exitCode, json? }
```

Command templates are declared in the manifest. Runtime args can only fill fields declared in `args_schema`; undeclared args fail.

```json
{
  "id": "docker-ps",
  "executable": "docker",
  "args": ["ps", "--format", "json", "--filter", "{{filter}}"],
  "timeout_ms": 5000,
  "output_limit_bytes": 65536,
  "output_format": "json",
  "args_schema": [
    { "key": "filter", "label": "Filter", "input": "text", "default_value": "running" }
  ]
}
```

If `output_format` is `json`, `result.json` is populated by parsing stdout.

## HTTP API

Manifest requirements:

- Permission: `type: "http"`
- Set `http.allowed_hosts` or `http.allowed_url_prefixes`

Runtime calls:

```javascript
const res = ctx.http.fetch("https://example.com/api/status");
const res2 = ctx.http.request({
  url: "https://example.com/api/status",
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ ok: true })
});
// response: { status, headers, body, json? }
```

Allowed schemes are `http` and `https`. Host matching supports exact host, exact hostname, or wildcard suffix such as `*.example.com`.

## Unix-Socket HTTP API

Manifest requirements:

- Permission: `type: "http_unix"`
- Set `http_unix.socket_paths`
- Optional `http_unix.allowed_url_prefixes`

Runtime call:

```javascript
const res = ctx.httpUnix.request({
  socketPath: "/var/run/docker.sock",
  url: "http://docker/containers/json",
  method: "GET"
});
```

The URL scheme must be `http`. The socket path must exactly match an allowed cleaned path.

## Cache API

Manifest requirement:

- Permission: `type: "cache"`

Runtime calls:

```javascript
ctx.cache.set("latest/status", { healthy: true }, { ttlMs: 60000 });
const value = ctx.cache.get("latest/status");
const keys = ctx.cache.list("latest/");
ctx.cache.delete("latest/status");
```

Cache values must be JSON-serializable. `ttlMs` is optional. `cache.max_bytes` limits each serialized value, not the full cache directory.

## Background Tasks

Declare tasks in `background_tasks`. The server calls `background(ctx)` during backend runs. If no tasks are declared, the runtime may call `background(ctx)` with `taskId: "default"`.

```javascript
globalThis.background = function(ctx) {
  if (ctx.taskId === "refresh") {
    ctx.cache.set("snapshot", collectSnapshot(ctx), { ttlMs: 60000 });
  }
  return {};
};
```

Use background work to refresh cached data. Keep dashboard/detail/widget renders fast and deterministic by reading cached snapshots when possible.

