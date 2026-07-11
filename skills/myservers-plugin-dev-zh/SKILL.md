---
name: myservers-plugin-dev-zh
description: Use when a Chinese-speaking user asks an agent to create, update, install, or publish a MyServers Goja plugin, including local development plugins, stable marketplace plugins, manifest files, Dashboard, detail pages, widgets, actions, background tasks, permissions, component DSL, checksums, and validation.
---

# MyServers Goja 插件开发

这个 Skill 的目标是让用户可以直接对 agent 说“帮我做一个 XXX 插件”，agent 能创建可在 MyServers 服务器中安装和运行的 Goja 插件。

有两条插件通道：

- 本地开发插件：用于用户自己开发、快速验证、不经过 GitHub 的插件。默认写入服务器运行目录 `~/.myservers/data/dev-plugins/<plugin-id>/`。
- 稳定市场插件：用于已经验证、准备给其他用户下载的插件。写入插件仓库 `plugins/<plugin-id>/<version>/`，更新 `plugins/index.json`，并推送到 GitHub。

## 仓库结构

本地开发插件目录：

```text
~/.myservers/data/dev-plugins/<plugin-id>/manifest.json
~/.myservers/data/dev-plugins/<plugin-id>/main.js
```

也支持版本目录：

```text
~/.myservers/data/dev-plugins/<plugin-id>/<version>/manifest.json
~/.myservers/data/dev-plugins/<plugin-id>/<version>/main.js
```

稳定市场插件从插件仓库根目录工作：

```text
plugins/index.json
plugins/<plugin-id>/<version>/manifest.json
plugins/<plugin-id>/<version>/main.js
```

稳定发布的最小单位是一个版本目录。更新已发布插件时，创建新版本目录，不要直接改旧版本。

## 工作流程

1. 把用户需求拆成插件能力：
   - 需要展示什么：dashboard、详情页、iOS 小组件。
   - 需要操作什么：按钮、表单、菜单、确认框、action。
   - 需要数据来源什么：配置、HTTP、Unix Socket HTTP、Shell 命令、缓存、后台刷新。
2. 选择插件通道：
   - 用户自己开发、调试、未验证：走本地开发插件。
   - 要给其他用户稳定下载：走稳定市场插件。
3. 创建目录：
   - 本地开发：`~/.myservers/data/dev-plugins/<plugin-id>/`
   - 新插件：`plugins/<plugin-id>/1.0.0/`
   - 更新插件：从最新版本复制到下一个版本，例如 `1.0.1`。
4. 编写 `manifest.json`：
   - 本地开发：声明插件信息、入口文件、配置、权限、命令、小组件、后台任务；不需要 `assets` 和 `checksums`。
   - 稳定市场：额外声明资源 URL 和 checksum。
5. 编写 `main.js`：
   - 至少实现 `globalThis.dashboard(ctx)`。
   - 按需实现 `detail`、`widget`、`background`、`globalThis.actions`。
6. 本地开发验证：
   - 在 App 插件市场的“本地开发插件”区域刷新列表。
   - 选择插件，检查权限和配置，安装后验证 Dashboard、详情页、小组件和 action。
   - 修改 `main.js` 后重新触发渲染或重新安装；开发模式会从本地文件重新加载脚本。
7. 稳定发布验证：
   - 计算 `main.js` 的 SHA-256，更新 manifest 的 `checksums.main.js`。
   - 更新 `plugins/index.json` 的 `latest_version` 和 `manifest_path`。
   - 验证 JSON、资源路径和 checksum。
   - 提交并推送插件仓库。用户必须能从仓库下载插件后，才能在 App 里验证稳定市场版本。

## 如何安装到服务器

### 本地开发插件

本地开发插件不走 GitHub，不需要 checksum。流程是：

1. agent 在服务器运行目录创建 `~/.myservers/data/dev-plugins/<plugin-id>/manifest.json` 和 `main.js`。
2. App 插件市场打开“本地开发插件”，刷新列表。
3. 用户选择本地插件，确认权限、填写配置并安装。
4. App 把本地 manifest、配置和已授权权限发送给 MyServers 服务器。
5. 服务器直接从本地 `main.js` 加载 Goja runtime，并在开发模式下渲染前重新读取脚本。

如果用户是在另一台服务器上开发，必须把文件写入目标服务器自己的 `~/.myservers/data/dev-plugins/`，不要写到当前 agent 工作区或插件仓库里假装已安装。

### 稳定市场插件

稳定市场插件用于公开下载，必须走仓库和 checksum：

1. 插件仓库推送到 GitHub。
2. `plugins/index.json` 暴露插件市场条目。
3. App 插件市场读取插件详情和 `manifest.json`。
4. 用户在 App 里安装插件并授权权限、填写配置。
5. App 把 manifest、配置和已授权权限发送给 MyServers 服务器。
6. 服务器下载 `assets` 里的脚本，校验 `checksums`，加载 Goja runtime。
7. Dashboard、详情页和小组件通过服务器执行 `main.js` 返回组件数据。

稳定市场插件的 JS 或 manifest 改动后必须推送插件仓库。本地开发插件改动不需要推送，但文件必须写入目标服务器的 dev-plugins 目录。仅改插件通常不需要改服务器代码；只有新增协议、组件、权限能力时才需要改 MyServers 服务端和 App。

## manifest.json

本地开发最小示例：

```json
{
  "id": "demo-status",
  "version": "1.0.0",
  "name": "Demo Status",
  "description": "展示一个服务状态插件。",
  "icon": "server.rack",
  "min_server_version": "3.0.20",
  "min_app_version": "3.18",
  "permissions": [],
  "config_schema": [],
  "commands": [],
  "entrypoints": {
    "main": "main.js"
  },
  "widgets": [],
  "background_tasks": []
}
```

稳定市场示例：

```json
{
  "id": "demo-status",
  "version": "1.0.0",
  "name": "Demo Status",
  "description": "展示一个服务状态插件。",
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
    "main.js": "sha256:<64位sha256>"
  },
  "widgets": [],
  "background_tasks": []
}
```

`plugins/index.json` 示例：

```json
[
  {
    "id": "demo-status",
    "name": "Demo Status",
    "description": "展示一个服务状态插件。",
    "icon": "server.rack",
    "latest_version": "1.0.0",
    "manifest_path": "plugins/demo-status/1.0.0/manifest.json"
  }
]
```

## Goja 入口函数

插件脚本在服务端 Goja 中同步执行，不支持 Node.js、浏览器 DOM、`require`、`import` 或异步 `await`。

```javascript
globalThis.dashboard = function(ctx) {
  return { title: "控制台", components: [] };
};

globalThis.detail = function(ctx) {
  return { title: "详情", components: [] };
};

globalThis.widget = function(ctx) {
  return { title: "小组件", components: [] };
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

上下文 `ctx`：

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

## 配置能力

manifest 中使用短枚举值：

```json
{
  "config_schema": [
    {
      "key": "base_url",
      "label": "服务地址",
      "description": "例如 http://192.168.1.10:8080",
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
      "label": "强调色",
      "input": "select",
      "default_value": "blue",
      "options": [
        { "label": "蓝色", "value": "blue" },
        { "label": "绿色", "value": "green" }
      ]
    }
  ]
}
```

支持 `text`、`textarea`、`number`、`password`、`select`、`switch`。Goja 中通过 `ctx.config.base_url` 读取，值都是字符串。

## 权限与运行时 API

权限必须先在 manifest 声明，并由用户安装时授权。没有权限时，对应 API 不会出现在 `ctx` 上。

### HTTP

manifest：

```json
{
  "type": "http",
  "reason": "读取服务状态 API",
  "http": {
    "allowed_hosts": ["api.example.com"],
    "allowed_url_prefixes": ["https://api.example.com/v1/"],
    "timeout_ms": 10000,
    "response_limit_bytes": 1048576
  }
}
```

JS：

```javascript
const res = ctx.http.request({
  url: ctx.config.base_url + "/api/status",
  method: "GET",
  headers: { "authorization": "Bearer " + ctx.config.token }
});
const data = res.json || {};
```

### Unix Socket HTTP

适合 Docker socket 这类本机 Unix socket API。

manifest：

```json
{
  "type": "http_unix",
  "reason": "通过 Docker Socket 读取容器状态",
  "http_unix": {
    "socket_paths": ["/var/run/docker.sock"],
    "allowed_url_prefixes": ["http://docker/containers/"],
    "timeout_ms": 10000,
    "response_limit_bytes": 1048576
  }
}
```

JS：

```javascript
const res = ctx.httpUnix.request({
  socketPath: "/var/run/docker.sock",
  url: "http://docker/containers/json",
  method: "GET"
});
const containers = res.json || [];
```

### Shell

Shell 只能执行 manifest 声明的命令模板，不能拼接任意命令。

manifest：

```json
{
  "permissions": [
    {
      "type": "shell",
      "reason": "读取 Docker 运行状态",
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
        { "key": "filter", "label": "过滤条件", "input": "text", "default_value": "status=running" }
      ]
    }
  ]
}
```

JS：

```javascript
const result = ctx.shell.run("docker-ps", { filter: "status=running" });
const rows = result.json || [];
```

### Cache

适合后台任务缓存状态，避免每次渲染都访问外部服务。

manifest：

```json
{
  "type": "cache",
  "reason": "缓存最近一次服务状态",
  "cache": { "max_bytes": 1048576 }
}
```

JS：

```javascript
ctx.cache.set("snapshot", { healthy: true }, { ttlMs: 60000 });
const snapshot = ctx.cache.get("snapshot");
const keys = ctx.cache.list("");
ctx.cache.delete("snapshot");
```

## 页面与组件 DSL

Goja 返回的是 protobuf JSON，组件必须使用 oneof 形态和 lowerCamelCase 字段：

```javascript
{
  id: "title",
  text: { text: "NAS 在线", style: "PLUGIN_TEXT_STYLE_TITLE" }
}
```

不要使用旧写法：

```javascript
{ type: "text", text: "NAS 在线" }
```

常用枚举：

- 颜色：`PLUGIN_ACCENT_BLUE`、`PLUGIN_ACCENT_GREEN`、`PLUGIN_ACCENT_ORANGE`、`PLUGIN_ACCENT_RED`、`PLUGIN_ACCENT_PURPLE`、`PLUGIN_ACCENT_INDIGO`、`PLUGIN_ACCENT_TEAL`、`PLUGIN_ACCENT_GRAY`
- 状态：`PLUGIN_STATUS_HEALTHY`、`PLUGIN_STATUS_WARNING`、`PLUGIN_STATUS_ERROR`、`PLUGIN_STATUS_RUNNING`、`PLUGIN_STATUS_STOPPED`
- 文本：`PLUGIN_TEXT_STYLE_TITLE`、`PLUGIN_TEXT_STYLE_SUBTITLE`、`PLUGIN_TEXT_STYLE_BODY`、`PLUGIN_TEXT_STYLE_CAPTION`、`PLUGIN_TEXT_STYLE_VALUE`
- 数值格式：`PLUGIN_VALUE_FORMAT_TEXT`、`PLUGIN_VALUE_FORMAT_NUMBER`、`PLUGIN_VALUE_FORMAT_PERCENT`、`PLUGIN_VALUE_FORMAT_BYTES`、`PLUGIN_VALUE_FORMAT_DURATION`

支持组件和示例：

```javascript
// Stack
{ id: "header", stack: { axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL", spacing: 8, children: [] } }

// Grid
{ id: "metrics", grid: { columns: 2, spacing: 8, children: [] } }

// Card
{ id: "card", card: { children: [], onTap: { plugin: { actionId: "openDetail" } } } }

// Text
{ id: "text", text: { text: "说明文字", style: "PLUGIN_TEXT_STYLE_BODY" } }

// Value
{ id: "cpu", value: { title: "CPU", value: { number: 0.32, format: "PLUGIN_VALUE_FORMAT_PERCENT" } } }

// Badge
{ id: "badge", badge: { text: "在线", value: { status: "PLUGIN_STATUS_RUNNING" } } }

// Button
{ id: "button", button: { title: "刷新", onTap: { plugin: { actionId: "refresh" } } } }

// List
{ id: "list", list: { title: "容器", items: [{ title: "nginx", value: { text: "运行中" } }] } }

// Progress
{ id: "storage", progress: { title: "存储", progress: 0.64, value: { number: 0.64, format: "PLUGIN_VALUE_FORMAT_PERCENT" } } }

// Chart
{ id: "chart", chart: { title: "负载", kind: "PLUGIN_CHART_KIND_LINE", points: [{ label: "now", value: 32 }] } }

// Segmented Gauge
{ id: "memory", segmentedGauge: { title: "内存", centerValue: { number: 0.68, format: "PLUGIN_VALUE_FORMAT_PERCENT" }, showLegend: true, segments: [{ label: "已用", value: 68 }] } }

// Table
{ id: "table", table: { title: "进程", columns: [{ key: "name", title: "名称" }], rows: [{ id: "1", values: { name: { text: "dockerd" } } }] } }

// Description List
{ id: "desc", descriptionList: { title: "信息", columns: 2, items: [{ title: "版本", value: { text: "1.0.0" } }] } }

// Form
{ id: "form", form: { title: "过滤", submitTitle: "应用", fields: [{ key: "q", label: "关键词", input: "PLUGIN_CONFIG_INPUT_TEXT" }], onSubmit: { plugin: { actionId: "applyFilter" } } } }

// Action Menu
{ id: "menu", actionMenu: { title: "操作", items: [{ title: "刷新", onTap: { plugin: { actionId: "refresh" } } }] } }

// Confirm
{ id: "confirm", confirm: { title: "重启", message: "确认重启？", confirmTitle: "重启", destructive: true, onConfirm: { plugin: { actionId: "restart" } } } }

// Tabs
{ id: "tabs", tabs: { selectedId: "overview", tabs: [{ id: "overview", title: "概览", children: [] }] } }

// Disclosure
{ id: "more", disclosure: { title: "高级", expanded: false, children: [] } }

// State Block
{ id: "empty", stateBlock: { kind: "PLUGIN_STATE_KIND_EMPTY", title: "暂无数据" } }

// Code Block
{ id: "raw", codeBlock: { title: "JSON", code: "{}", language: "json", wrap: true } }

// Icon / Image / Divider / Spacer
{ id: "icon", icon: { name: "shippingbox.fill" } }
{ id: "image", image: { url: "https://example.com/a.png", mode: "fit" } }
{ id: "line", divider: {} }
{ id: "gap", spacer: { length: 12 } }
```

## Action 能力

可点击组件使用：

```javascript
onTap: { plugin: { actionId: "refresh", params: { scope: "all" } } }
onTap: { navigate: { surface: "detail", route: "overview" } }
```

Action 返回 effects：

```javascript
globalThis.actions = {
  refresh: function(ctx) {
    return {
      effects: [
        { toast: { text: "已刷新", level: "success" } },
        { refresh: { surface: "current" } },
        { navigate: { surface: "detail", route: "overview" } },
        { replaceComponents: { targetId: "metrics", components: [] } }
      ]
    };
  }
};
```

支持：

- `toast`: 提示
- `refresh`: 刷新 `current`、`dashboard`、`detail`、`widget`
- `navigate`: 跳转详情页
- `replaceComponents`: 替换指定组件

## 小组件

小组件使用同一套组件 DSL，但必须根据尺寸返回不同密度：

```javascript
globalThis.widget = function(ctx) {
  const size = ctx.widgetSize || "unspecified";
  const children = [
    { id: "title", text: { text: "NAS 在线", style: "PLUGIN_TEXT_STYLE_TITLE" } },
    { id: "summary", text: { text: "存储 64% · 12 个容器", style: "PLUGIN_TEXT_STYLE_CAPTION" } }
  ];

  if (size === "medium" || size === "large" || size === "unspecified") {
    children.push({
      id: "storage",
      progress: {
        title: "主存储池",
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
        title: "资源",
        items: [
          { title: "CPU", value: { text: "32%" } },
          { title: "内存", value: { text: "56%" } }
        ],
        appearance: { hideBackground: true }
      }
    });
  }

  return { title: "NAS 小组件", components: [{ id: "widget-card", card: { children } }] };
};
```

设计规则：

- `small`: 一张卡片，标题 + 1 行摘要。
- `medium`: 增加一个进度或关键指标。
- `large`: 可增加列表或更多指标。
- 避免表格、大段代码、长文本和过深嵌套。

## 后台任务

manifest：

```json
{
  "background_tasks": [
    { "id": "refresh", "name": "刷新状态", "interval_ms": 60000 }
  ]
}
```

JS：

```javascript
globalThis.background = function(ctx) {
  if (ctx.taskId === "refresh") {
    const snapshot = { healthy: true, updatedAt: String(Date.now()) };
    if (ctx.cache) ctx.cache.set("snapshot", snapshot, { ttlMs: 60000 });
  }
  return {};
};
```

## 完整最小插件 main.js

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
            { id: "title", text: { text: label(ctx) + " 在线", style: "PLUGIN_TEXT_STYLE_TITLE" } },
            { id: "state", badge: { text: "运行中", value: { status: "PLUGIN_STATUS_RUNNING" }, appearance: { accent: "PLUGIN_ACCENT_GREEN" } } },
            { id: "usage", progress: { title: "使用率", progress: 0.64, value: { number: 0.64, format: "PLUGIN_VALUE_FORMAT_PERCENT" } } }
          ]
        }
      }
    ]
  };
};

globalThis.detail = function(ctx) {
  return {
    title: label(ctx) + " 详情",
    components: [
      { id: "info", descriptionList: { title: "信息", items: [{ title: "来源", value: { text: "Goja 插件" } }] } },
      { id: "refresh", button: { title: "刷新", onTap: { plugin: { actionId: "refresh" } } } }
    ]
  };
};

globalThis.actions = {
  openDetail: function(ctx) {
    return { effects: [{ navigate: { surface: "detail", route: "overview" } }] };
  },
  refresh: function(ctx) {
    return { effects: [{ toast: { text: "已刷新", level: "success" } }, { refresh: { surface: "current" } }] };
  }
};
```

## 验证命令

本地开发插件先验证 JSON：

```bash
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); console.log("manifest ok")' ~/.myservers/data/dev-plugins/<plugin-id>/manifest.json
```

稳定市场插件从插件仓库根目录执行：

```bash
node -e 'JSON.parse(require("fs").readFileSync("plugins/index.json", "utf8")); console.log("index ok")'
```

校验所有 manifest、资源路径和 checksum：

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

计算单个 `main.js` checksum：

```bash
shasum -a 256 plugins/<plugin-id>/<version>/main.js
```

## 发布要求

本地开发插件不需要提交插件仓库；确认文件已经写入目标服务器的 `~/.myservers/data/dev-plugins/<plugin-id>/`，然后在 App 本地开发插件列表刷新并安装。

稳定市场插件改动完成后：

```bash
git status --short
git add plugins/<plugin-id>/<version> plugins/index.json
git commit -m "Publish <plugin-id> <version>"
git push
```

如果只更新了 `skills/`：

```bash
git add skills
git commit -m "Update plugin development skills"
git push
```
