---
name: myservers-plugin-dev-en
description: English guide for agents to create, update, validate, publish, and install MyServers Goja plugins from the myservers-plugins repository, covering manifest files, marketplace index, server installation, dashboard/detail/widget rendering, actions, background tasks, config forms, permissions, runtime APIs, component DSL, checksums, and release flow.
---

# MyServers Goja Plugin Development

This skill lets a user ask an agent to build a complete MyServers plugin from a product request. The expected output is a versioned plugin in the current plugin repository that can be downloaded from the marketplace and installed into a MyServers server.

## Repository Layout

Work from the plugin repository root:

```text
plugins/index.json
plugins/<plugin-id>/<version>/manifest.json
plugins/<plugin-id>/<version>/main.js
```

The version directory is the release unit. For an update, create a new version directory instead of editing an already published version in place.

## Workflow

1. Convert the user request into plugin capabilities:
   - What to show: dashboard, detail page, iOS widget.
   - What to operate: buttons, forms, menus, confirmations, actions.
   - What data source to use: config, HTTP, Unix-socket HTTP, shell command templates, cache, background refresh.
2. Create or copy a version directory:
   - New plugin: `plugins/<plugin-id>/1.0.0/`
   - Existing plugin: copy the latest version to the next version, such as `1.0.1`.
3. Write `manifest.json`:
   - Declare plugin metadata, entrypoints, assets, checksums, config schema, permissions, commands, widgets, and background tasks.
4. Write `main.js`:
   - Implement at least `globalThis.dashboard(ctx)`.
   - Add `detail`, `widget`, `background`, and `globalThis.actions` when needed.
5. Compute the SHA-256 checksum for `main.js` and update `manifest.checksums`.
6. Update `plugins/index.json` with `latest_version` and `manifest_path`.
7. Validate JSON, asset paths, and checksums.
8. Commit and push the plugin repository. The app can only download what has been pushed.

## How A Plugin Is Installed Into A Server

Do not tell users to copy files directly into the server runtime. The standard installation path is:

1. Push the plugin repository to GitHub.
2. `plugins/index.json` exposes the marketplace entry.
3. The app plugin marketplace reads the plugin detail and `manifest.json`.
4. The user installs the plugin in the app, approves permissions, and fills config values.
5. The app sends the manifest, config, and approved permissions to the MyServers server.
6. The server downloads `assets`, verifies `checksums`, and loads the Goja runtime.
7. Dashboard, detail pages, and widgets execute `main.js` on the server and render the returned component data.

Plugin-only JavaScript or manifest changes usually do not require server changes. Server/app changes are only needed for new protocol fields, new component types, or new runtime capabilities.

## manifest.json

Minimal example:

```json
{
  "id": "demo-status",
  "version": "1.0.0",
  "name": "Demo Status",
  "description": "Shows a service status plugin.",
  "icon": "server.rack",
  "min_server_version": "3.0.20",
  "min_app_version": "3.18",
  "permissions": [],
  "config_schema": [],
  "commands": [],
  "entrypoints": {
    "main": "main.js"
  },
  "assets": [
    {
      "path": "main.js",
      "kind": "script",
      "url": "https://raw.githubusercontent.com/my-servers/myservers-plugins/main/plugins/demo-status/1.0.0/main.js"
    }
  ],
  "checksums": {
    "main.js": "sha256:<64-char-sha256>"
  },
  "widgets": [],
  "background_tasks": []
}
```

`plugins/index.json` example:

```json
[
  {
    "id": "demo-status",
    "name": "Demo Status",
    "description": "Shows a service status plugin.",
    "icon": "server.rack",
    "latest_version": "1.0.0",
    "manifest_path": "plugins/demo-status/1.0.0/manifest.json"
  }
]
```

## Goja Entrypoints

The script runs synchronously in server-side Goja. It has no Node.js APIs, browser DOM, `require`, `import`, or async `await`.

```javascript
globalThis.dashboard = function(ctx) {
  return { title: "Dashboard", components: [] };
};

globalThis.detail = function(ctx) {
  return { title: "Detail", components: [] };
};

globalThis.widget = function(ctx) {
  return { title: "Widget", components: [] };
};

globalThis.background = function(ctx) {
  return {};
};

globalThis.actions = {
  refresh: function(ctx) {
    return { effects: [{ refresh: { surface: "current" } }] };
  }
};
```

Context object:

```javascript
{
  config: { key: "value" },
  log: { info: Function, error: Function },
  surface: "dashboard" | "detail",
  route: "",
  actionId: "refresh",
  params: { key: "value" },
  taskId: "refresh",
  widgetId: "summary",
  widgetSize: "small" | "medium" | "large" | "unspecified",
  widgetSizeValue: 0 | 1 | 2 | 3
}
```

## Config Capability

Manifest config fields use short values:

```json
{
  "config_schema": [
    {
      "key": "base_url",
      "label": "Service URL",
      "description": "For example http://192.168.1.10:8080",
      "placeholder": "http://127.0.0.1:8080",
      "input": "text",
      "required": true,
      "default_value": ""
    },
    {
      "key": "token",
      "label": "Token",
      "input": "password",
      "required": false,
      "secret": true
    },
    {
      "key": "accent",
      "label": "Accent",
      "input": "select",
      "default_value": "blue",
      "options": [
        { "label": "Blue", "value": "blue" },
        { "label": "Green", "value": "green" }
      ]
    }
  ]
}
```

Supported inputs: `text`, `textarea`, `number`, `password`, `select`, `switch`. Goja reads values from `ctx.config`; all values are strings.

## Permissions And Runtime APIs

Permissions must be declared in the manifest and approved by the user during installation. If a permission is missing, the matching API will not exist on `ctx`.

### HTTP

Manifest:

```json
{
  "type": "http",
  "reason": "Read the service status API",
  "http": {
    "allowed_hosts": ["api.example.com"],
    "allowed_url_prefixes": ["https://api.example.com/v1/"],
    "timeout_ms": 10000,
    "response_limit_bytes": 1048576
  }
}
```

JS:

```javascript
const res = ctx.http.request({
  url: ctx.config.base_url + "/api/status",
  method: "GET",
  headers: { "authorization": "Bearer " + ctx.config.token }
});
const data = res.json || {};
```

### Unix-Socket HTTP

Use this for local Unix socket APIs such as Docker socket.

Manifest:

```json
{
  "type": "http_unix",
  "reason": "Read container state through Docker Socket",
  "http_unix": {
    "socket_paths": ["/var/run/docker.sock"],
    "allowed_url_prefixes": ["http://docker/containers/"],
    "timeout_ms": 10000,
    "response_limit_bytes": 1048576
  }
}
```

JS:

```javascript
const res = ctx.httpUnix.request({
  socketPath: "/var/run/docker.sock",
  url: "http://docker/containers/json",
  method: "GET"
});
const containers = res.json || [];
```

### Shell

Shell can only execute command templates declared in the manifest. Do not build arbitrary command strings.

Manifest:

```json
{
  "permissions": [
    {
      "type": "shell",
      "reason": "Read Docker runtime state",
      "shell": { "command_ids": ["docker-ps"] }
    }
  ],
  "commands": [
    {
      "id": "docker-ps",
      "executable": "docker",
      "args": ["ps", "--format", "json", "--filter", "{{filter}}"],
      "timeout_ms": 5000,
      "output_limit_bytes": 65536,
      "output_format": "json",
      "args_schema": [
        { "key": "filter", "label": "Filter", "input": "text", "default_value": "status=running" }
      ]
    }
  ]
}
```

JS:

```javascript
const result = ctx.shell.run("docker-ps", { filter: "status=running" });
const rows = result.json || [];
```

### Cache

Use cache for background snapshots so rendering does not need to hit external services every time.

Manifest:

```json
{
  "type": "cache",
  "reason": "Cache the latest service snapshot",
  "cache": { "max_bytes": 1048576 }
}
```

JS:

```javascript
ctx.cache.set("snapshot", { healthy: true }, { ttlMs: 60000 });
const snapshot = ctx.cache.get("snapshot");
const keys = ctx.cache.list("");
ctx.cache.delete("snapshot");
```

## Pages And Component DSL

Goja returns protobuf JSON. Components must use oneof-shaped lowerCamelCase fields:

```javascript
{
  id: "title",
  text: { text: "NAS Online", style: "PLUGIN_TEXT_STYLE_TITLE" }
}
```

Do not use legacy shape:

```javascript
{ type: "text", text: "NAS Online" }
```

Common enums:

- Accent: `PLUGIN_ACCENT_BLUE`, `PLUGIN_ACCENT_GREEN`, `PLUGIN_ACCENT_ORANGE`, `PLUGIN_ACCENT_RED`, `PLUGIN_ACCENT_PURPLE`, `PLUGIN_ACCENT_INDIGO`, `PLUGIN_ACCENT_TEAL`, `PLUGIN_ACCENT_GRAY`
- Status: `PLUGIN_STATUS_HEALTHY`, `PLUGIN_STATUS_WARNING`, `PLUGIN_STATUS_ERROR`, `PLUGIN_STATUS_RUNNING`, `PLUGIN_STATUS_STOPPED`
- Text style: `PLUGIN_TEXT_STYLE_TITLE`, `PLUGIN_TEXT_STYLE_SUBTITLE`, `PLUGIN_TEXT_STYLE_BODY`, `PLUGIN_TEXT_STYLE_CAPTION`, `PLUGIN_TEXT_STYLE_VALUE`
- Value format: `PLUGIN_VALUE_FORMAT_TEXT`, `PLUGIN_VALUE_FORMAT_NUMBER`, `PLUGIN_VALUE_FORMAT_PERCENT`, `PLUGIN_VALUE_FORMAT_BYTES`, `PLUGIN_VALUE_FORMAT_DURATION`

Supported components and examples:

```javascript
// Stack
{ id: "header", stack: { axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL", spacing: 8, children: [] } }

// Grid
{ id: "metrics", grid: { columns: 2, spacing: 8, children: [] } }

// Card
{ id: "card", card: { children: [], onTap: { plugin: { actionId: "openDetail" } } } }

// Text
{ id: "text", text: { text: "Body copy", style: "PLUGIN_TEXT_STYLE_BODY" } }

// Value
{ id: "cpu", value: { title: "CPU", value: { number: 0.32, format: "PLUGIN_VALUE_FORMAT_PERCENT" } } }

// Badge
{ id: "badge", badge: { text: "Online", value: { status: "PLUGIN_STATUS_RUNNING" } } }

// Button
{ id: "button", button: { title: "Refresh", onTap: { plugin: { actionId: "refresh" } } } }

// List
{ id: "list", list: { title: "Containers", items: [{ title: "nginx", value: { text: "Running" } }] } }

// Progress
{ id: "storage", progress: { title: "Storage", progress: 0.64, value: { number: 0.64, format: "PLUGIN_VALUE_FORMAT_PERCENT" } } }

// Chart
{ id: "chart", chart: { title: "Load", kind: "PLUGIN_CHART_KIND_LINE", points: [{ label: "now", value: 32 }] } }

// Segmented Gauge
{ id: "memory", segmentedGauge: { title: "Memory", centerValue: { number: 0.68, format: "PLUGIN_VALUE_FORMAT_PERCENT" }, showLegend: true, segments: [{ label: "Used", value: 68 }] } }

// Table
{ id: "table", table: { title: "Processes", columns: [{ key: "name", title: "Name" }], rows: [{ id: "1", values: { name: { text: "dockerd" } } }] } }

// Description List
{ id: "desc", descriptionList: { title: "Info", columns: 2, items: [{ title: "Version", value: { text: "1.0.0" } }] } }

// Form
{ id: "form", form: { title: "Filter", submitTitle: "Apply", fields: [{ key: "q", label: "Keyword", input: "PLUGIN_CONFIG_INPUT_TEXT" }], onSubmit: { plugin: { actionId: "applyFilter" } } } }

// Action Menu
{ id: "menu", actionMenu: { title: "Actions", items: [{ title: "Refresh", onTap: { plugin: { actionId: "refresh" } } }] } }

// Confirm
{ id: "confirm", confirm: { title: "Restart", message: "Restart now?", confirmTitle: "Restart", destructive: true, onConfirm: { plugin: { actionId: "restart" } } } }

// Tabs
{ id: "tabs", tabs: { selectedId: "overview", tabs: [{ id: "overview", title: "Overview", children: [] }] } }

// Disclosure
{ id: "more", disclosure: { title: "Advanced", expanded: false, children: [] } }

// State Block
{ id: "empty", stateBlock: { kind: "PLUGIN_STATE_KIND_EMPTY", title: "No data" } }

// Code Block
{ id: "raw", codeBlock: { title: "JSON", code: "{}", language: "json", wrap: true } }

// Icon / Image / Divider / Spacer
{ id: "icon", icon: { name: "shippingbox.fill" } }
{ id: "image", image: { url: "https://example.com/a.png", mode: "fit" } }
{ id: "line", divider: {} }
{ id: "gap", spacer: { length: 12 } }
```

## Actions

Tappable components use:

```javascript
onTap: { plugin: { actionId: "refresh", params: { scope: "all" } } }
onTap: { navigate: { surface: "detail", route: "overview" } }
```

Actions return effects:

```javascript
globalThis.actions = {
  refresh: function(ctx) {
    return {
      effects: [
        { toast: { text: "Refreshed", level: "success" } },
        { refresh: { surface: "current" } },
        { navigate: { surface: "detail", route: "overview" } },
        { replaceComponents: { targetId: "metrics", components: [] } }
      ]
    };
  }
};
```

Supported effects:

- `toast`: show a message.
- `refresh`: refresh `current`, `dashboard`, `detail`, or `widget`.
- `navigate`: open a detail page.
- `replaceComponents`: replace a target component.

## Widgets

Widgets use the same component DSL, but must branch by size:

```javascript
globalThis.widget = function(ctx) {
  const size = ctx.widgetSize || "unspecified";
  const children = [
    { id: "title", text: { text: "NAS Online", style: "PLUGIN_TEXT_STYLE_TITLE" } },
    { id: "summary", text: { text: "Storage 64% · 12 containers", style: "PLUGIN_TEXT_STYLE_CAPTION" } }
  ];

  if (size === "medium" || size === "large" || size === "unspecified") {
    children.push({
      id: "storage",
      progress: {
        title: "Main pool",
        progress: 0.64,
        value: { number: 0.64, format: "PLUGIN_VALUE_FORMAT_PERCENT" },
        appearance: { accent: "PLUGIN_ACCENT_TEAL", hideBackground: true }
      }
    });
  }

  if (size === "large") {
    children.push({
      id: "resources",
      list: {
        title: "Resources",
        items: [
          { title: "CPU", value: { text: "32%" } },
          { title: "Memory", value: { text: "56%" } }
        ],
        appearance: { hideBackground: true }
      }
    });
  }

  return { title: "NAS Widget", components: [{ id: "widget-card", card: { children } }] };
};
```

Design rules:

- `small`: one card, title plus one summary line.
- `medium`: add one progress or key metric.
- `large`: add a list or more metrics.
- Avoid tables, long code blocks, long text, and deeply nested layouts.

## Background Tasks

Manifest:

```json
{
  "background_tasks": [
    { "id": "refresh", "name": "Refresh status", "interval_ms": 60000 }
  ]
}
```

JS:

```javascript
globalThis.background = function(ctx) {
  if (ctx.taskId === "refresh") {
    const snapshot = { healthy: true, updatedAt: String(Date.now()) };
    if (ctx.cache) ctx.cache.set("snapshot", snapshot, { ttlMs: 60000 });
  }
  return {};
};
```

## Complete Minimal main.js

```javascript
function label(ctx) {
  return (ctx.config && ctx.config.name) || "Demo";
}

globalThis.dashboard = function(ctx) {
  return {
    title: label(ctx),
    components: [
      {
        id: "main",
        card: {
          onTap: { plugin: { actionId: "openDetail" } },
          children: [
            { id: "title", text: { text: label(ctx) + " Online", style: "PLUGIN_TEXT_STYLE_TITLE" } },
            { id: "state", badge: { text: "Running", value: { status: "PLUGIN_STATUS_RUNNING" }, appearance: { accent: "PLUGIN_ACCENT_GREEN" } } },
            { id: "usage", progress: { title: "Usage", progress: 0.64, value: { number: 0.64, format: "PLUGIN_VALUE_FORMAT_PERCENT" } } }
          ]
        }
      }
    ]
  };
};

globalThis.detail = function(ctx) {
  return {
    title: label(ctx) + " Detail",
    components: [
      { id: "info", descriptionList: { title: "Info", items: [{ title: "Source", value: { text: "Goja plugin" } }] } },
      { id: "refresh", button: { title: "Refresh", onTap: { plugin: { actionId: "refresh" } } } }
    ]
  };
};

globalThis.actions = {
  openDetail: function(ctx) {
    return { effects: [{ navigate: { surface: "detail", route: "overview" } }] };
  },
  refresh: function(ctx) {
    return { effects: [{ toast: { text: "Refreshed", level: "success" } }, { refresh: { surface: "current" } }] };
  }
};
```

## Validation Commands

Run from the plugin repository root:

```bash
node -e 'JSON.parse(require("fs").readFileSync("plugins/index.json", "utf8")); console.log("index ok")'
```

Validate all manifests, asset paths, and checksums:

```bash
node - <<'EOF'
const fs = require("fs");
const crypto = require("crypto");
const index = JSON.parse(fs.readFileSync("plugins/index.json", "utf8"));
for (const item of index) {
  if (!fs.existsSync(item.manifest_path)) throw new Error(`missing manifest: ${item.manifest_path}`);
  const manifest = JSON.parse(fs.readFileSync(item.manifest_path, "utf8"));
  const dir = item.manifest_path.replace(/\/manifest\.json$/, "");
  for (const asset of manifest.assets || []) {
    const path = `${dir}/${asset.path}`;
    if (!fs.existsSync(path)) throw new Error(`missing asset: ${path}`);
  }
  for (const [asset, expected] of Object.entries(manifest.checksums || {})) {
    const actual = "sha256:" + crypto.createHash("sha256").update(fs.readFileSync(`${dir}/${asset}`)).digest("hex");
    if (actual !== expected) throw new Error(`${manifest.id}@${manifest.version} ${asset} checksum mismatch\nexpected ${expected}\nactual   ${actual}`);
  }
}
console.log("plugin registry ok");
EOF
```

Compute one `main.js` checksum:

```bash
shasum -a 256 plugins/<plugin-id>/<version>/main.js
```

## Release Requirements

After plugin changes:

```bash
git status --short
git add plugins/<plugin-id>/<version> plugins/index.json
git commit -m "Publish <plugin-id> <version>"
git push
```

If only `skills/` changed:

```bash
git add skills
git commit -m "Update plugin development skills"
git push
```

