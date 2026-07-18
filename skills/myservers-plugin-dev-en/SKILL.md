---
name: myservers-plugin-dev-en
description: Create, debug, install, upgrade, or submit MyServers Goja plugins. Use for local development plugins, manifests, Dashboard/detail/native sheet/widget surfaces, the component DSL, actions, HTTP/Unix Socket/Shell/Cache permissions, marketplace demo cards, SHA-256 validation, and pull requests to my-servers/myservers-plugins.
---

# MyServers Plugin Development

Treat the current protocol and renderer as the source of truth. Plugin JavaScript runs synchronously inside Goja on the MyServers server. The app renders controlled components and executes controlled effects; it does not run plugin JavaScript.

## Canonical references and demo

Before writing a plugin, read both canonical references maintained with the Chinese skill:

- [Component DSL reference](../myservers-plugin-dev-zh/references/components.md): every component, field, enum, icon source, action, effect, and native sheet capability.
- [Runtime and manifest reference](../myservers-plugin-dev-zh/references/runtime-and-manifest.md): manifest, permissions, runtime APIs, widgets, background tasks, demo cards, and compatibility.
- Copy the runnable [demo plugin](../myservers-plugin-dev-zh/assets/demo-plugin) as a starting point.

The schema examples are JSON/JavaScript and can be used unchanged regardless of the user's language.

## Hard boundaries

- Use synchronous Goja-compatible JavaScript. Do not use Node.js, DOM APIs, `require`, `import`, promises, or `await`.
- Return protobuf JSON using oneof fields and lowerCamelCase: `{ id: "cpu", value: {...} }`, never `{ type: "value" }`.
- Access HTTP, Unix sockets, shell commands, and cache only through permissions declared in the manifest and approved by the user.
- Execute only fixed shell command templates declared by the manifest. Never construct arbitrary shell commands.
- Use `appearance.iconSource` for new icons. HTTP/HTTPS `url` takes precedence and falls back to the SF Symbol `systemName`.
- Never edit a published marketplace version directory. Add `plugins/<id>/<new-version>/`.
- Compute the checksum only after the final `main.js` edit.

## Supported presentation model

There are 26 component content types:

`stack`, `grid`, `card`, `text`, `value`, `badge`, `button`, `toggle`, `list`, `progress`, `circularProgress`, `chart`, `segmentedGauge`, `table`, `descriptionList`, `form`, `actionMenu`, `confirm`, `tabs`, `disclosure`, `stateBlock`, `codeBlock`, `icon`, `image`, `divider`, and `spacer`.

A `toggle` renders a native switch with `title`, `subtitle`, `isOn`, `appearance`, `onChange`, and `disabled`. On change, the app preserves declared action params and adds the target state as `ctx.params.value`, using the string `"true"` or `"false"`.

A `circularProgress` renders a 0...1 ring with a centered formatted `value`, `title`, `subtitle`, `appearance`, and optional `onTap`. When `value` is omitted, the center automatically shows the progress percentage. It requires server 3.0.26 or later.

Charts have line, bar, area, donut, and gauge variants. State blocks have empty, loading, error, permission, and unsupported variants. A bottom sheet is not a component: navigate to the native `sheet` surface with compact, medium, and/or large detents and return its content from `globalThis.sheet(ctx)`.

Read the component reference before implementing any surface; it contains the exact fields and enum names.

## Workflow 1: create and test locally

### 1. Create the directory

Use a lowercase kebab-case ID such as `docker-status`.

```text
~/.myservers/data/dev-plugins/<plugin-id>/manifest.json
~/.myservers/data/dev-plugins/<plugin-id>/main.js
```

Versioned local directories are also supported:

```text
~/.myservers/data/dev-plugins/<plugin-id>/<version>/manifest.json
~/.myservers/data/dev-plugins/<plugin-id>/<version>/main.js
```

For a remote target server, write these files on that server, not in the current agent workspace.

### 2. Adapt the demo

Copy the demo and update the ID, name, description, version, minimum versions, configuration, permissions, demo cards, and surfaces. The same source can later be published to the marketplace.

At minimum implement:

```javascript
globalThis.dashboard = function (ctx) {
  return { title: "Dashboard", components: [] };
};
```

Add `detail`, `sheet`, `widget`, `background`, and `globalThis.actions` only when needed. If `sheet` is absent, the runtime falls back to `detail`.

### 3. Validate and install

```bash
node --check main.js
node -e 'JSON.parse(require("fs").readFileSync("manifest.json", "utf8")); console.log("manifest ok")'
```

If the MyServers server source is available:

```bash
cd /path/to/myservers/server
go test ./backend_server/plugin ./backend_server/admin
```

Then:

1. Enable Local Plugin Development in app settings.
2. Refresh the local plugin section in the marketplace.
3. Install the plugin, approve permissions, and enter configuration.
4. Test Dashboard, detail, native sheet, actions, failure states, and widgets.
5. Re-render after editing `main.js`; reinstall after changing the manifest, permissions, or configuration schema.

Writing files to the development directory does not install the plugin. Installation is still initiated by the app.

## Workflow 2: submit to the marketplace

GitHub calls this a Pull Request; it is equivalent to a GitLab Merge Request.

### 1. Fork and branch

```bash
git clone https://github.com/<your-account>/myservers-plugins.git
cd myservers-plugins
git remote add upstream https://github.com/my-servers/myservers-plugins.git
git switch -c plugin/<plugin-id>-<version>
```

### 2. Add an immutable release

```text
plugins/<plugin-id>/<version>/manifest.json
plugins/<plugin-id>/<version>/main.js
```

The marketplace manifest must:

- match the directory ID and semantic version;
- set `entrypoints.main` to `main.js`;
- list `main.js` in `assets`;
- preferably omit the asset URL so the marketplace API resolves the versioned path;
- set `checksums.main.js` to `sha256:<64 lowercase hex>`;
- request only the permissions actually used.

Compute the checksum after all JavaScript edits:

```bash
sha256=$(shasum -a 256 "plugins/<plugin-id>/<version>/main.js" | awk '{print $1}')
echo "sha256:$sha256"
```

### 3. Update `plugins/index.json`

Add or update the one entry for the plugin:

```json
{
  "id": "example-service-status",
  "name": "Service Status",
  "description": "Shows health and resource trends.",
  "icon": "server.rack",
  "icon_url": "https://example.com/icon.png",
  "latest_version": "1.0.0",
  "manifest_path": "plugins/example-service-status/1.0.0/manifest.json",
  "demo_cards": []
}
```

`icon_url` is optional and supports HTTP/HTTPS. `demo_cards` is static pre-install metadata; it never executes the plugin. A plugin can provide several cards, which the app displays as a swipeable carousel.

### 4. Validate

Use the canonical validator:

```bash
python3 skills/myservers-plugin-dev-zh/scripts/validate_marketplace.py \
  --repo . --plugin <plugin-id> --version <version>
```

It verifies the index, release directory, manifest, entrypoint, assets, JavaScript syntax, and SHA-256 checksum.

Also confirm that the plugin was tested with its real data source; empty/loading/error/permission states exist; widgets adapt to small/medium/large; no secrets or real private-network data are committed; minimum versions and new permissions are accurate; and old release directories are untouched.

### 5. Open the PR/MR

```bash
git add "plugins/<plugin-id>/<version>" plugins/index.json
git commit -m "feat(plugin): add <plugin-id> <version>"
git push -u origin "plugin/<plugin-id>-<version>"
gh pr create \
  --repo my-servers/myservers-plugins \
  --base main \
  --head <your-account>:plugin/<plugin-id>-<version> \
  --title "Add <plugin-id> <version>" \
  --body "Adds a tested MyServers plugin release with marketplace preview metadata."
```

The PR must describe the use case, data source, permission reasons, test environment, supported surfaces/widgets, minimum versions, and validation result. After merge, the marketplace API reads the index and version directory from `main`.

## Definition of done

- The app scans, installs, and renders the local plugin.
- Actions and permission paths work against the real target.
- Marketplace directory, index, demo cards, and checksum agree.
- The validator passes.
- A PR/MR link is provided, or the branch is ready when the user requested preparation only.
