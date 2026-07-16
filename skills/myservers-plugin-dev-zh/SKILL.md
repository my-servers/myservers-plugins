---
name: myservers-plugin-dev-zh
description: 为 MyServers 创建、调试、安装、升级或向插件市场提交 Goja 插件。用于中文需求，包括本地开发插件、manifest、Dashboard/详情页/原生半弹层/iOS 小组件、组件 DSL、Action、HTTP/Unix Socket/Shell/Cache 权限、市场 Demo 卡片、SHA-256 校验以及向 my-servers/myservers-plugins 提交 PR/MR。
---

# MyServers 插件开发

以当前仓库和协议为准，不凭旧示例猜字段。插件 JavaScript 在 MyServers 服务端的 Goja 中同步执行；App 只渲染受控组件和执行受控交互。

## 先读哪些资源

- 创建或修改页面时，完整阅读 [references/components.md](references/components.md)。它列出所有组件、字段、枚举、图标和半弹层能力。
- 涉及 manifest、权限、运行时 API、小组件或市场元数据时，阅读 [references/runtime-and-manifest.md](references/runtime-and-manifest.md)。
- 需要从可运行模板开始时，复制 [assets/demo-plugin](assets/demo-plugin)。这是同一份代码可用于本地开发和市场提交的完整 Demo。

## 不可违反的边界

- 使用 Goja 支持的同步 JavaScript。不要使用 Node.js、DOM、`require`、`import`、Promise 或 `await`。
- 返回 protobuf JSON：组件用 oneof 字段和 lowerCamelCase，例如 `{ id: "cpu", value: {...} }`，不要写 `{ type: "value" }`。
- 只通过 manifest 已声明且用户已授权的能力访问 HTTP、Unix Socket、Shell 和 Cache。
- Shell 只能调用 manifest 中固定的命令模板；不要拼接任意命令。
- 市场版本目录不可变。发布新版本时新增 `plugins/<id>/<version>/`，不要覆盖旧版本。
- 修改完 `main.js` 后最后计算 checksum；checksum 之后不要再改脚本。
- 图标统一使用 `appearance.iconSource`。远程 URL 仅支持 HTTP/HTTPS，加载失败回退 `systemName`。

## 工作流一：在本地创建并验证插件

### 1. 选择插件 ID 和目录

使用小写字母、数字和连字符，例如 `docker-status`。

默认本地开发目录：

```text
~/.myservers/data/dev-plugins/<plugin-id>/manifest.json
~/.myservers/data/dev-plugins/<plugin-id>/main.js
```

也支持版本目录：

```text
~/.myservers/data/dev-plugins/<plugin-id>/<version>/manifest.json
~/.myservers/data/dev-plugins/<plugin-id>/<version>/main.js
```

如果目标服务器不在当前机器，必须把文件写到目标服务器自己的 `~/.myservers/data/dev-plugins/`。

### 2. 从 Demo 开始

复制 `assets/demo-plugin/` 到本地开发目录，然后同时修改：

- `id`、`name`、`description`、版本和最低版本；
- `config_schema`；
- 权限与命令模板；
- `demo_cards`；
- `main.js` 的 Dashboard、详情、Sheet、Widget 和 Actions。

本地开发 manifest 可以保留 `assets` 和 `checksums`，但本地安装不会下载资源，也不依赖 checksum。入口文件仍必须位于插件目录内。

### 3. 实现入口

至少实现：

```javascript
globalThis.dashboard = function (ctx) {
  return { title: "控制台", components: [] };
};
```

按需实现：

```javascript
globalThis.detail = function (ctx) { return { title: "详情", components: [] }; };
globalThis.sheet = function (ctx) { return { title: "弹层", components: [] }; };
globalThis.widget = function (ctx) { return { title: "小组件", components: [] }; };
globalThis.background = function (ctx) { return {}; };
globalThis.actions = {
  refresh: function (ctx) {
    return { effects: [{ refresh: { surface: "current" } }] };
  }
};
```

`sheet` 未实现时会回退到 `detail`。每个组件 `id` 应在当前组件树中稳定且唯一，尤其是 `replaceComponents.targetId` 的目标。

### 4. 静态校验

在插件目录执行：

```bash
node --check main.js
node -e 'JSON.parse(require("fs").readFileSync("manifest.json", "utf8")); console.log("manifest ok")'
```

若当前同时有 MyServers 服务端源码，再执行：

```bash
cd /path/to/myservers/server
go test ./backend_server/plugin ./backend_server/admin
```

### 5. 在 App 中验证

1. 在 App 设置中打开“本地插件开发”开关。
2. 进入插件市场的本地插件区域并刷新。
3. 安装插件，确认权限并填写配置。
4. 验证 Dashboard、详情页、半弹层、Action 和小组件。
5. 修改本地 `main.js` 后重新触发渲染；开发模式会重新读取脚本。manifest、权限或配置结构变化后重新安装。

不要把“文件已写入开发目录”当成“插件已安装”；安装仍由 App 发起。

## 工作流二：提交到插件市场

该仓库托管在 GitHub，所以 GitLab 术语中的 MR 对应 GitHub Pull Request。

### 1. Fork 并创建分支

```bash
git clone https://github.com/<your-account>/myservers-plugins.git
cd myservers-plugins
git remote add upstream https://github.com/my-servers/myservers-plugins.git
git switch -c plugin/<plugin-id>-<version>
```

### 2. 创建不可变版本目录

```text
plugins/<plugin-id>/<version>/manifest.json
plugins/<plugin-id>/<version>/main.js
```

新插件通常从 `1.0.0` 开始。更新插件时复制上一个版本到新的语义化版本目录，只修改新目录。

市场 manifest 要求：

- `entrypoints.main` 为 `main.js`；
- `assets` 至少声明 `main.js`；
- 推荐省略 asset 的 `url`，市场 API 会按 manifest 所在版本目录生成稳定下载地址；
- `checksums.main.js` 为 `sha256:<64位小写十六进制>`；
- `id`、`version` 与目录一致；
- 权限只声明实际使用的最小范围。

计算 checksum：

```bash
sha256=$(shasum -a 256 "plugins/<plugin-id>/<version>/main.js" | awk '{print $1}')
echo "sha256:$sha256"
```

### 3. 更新市场索引

在 `plugins/index.json` 新增或更新唯一条目：

```json
{
  "id": "example-service-status",
  "name": "服务状态",
  "description": "展示服务健康度和资源趋势。",
  "icon": "server.rack",
  "icon_url": "https://example.com/icon.png",
  "latest_version": "1.0.0",
  "manifest_path": "plugins/example-service-status/1.0.0/manifest.json",
  "demo_cards": []
}
```

`icon_url` 可选并支持 HTTP/HTTPS；加载失败时 App 使用 `icon` 的 SF Symbol。`demo_cards` 是未安装前的静态预览，不会执行插件代码。完整结构见运行时参考和 Demo。

### 4. 执行仓库校验

在仓库根目录使用本 Skill 自带脚本：

```bash
python3 skills/myservers-plugin-dev-zh/scripts/validate_marketplace.py \
  --repo . --plugin <plugin-id> --version <version>
```

它会检查索引、版本目录、manifest、入口、资源、JS 语法和 SHA-256。

还要人工确认：

- 本地安装和真实数据源已验证；
- Dashboard/详情/Sheet 在空数据、加载失败和权限不足时有状态组件；
- 小组件按 small/medium/large 控制信息密度；
- 不包含 Token、密码、私钥、真实内网地址或用户数据；
- 新权限和最低 App/Server 版本准确；
- 旧版本目录没有被修改。

### 5. 提交 PR/MR

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

PR 描述要说明：插件用途、数据来源、权限原因、本地验证环境、支持的页面/小组件、最低版本和校验命令结果。维护者合并后，市场 API 会从 `main` 分支读取索引和版本目录。

## 完成标准

只有同时满足以下条件才算完成：

- 本地插件能被 App 扫描、安装并渲染；
- 所有 Action 和权限路径经过真实验证；
- 市场目录、索引、Demo 卡片和 checksum 一致；
- 校验脚本通过；
- PR/MR 已创建并提供链接，或按用户要求只准备好可提交的分支。
