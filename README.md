# MyServers Plugins

Marketplace registry for MyServers plugins.

## Layout

- `plugins/index.json` lists marketplace entries.
- `plugins/<id>/<version>/manifest.json` declares permissions, config schema, entrypoints, assets, and checksums.
- Plugin JavaScript is executed server-side by MyServers through Goja. The iOS app renders high-level component data only.

