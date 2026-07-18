# Manifest、运行时与市场参考

## 目录

- Manifest
- 配置
- 权限与 API
- 入口上下文
- Widget 和后台任务
- 市场 Demo 卡片
- 版本与兼容性

## Manifest

最小结构：

```json
{
  "id": "example-service-status",
  "version": "1.0.0",
  "name": "服务状态",
  "description": "展示服务状态。",
  "icon": "server.rack",
  "min_server_version": "3.0.23",
  "min_app_version": "3.20",
  "permissions": [],
  "config_schema": [],
  "commands": [],
  "entrypoints": { "main": "main.js" },
  "assets": [{ "path": "main.js", "kind": "script" }],
  "checksums": { "main.js": "sha256:<64位十六进制>" },
  "widgets": [],
  "background_tasks": []
}
```

本地开发扫描器还读取 manifest 中的 `demo_cards`，用于安装前的静态预览。

## 配置

```json
{
  "config_schema": [
    {
      "key": "base_url",
      "label": "服务地址",
      "description": "服务 API 根地址",
      "placeholder": "http://192.168.1.10:8080",
      "input": "text",
      "required": true,
      "default_value": ""
    },
    {
      "key": "token",
      "label": "Token",
      "input": "password",
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

input：`text`、`textarea`、`number`、`password`、`select`、`switch`。运行时从 `ctx.config` 读取字符串值。

## 权限与 API

权限只有在 manifest 声明且用户批准后，对应对象才出现在 `ctx`。

### HTTP

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

```javascript
const rsp = ctx.http.request({
  url: ctx.config.base_url + "/status",
  method: "GET",
  headers: { authorization: "Bearer " + ctx.config.token },
  body: ""
});
const data = rsp.json || {};
// GET 快捷方式：ctx.http.fetch(url)
```

URL 必须同时满足授权的 host/prefix。响应包含状态、header、body，并在 JSON 响应可解析时提供 `json`。

### Unix Socket HTTP

```json
{
  "type": "http_unix",
  "reason": "读取 Docker Socket",
  "http_unix": {
    "socket_paths": ["/var/run/docker.sock"],
    "allowed_url_prefixes": ["http://docker/containers/"],
    "timeout_ms": 10000,
    "response_limit_bytes": 1048576
  }
}
```

```javascript
const rsp = ctx.httpUnix.request({
  socketPath: "/var/run/docker.sock",
  url: "http://docker/containers/json",
  method: "GET"
});
```

### Shell

```json
{
  "permissions": [{
    "type": "shell",
    "reason": "读取服务状态",
    "shell": { "command_ids": ["service-status"] }
  }],
  "commands": [{
    "id": "service-status",
    "executable": "systemctl",
    "args": ["is-active", "{{service}}"],
    "timeout_ms": 5000,
    "output_limit_bytes": 65536,
    "output_format": "text",
    "args_schema": [{
      "key": "service",
      "label": "服务名",
      "input": "select",
      "options": [{ "label": "Docker", "value": "docker" }]
    }]
  }]
}
```

```javascript
const result = ctx.shell.run("service-status", { service: "docker" });
// result: stdout, stderr, exitCode；output_format=json 时还有 json
```

参数必须来自 `args_schema`，运行时按模板替换参数，不要把用户输入拼进可执行文件或任意 Shell 字符串。

### Cache

```json
{
  "type": "cache",
  "reason": "缓存最近状态",
  "cache": { "max_bytes": 1048576 }
}
```

```javascript
ctx.cache.set("snapshot", { healthy: true }, { ttlMs: 60000 });
const snapshot = ctx.cache.get("snapshot");
const keys = ctx.cache.list("snap");
ctx.cache.delete("snapshot");
```

Cache 属于插件实例，不用于共享敏感信息。

## 入口上下文

基础字段：

```javascript
{
  config: { key: "value" },
  log: { info: Function, error: Function },
  surface: "dashboard" | "detail" | "sheet",
  route: "",
  actionId: "refresh",
  params: { key: "value" },
  taskId: "refresh",
  widgetId: "summary",
  widgetSize: "small" | "medium" | "large" | "unspecified",
  widgetSizeValue: 0 | 1 | 2 | 3
}
```

权限对象按需增加：`http`、`httpUnix`、`shell`、`cache`。

## Widget 和后台任务

manifest：

```json
{
  "widgets": [{
    "id": "summary",
    "name": "服务摘要",
    "description": "展示健康度和负载。"
  }],
  "background_tasks": [{
    "id": "refresh",
    "name": "刷新状态",
    "interval_ms": 60000
  }]
}
```

```javascript
globalThis.background = function (ctx) {
  if (ctx.taskId === "refresh" && ctx.cache) {
    ctx.cache.set("snapshot", loadStatus(ctx), { ttlMs: 120000 });
  }
  return {};
};

globalThis.widget = function (ctx) {
  const size = ctx.widgetSize || "unspecified";
  const components = [/* 标题与一个核心值 */];
  if (size === "medium" || size === "large") components.push(/* 进度/图表 */);
  if (size === "large") components.push(/* 列表/更多指标 */);
  return { title: "服务摘要", components };
};
```

- small：标题 + 一项核心状态。
- medium：增加一个进度或趋势。
- large：可增加列表和更多指标。
- 不要在 Widget 放表单、大表格、代码块或长文本。
- `interval_ms: 0` 表示跟随服务端全局刷新周期。

## 市场 Demo 卡片

插件市场在安装前只展示静态元数据，不执行 `main.js`。一个插件可有多个卡片，App 左右滑动并显示页码圆点。

```json
{
  "demo_cards": [{
    "style": "components",
    "description": "折线图 · 圆形进度 · 徽标",
    "dashboard_title": "服务概览",
    "badge_text": "实时",
    "action_title": "查看示例",
    "background_colors": ["#2563EB", "#4F46E5", "#111827"],
    "background_image_url": "https://example.com/background.jpg",
    "overlay_opacity": 0.42,
    "hero": {
      "icon": "server.rack",
      "title": "服务状态",
      "subtitle": "快速了解安装后的 Dashboard"
    },
    "highlights": [
      { "icon": "chart.xyaxis.line", "label": "趋势", "value": "实时" }
    ],
    "components": [
      { "kind": "badge", "text": "在线", "accent": "green" },
      {
        "kind": "line",
        "title": "CPU",
        "icon": "cpu",
        "accent": "blue",
        "unit": "%",
        "min": 0,
        "max": 100,
        "points": [{ "label": "10:00", "value": 28 }]
      },
      {
        "kind": "circular_progress",
        "title": "内存",
        "accent": "purple",
        "value": 0.56,
        "progress": 0.56,
        "unit": "%"
      }
    ]
  }]
}
```

Demo component 的 kind：

- `badge`、`progress`、`circular_progress`、`value`；
- `line`、`bar`、`area`、`donut`、`gauge`。

accent：`blue`、`green`、`orange`、`red`、`purple`、`indigo`、`teal`、`gray`。`background_image_url`、插件列表的 `icon_url` 都仅使用 HTTP/HTTPS。

本地开发把 `demo_cards` 放进 manifest。市场版本把它放进 `plugins/index.json`；manifest 可额外保留 `demo_card`/`demo_cards`，但市场详情页的预览来源以索引为准。

## 版本与兼容性

- 使用语义化插件版本，例如 `1.2.0`。
- 使用当前组件 DSL、统一 URL 图标和原生 Sheet 时，最低版本不要低于 Demo 插件验证基线：Server `3.0.26`、App `3.20`。
- 如果只使用更早就存在的能力，仍应通过真实旧版本验证后再降低最低版本，不能凭猜测。
- 新增权限属于安装/升级时需要用户重新确认的能力变化。
