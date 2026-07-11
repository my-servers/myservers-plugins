# Plugin Lifecycle And Validation

## Repository Layout

Published plugins live in:

```text
/Users/codelover/agent/myservers-plugins/plugins/<plugin-id>/<version>/
```

Typical files:

```text
plugins/<plugin-id>/<version>/manifest.json
plugins/<plugin-id>/<version>/main.js
plugins/index.json
```

For a published update, create a new version directory instead of editing an old version in place.

## Version Update Flow

1. Copy the latest version directory to a new semver version.
2. Edit `main.js`.
3. Edit `manifest.json`:
   - Update `version`.
   - Update asset URLs to the new version path.
   - Update `checksums`.
   - Add or adjust permissions, widgets, background tasks, commands, and config schema.
4. Update `plugins/index.json`:
   - Set `latest_version`.
   - Set `manifest_path`.
5. Validate JSON and checksums.
6. Commit and push `/Users/codelover/agent/myservers-plugins`.
7. If server runtime behavior changed, rebuild/restart the server and commit/push `/Users/codelover/agent/myservers` too.

## Checksum Commands

Use SHA-256 and keep the manifest value as `sha256:<hex>`.

```bash
cd /Users/codelover/agent/myservers-plugins
VERSION=1.0.0
PLUGIN=my-plugin
SUM=$(shasum -a 256 "plugins/$PLUGIN/$VERSION/main.js" | awk '{print $1}')
echo "sha256:$SUM"
```

Update `manifest.json`:

```json
"checksums": {
  "main.js": "sha256:<hex>"
}
```

## Local Validation

Validate plugin registry JSON:

```bash
cd /Users/codelover/agent/myservers-plugins
node -e '
const fs = require("fs");
JSON.parse(fs.readFileSync("plugins/index.json", "utf8"));
for (const item of JSON.parse(fs.readFileSync("plugins/index.json", "utf8"))) {
  if (!fs.existsSync(item.manifest_path)) throw new Error(`missing manifest ${item.manifest_path}`);
  const manifest = JSON.parse(fs.readFileSync(item.manifest_path, "utf8"));
  for (const asset of manifest.assets || []) {
    const p = `plugins/${manifest.id}/${manifest.version}/${asset.path}`;
    if (!fs.existsSync(p)) throw new Error(`missing asset ${p}`);
  }
}
console.log("plugin registry json ok");
'
```

Validate manifest checksum:

```bash
cd /Users/codelover/agent/myservers-plugins
node -e '
const fs = require("fs");
const crypto = require("crypto");
for (const item of JSON.parse(fs.readFileSync("plugins/index.json", "utf8"))) {
  const manifest = JSON.parse(fs.readFileSync(item.manifest_path, "utf8"));
  const dir = item.manifest_path.replace(/\/manifest\.json$/, "");
  for (const [asset, expected] of Object.entries(manifest.checksums || {})) {
    const actual = "sha256:" + crypto.createHash("sha256").update(fs.readFileSync(`${dir}/${asset}`)).digest("hex");
    if (actual !== expected) throw new Error(`${manifest.id}@${manifest.version} ${asset} checksum mismatch\nexpected ${expected}\nactual   ${actual}`);
  }
}
console.log("plugin checksums ok");
'
```

## Runtime Validation

For platform/runtime changes in `/Users/codelover/agent/myservers/server`, run focused tests first:

```bash
cd /Users/codelover/agent/myservers/server
go test ./backend_server/plugin
```

If changing protobuf:

- Update both proto copies:
  - `/Users/codelover/agent/myservers/server/entity/api.proto`
  - `/Users/codelover/agent/myservers/IOS-client/myServer/api.proto`
- Regenerate generated server/iOS code using the repository's existing generation workflow.
- Run focused Go and iOS tests that cover the changed fields.

If changing iOS rendering:

```bash
cd /Users/codelover/agent/myservers/IOS-client
xcodebuild test -workspace myServer.xcworkspace -scheme myServer -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:myServerTests/TerminalKitSourceTests
```

Adjust the destination to an available simulator or use the real-device build flow when the user needs device validation.

## Common Failure Modes

Checksum mismatch:

- Recompute `main.js` checksum after every JS edit.
- Make sure `manifest.json` points to the same version directory that contains the edited file.
- Make sure `plugins/index.json` points to the new manifest path.
- Push the plugin repository before asking the app to download again.

Plugin renders nothing or errors with `unknown field`:

- Check for legacy component `type` fields.
- Check oneof component shape.
- Check lowerCamelCase names such as `descriptionList`, `codeBlock`, `onTap`, and `replaceComponents`.
- Check enum names; rendered components need full `PLUGIN_*` enum names.

Widget content clips or overflows:

- Branch on `ctx.widgetSize`.
- Keep the small widget to one card and two or three short lines.
- Avoid fixed long text in horizontal stacks.
- Prefer `hideBackground: true` inside widget card children to reduce nested padding.

HTTP/shell/cache API missing in `ctx`:

- Confirm the manifest declares the matching permission.
- Confirm the app user approved the permission.
- Confirm the server persisted updated plugin config after install.

## Commit And Push

Plugin JS changes must be pushed so the app can download the new asset:

```bash
cd /Users/codelover/agent/myservers-plugins
git status --short
git add plugins/<plugin-id>/<version> plugins/index.json
git commit -m "Publish <plugin-id> <version>"
git push
```

Platform changes must be committed and pushed in the main repo:

```bash
cd /Users/codelover/agent/myservers
git status --short
git add <changed-files>
git commit -m "<message>"
git push
```

If the main repo push fails because SSH config contains unsupported options, use:

```bash
GIT_SSH_COMMAND='ssh -F /dev/null' git push
```

