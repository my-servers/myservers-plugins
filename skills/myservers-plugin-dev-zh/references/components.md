# 组件 DSL 参考

## 目录

- JSON 规则
- 通用值与外观
- 25 类组件
- 图表与状态变体
- 原生半弹层
- Action 与 Effects
- 组合示例

## JSON 规则

页面返回：

```javascript
return {
  title: "页面标题",
  components: [
    { id: "title", text: { text: "在线", style: "PLUGIN_TEXT_STYLE_TITLE" } }
  ]
};
```

每个 `PluginComponent` 只能设置一种内容字段：`stack`、`grid`、`card`、`text`、`value`、`badge`、`button`、`toggle`、`list`、`progress`、`chart`、`icon`、`image`、`divider`、`spacer`、`table`、`descriptionList`、`form`、`actionMenu`、`confirm`、`tabs`、`disclosure`、`stateBlock`、`codeBlock` 或 `segmentedGauge`。

字段用 protobuf JSON 的 lowerCamelCase：`onTap`、`iconSource`、`descriptionList`、`stateBlock`、`codeBlock`、`segmentedGauge`。

## 通用值与外观

### PluginValue

```javascript
{
  number: 0.64,
  unit: "%",
  format: "PLUGIN_VALUE_FORMAT_PERCENT",
  trend: 0.08,
  status: "PLUGIN_STATUS_HEALTHY"
}
```

`text`、`number`、`boolean` 三选一。`number: 0` 是有效值。

- format：`TEXT`、`NUMBER`、`PERCENT`、`BYTES`、`DURATION`。
- status：`NEUTRAL`、`HEALTHY`、`WARNING`、`ERROR`、`RUNNING`、`STOPPED`。

枚举完整值都带前缀，例如 `PLUGIN_VALUE_FORMAT_BYTES`。

### PluginAppearance

```javascript
appearance: {
  accent: "PLUGIN_ACCENT_TEAL",
  size: "PLUGIN_COMPONENT_SIZE_REGULAR",
  variant: "PLUGIN_COMPONENT_VARIANT_TINTED",
  hideBackground: false,
  container: "PLUGIN_CONTAINER_STYLE_CARD",
  iconSource: {
    systemName: "server.rack",
    url: "https://example.com/icon.png"
  }
}
```

- accent：`BLUE`、`GREEN`、`ORANGE`、`RED`、`PURPLE`、`INDIGO`、`TEAL`、`GRAY`。
- size：`COMPACT`、`REGULAR`、`LARGE`。
- variant：`PLAIN`、`TINTED`、`FILLED`。
- container：`CARD`、`TRANSPARENT`、`NONE`。
- `url` 优先于 `systemName`；仅接受 HTTP/HTTPS；失败回退 SF Symbol。
- `appearance.icon`、`icon.name/url`、`stateBlock.iconUrl` 只是旧插件兼容字段，新代码不要使用。

## 25 类组件

| JSON 字段 | 能力与关键字段 |
|---|---|
| `stack` | 横向/纵向组合。`axis`、`children`、`spacing`、`appearance`。 |
| `grid` | 多列网格。`children`、`columns`、`spacing`、`appearance`。 |
| `card` | 容器和整卡点击。`children`、`appearance`、`onTap`。 |
| `text` | 标题/副标题/正文/说明/数值文本。`text`、`style`、`appearance`。 |
| `value` | 标题、说明、格式化值、趋势和状态；可点击。`title`、`subtitle`、`value`、`appearance`、`onTap`。 |
| `badge` | 短状态或短值；可点击。`text`、`value`、`appearance`、`onTap`。 |
| `button` | 普通插件 Action 或导航。`title`、`subtitle`、`appearance`、`onTap`。 |
| `toggle` | 原生开关。`title`、`subtitle`、`isOn`、`appearance`、`onChange`、`disabled`；切换后的布尔值通过 Action 参数 `value` 传递。 |
| `list` | 多行列表；列表和单行都可点击。每项有 `title`、`subtitle`、`value`、`appearance`、`onTap`。 |
| `progress` | 0...1 线性进度、格式化值、说明；可点击。 |
| `chart` | 折线、柱状、面积、环形、仪表图；支持范围、标签、空文案、隐藏范围；可点击。 |
| `segmentedGauge` | 多分段占比、中心值、图例；每段可有外观；整图可点击。 |
| `table` | 列定义、格式、宽度倾向、行状态、行点击和整表点击。 |
| `descriptionList` | 1 到多列键值详情；每项有说明、值、外观和点击。 |
| `form` | 文本、多行、数字、密码、选择、开关；提交时字段值进入 Action 参数。 |
| `actionMenu` | 一组普通/危险操作；每项可有图标、说明和 Action。 |
| `confirm` | 二次确认；支持危险样式、确认/取消文案、确认 Action。 |
| `tabs` | 多个 Tab，每个 Tab 有 ID、标题、Badge 和任意子组件；`selectedId` 指定默认项。 |
| `disclosure` | 默认展开或折叠的任意子组件区块。 |
| `stateBlock` | 空、加载、错误、权限不足、不支持；可带图标、说明和修复 Action。 |
| `codeBlock` | 等宽代码/文本；`title`、`code`、`language`、`wrap`、`appearance`。 |
| `icon` | SF Symbol 或 HTTP/HTTPS URL 图标；使用 `appearance.iconSource`。 |
| `image` | HTTP/HTTPS 图片；`mode` 为 `fit`、`fill` 或 `stretch`。 |
| `divider` | 分隔线，可使用外观。 |
| `spacer` | 固定留白；`length: 0` 表示自适应。 |

### 文本样式

`PLUGIN_TEXT_STYLE_TITLE`、`SUBTITLE`、`BODY`、`CAPTION`、`VALUE`。

### 开关

```javascript
{
  id: "alerts",
  toggle: {
    title: "异常通知",
    subtitle: "服务异常时发送通知",
    isOn: true,
    appearance: {
      accent: "PLUGIN_ACCENT_GREEN",
      iconSource: { systemName: "bell.badge.fill" }
    },
    onChange: {
      plugin: { actionId: "setAlerts", params: { scope: "server" } }
    }
  }
}
```

用户切换后，App 保留原有 `params`，并写入 `ctx.params.value`，值为字符串 `"true"` 或 `"false"`。没有 `onChange` 或 `disabled: true` 时，开关按只读状态展示。

### 图表

```javascript
{
  id: "cpu-chart",
  chart: {
    title: "CPU 趋势",
    kind: "PLUGIN_CHART_KIND_LINE",
    points: [
      { label: "10:00", value: 28 },
      { label: "10:05", value: 43 }
    ],
    options: {
      min: 0,
      max: 100,
      showLabels: true,
      emptyText: "暂无数据",
      hideRange: true
    },
    appearance: { accent: "PLUGIN_ACCENT_BLUE" }
  }
}
```

kind：`LINE`、`BAR`、`AREA`、`DONUT`、`GAUGE`，都带 `PLUGIN_CHART_KIND_` 前缀。`hideRange: true` 隐藏右上角最小/最大值。

### 状态块

```javascript
{
  id: "permission-state",
  stateBlock: {
    kind: "PLUGIN_STATE_KIND_PERMISSION",
    title: "需要授权",
    message: "请授权访问服务 API。",
    actionTitle: "重试",
    action: { plugin: { actionId: "retry" } },
    appearance: {
      accent: "PLUGIN_ACCENT_ORANGE",
      iconSource: { systemName: "lock.shield", url: "https://example.com/lock.png" }
    }
  }
}
```

kind：`EMPTY`、`LOADING`、`ERROR`、`PERMISSION`、`UNSUPPORTED`，都带 `PLUGIN_STATE_KIND_` 前缀。

## 原生半弹层

半弹层不是 `PluginComponent`，而是导航到 `sheet` Surface。App 使用苹果原生 Sheet 和 Detents。

```javascript
{
  id: "open-sheet",
  button: {
    title: "查看详情",
    onTap: {
      navigate: {
        surface: "sheet",
        route: "service-detail",
        detents: ["compact", "medium", "large"],
        initialDetent: "medium"
      }
    }
  }
}
```

实现 `globalThis.sheet(ctx)`，通过 `ctx.route` 返回对应内容。可用高度为 `compact`、`medium`、`large`；没有提供时默认 `medium,large`。

## Action 与 Effects

触发插件 Action：

```javascript
onTap: { plugin: { actionId: "restart", params: { service: "api" } } }
```

直接导航：

```javascript
onTap: { navigate: { surface: "detail", route: "overview" } }
```

Action 返回的 effect 按顺序执行：

```javascript
return {
  effects: [
    { toast: { text: "已刷新", level: "success", durationMs: 1800 } },
    { replaceComponents: { targetId: "metrics", components: [] } },
    { refresh: { surface: "current" } },
    { navigate: { surface: "detail", route: "overview" } }
  ]
};
```

- `toast.level`：`info`、`success`、`warning`、`error`。
- `refresh.surface`：`current`、`dashboard`、`detail`、`sheet`、`widget`。
- `replaceComponents` 替换 `targetId` 对应组件；空目标替换当前展示组件。
- 一次 Action 接受第一个导航；导航后的刷新/替换会被忽略，所以导航通常放最后。

## 组合示例

```javascript
{
  id: "summary-card",
  card: {
    appearance: { variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
    children: [
      {
        id: "summary-header",
        stack: {
          axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL",
          spacing: 8,
          children: [
            { id: "summary-icon", icon: { appearance: { iconSource: { systemName: "server.rack" }, accent: "PLUGIN_ACCENT_TEAL" } } },
            { id: "summary-title", text: { text: "家庭服务器", style: "PLUGIN_TEXT_STYLE_TITLE" } },
            { id: "summary-state", badge: { text: "在线", appearance: { accent: "PLUGIN_ACCENT_GREEN" } } }
          ]
        }
      },
      { id: "summary-load", progress: { title: "CPU", progress: 0.42, value: { number: 0.42, format: "PLUGIN_VALUE_FORMAT_PERCENT" } } }
    ],
    onTap: { navigate: { surface: "detail", route: "overview" } }
  }
}
```
