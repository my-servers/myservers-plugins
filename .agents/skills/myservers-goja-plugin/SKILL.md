---
name: myservers-goja-plugin
description: Use when creating, updating, debugging, reviewing, publishing, or documenting MyServers Goja plugins, including plugin manifests, dashboard/detail/widget rendering, actions, background tasks, runtime permissions, component DSL JSON, checksums, and the myservers-plugins repository release flow.
---

# MyServers Goja Plugin Development

Use this skill for MyServers plugin work in either repository:

- App/server contract: `/Users/codelover/agent/myservers`
- Published plugin registry: `/Users/codelover/agent/myservers-plugins`

The plugin system is a controlled Goja JavaScript runtime. Plugins return protobuf-shaped JSON for MyServers to render on dashboard, detail pages, and iOS widgets. They can request explicit permissions for HTTP, Unix-socket HTTP, shell command templates, and cache.

## First Steps

1. Identify whether the task changes the plugin platform or a published plugin.
   - Platform/protocol/runtime/renderer changes belong in `/Users/codelover/agent/myservers`.
   - Plugin JavaScript, manifests, versions, checksums, and marketplace index changes belong in `/Users/codelover/agent/myservers-plugins`.
2. Read only the references needed for the task:
   - Runtime entrypoints, context, permissions, and APIs: `references/goja-runtime.md`
   - Manifest, marketplace JSON, protobuf contract, and naming rules: `references/protocol.md`
   - Component DSL, layout, actions, and widget-safe rendering: `references/components.md`
   - Build, version, checksum, validation, commit, and push workflow: `references/plugin-lifecycle.md`
3. Before editing, inspect the current source of truth:
   - Runtime: `/Users/codelover/agent/myservers/server/backend_server/plugin/runtime.go`
   - Server plugin bridge: `/Users/codelover/agent/myservers/server/backend_server/plugin/common.go`
   - Protocol: `/Users/codelover/agent/myservers/server/entity/api.proto`
   - iOS protocol copy: `/Users/codelover/agent/myservers/IOS-client/myServer/api.proto`
   - Demo plugin: `/Users/codelover/agent/myservers-plugins/plugins/myservers-demo-nas`
4. Do not invent fields. If a JSON key is not backed by `api.proto` or marketplace decoding code, do not use it.
5. Keep platform and plugin release responsibilities separate. A plugin-only JS change should not require app/server code changes; a protocol change must update server and iOS copies together.

## Development Rules

- Use lowerCamelCase JSON keys in Goja component returns because they are decoded by `protojson.Unmarshal`.
- Use protobuf enum names for Goja component returns, such as `PLUGIN_ACCENT_TEAL`, `PLUGIN_VALUE_FORMAT_PERCENT`, and `PLUGIN_CHART_KIND_LINE`.
- Use marketplace short values in `manifest.json`, such as permission `type: "http"` and config input `input: "select"`.
- Return oneof-shaped objects. For example, a component must use `{ text: {...} }`, `{ card: {...} }`, `{ segmentedGauge: {...} }`, etc. Do not use legacy `{ type: "text" }`.
- Keep Goja code synchronous. The runtime does not provide Node APIs, browser APIs, `require`, `import`, or async awaiting.
- Treat action IDs as public API strings. Use only letters, digits, `_`, `-`, `.`, and `:`, and keep them under 128 characters.
- For widgets, branch on `ctx.widgetSize` (`small`, `medium`, `large`, `unspecified`) and return density-appropriate component trees.
- After plugin JavaScript changes, publish a new plugin version directory, update checksums and `plugins/index.json`, commit, and push the plugin repository so the app can download it.

## Output Shape

A complete plugin task should usually produce:

- A versioned plugin folder under `myservers-plugins/plugins/<plugin-id>/<version>/`
- `manifest.json` with assets, checksums, permissions, config schema, widgets, and background tasks as needed
- `main.js` with `dashboard`, optional `detail`, optional `widget`, optional `background`, and optional `globalThis.actions`
- Updated `plugins/index.json` when the published latest version changes
- Verification output for JSON validity, checksum alignment, and any runtime/protocol tests required by the change
- Commits and pushes in the repository that changed

