# Plugin Protocol Reference

## Naming Rules

There are two JSON surfaces with different conventions:

- Marketplace `manifest.json`: snake_case field names and short enum values such as `"http"`, `"select"`, `"json"`.
- Goja returned component/action JSON: lowerCamelCase protobuf JSON names and full protobuf enum names such as `"PLUGIN_ACCENT_BLUE"`.

Do not mix them. A common bug is using `input: "text"` inside a Goja-rendered form; rendered forms should use `input: "PLUGIN_CONFIG_INPUT_TEXT"`.

## Marketplace Index

`/Users/codelover/agent/myservers-plugins/plugins/index.json` is the marketplace entry list:

```json
[
  {
    "id": "my-plugin",
    "name": "My Plugin",
    "description": "Plugin description",
    "icon": "shippingbox.fill",
    "latest_version": "1.0.0",
    "manifest_path": "plugins/my-plugin/1.0.0/manifest.json"
  }
]
```

The public API reads this repository through:

```text
https://raw.githubusercontent.com/my-servers/myservers-plugins/main
```

## Manifest Shape

Minimum manifest:

```json
{
  "id": "my-plugin",
  "version": "1.0.0",
  "name": "My Plugin",
  "description": "What it does",
  "icon": "shippingbox.fill",
  "min_server_version": "3.0.20",
  "min_app_version": "3.18",
  "permissions": [],
  "config_schema": [],
  "commands": [],
  "entrypoints": { "main": "main.js" },
  "assets": [
    {
      "path": "main.js",
      "kind": "script",
      "url": "https://raw.githubusercontent.com/my-servers/myservers-plugins/main/plugins/my-plugin/1.0.0/main.js"
    }
  ],
  "checksums": {
    "main.js": "sha256:<64 lowercase hex chars>"
  },
  "widgets": [],
  "background_tasks": []
}
```

Manifest validation requires:

- `id`
- `version`
- `entrypoints.main`
- Shell permission must have at least one command template
- Each command must have unique non-empty `id` and non-empty `executable`
- HTTP permission must declare allowed hosts, allowed URL prefixes, or scopes
- HTTP Unix permission must declare socket paths
- Each widget must have unique non-empty `id` and non-empty `name`
- Background task `interval_ms` must be non-negative

## Permissions

HTTP:

```json
{
  "type": "http",
  "reason": "Read service status API",
  "http": {
    "allowed_hosts": ["api.example.com"],
    "allowed_url_prefixes": ["https://api.example.com/v1/"],
    "timeout_ms": 10000,
    "response_limit_bytes": 1048576
  }
}
```

Cache:

```json
{
  "type": "cache",
  "reason": "Store recent service snapshots",
  "cache": { "max_bytes": 1048576 }
}
```

Shell:

```json
{
  "type": "shell",
  "reason": "Read Docker container state through a declared command template",
  "shell": { "command_ids": ["docker-ps"] }
}
```

HTTP Unix:

```json
{
  "type": "http_unix",
  "reason": "Read Docker Engine API through docker.sock",
  "http_unix": {
    "socket_paths": ["/var/run/docker.sock"],
    "allowed_url_prefixes": ["http://docker/containers/"],
    "timeout_ms": 10000,
    "response_limit_bytes": 1048576
  }
}
```

## Config Schema

Manifest config fields use short input values:

```json
{
  "key": "host_label",
  "label": "Display name",
  "description": "Shown in dashboard and detail pages",
  "placeholder": "NAS",
  "input": "text",
  "required": false,
  "default_value": "NAS",
  "secret": false
}
```

Supported manifest `input` values:

- `text`
- `textarea`
- `number`
- `password`
- `select`
- `switch`

Use `options` for `select`:

```json
"options": [
  { "label": "Blue", "value": "blue" },
  { "label": "Green", "value": "green" }
]
```

All config values are delivered to Goja as strings in `ctx.config`.

## Render Responses

`dashboard(ctx)` and `detail(ctx)` return:

```javascript
return {
  title: "Page title",
  components: [
    { id: "title", text: { text: "Hello", style: "PLUGIN_TEXT_STYLE_TITLE" } }
  ]
};
```

`widget(ctx)` returns:

```javascript
return {
  title: "Widget title",
  components: [
    { id: "summary", value: { title: "Status", value: { text: "Online" } } }
  ]
};
```

## Action Responses

Actions return ordered effects:

```javascript
return {
  effects: [
    { toast: { text: "Done", level: "success", icon: "checkmark.circle", durationMs: 1600 } },
    { refresh: { surface: "current" } },
    { navigate: { surface: "detail", route: "overview" } },
    { replaceComponents: { targetId: "metrics", components: [] } }
  ]
};
```

Supported effects:

- `toast`: `text`, `level` (`info`, `success`, `warning`, `error`), `icon`, `durationMs`
- `navigate`: `surface` (`detail`), `route`
- `refresh`: `surface` (`current`, `dashboard`, `detail`, `widget`)
- `replaceComponents`: `targetId`, `components`

Legacy action effects with a `type` field are rejected.

## Protocol Source Of Truth

Plugin protocol messages are in both files and must stay identical if edited:

- `/Users/codelover/agent/myservers/server/entity/api.proto`
- `/Users/codelover/agent/myservers/IOS-client/myServer/api.proto`

Important messages:

- `PluginManifest`
- `PluginPermission`
- `PluginCommand`
- `PluginConfigField`
- `PluginRenderReq` / `PluginRenderRsp`
- `PluginActionReq` / `PluginActionRsp`
- `PluginWidgetData`
- `PluginComponent` and all component messages
- `WidgetSize`

Only change proto when the platform cannot express the user requirement. If proto changes, update both copies and regenerate/verify generated server and iOS code.

