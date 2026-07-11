# Component DSL Reference

## Component Basics

Every component is a protobuf oneof object:

```javascript
{ id: "cpu", value: { title: "CPU", value: { number: 0.32, format: "PLUGIN_VALUE_FORMAT_PERCENT" } } }
```

Rules:

- Always include stable `id` values for components that may be refreshed or replaced.
- Put exactly one content key on each component: `text`, `card`, `grid`, `segmentedGauge`, etc.
- Use lowerCamelCase protobuf JSON names: `onTap`, `submitTitle`, `selectedId`, `descriptionList`, `stateBlock`, `codeBlock`, `centerValue`, `showLegend`, `hideBackground`, `replaceComponents`.
- Use protobuf enum names in rendered components.
- Avoid legacy fields such as `type`, `status: "healthy"`, `format: "percent"`, or top-level icon shortcuts.

## Shared Appearance

Most components accept `appearance`:

```javascript
appearance: {
  accent: "PLUGIN_ACCENT_TEAL",
  icon: "internaldrive.fill",
  size: "PLUGIN_COMPONENT_SIZE_REGULAR",
  variant: "PLUGIN_COMPONENT_VARIANT_TINTED",
  hideBackground: false,
  container: "PLUGIN_CONTAINER_STYLE_CARD"
}
```

Accents:

- `PLUGIN_ACCENT_BLUE`
- `PLUGIN_ACCENT_GREEN`
- `PLUGIN_ACCENT_ORANGE`
- `PLUGIN_ACCENT_RED`
- `PLUGIN_ACCENT_PURPLE`
- `PLUGIN_ACCENT_INDIGO`
- `PLUGIN_ACCENT_TEAL`
- `PLUGIN_ACCENT_GRAY`

Sizes:

- `PLUGIN_COMPONENT_SIZE_COMPACT`
- `PLUGIN_COMPONENT_SIZE_REGULAR`
- `PLUGIN_COMPONENT_SIZE_LARGE`

Variants:

- `PLUGIN_COMPONENT_VARIANT_PLAIN`
- `PLUGIN_COMPONENT_VARIANT_TINTED`
- `PLUGIN_COMPONENT_VARIANT_FILLED`

Containers:

- `PLUGIN_CONTAINER_STYLE_CARD`
- `PLUGIN_CONTAINER_STYLE_TRANSPARENT`
- `PLUGIN_CONTAINER_STYLE_NONE`

## Values And Status

Value object:

```javascript
{
  text: "Online",
  // or number: 0.64,
  // or boolean: true,
  unit: "%",
  format: "PLUGIN_VALUE_FORMAT_PERCENT",
  trend: 3.4,
  status: "PLUGIN_STATUS_HEALTHY"
}
```

Formats:

- `PLUGIN_VALUE_FORMAT_TEXT`
- `PLUGIN_VALUE_FORMAT_NUMBER`
- `PLUGIN_VALUE_FORMAT_PERCENT`
- `PLUGIN_VALUE_FORMAT_BYTES`
- `PLUGIN_VALUE_FORMAT_DURATION`

Statuses:

- `PLUGIN_STATUS_NEUTRAL`
- `PLUGIN_STATUS_HEALTHY`
- `PLUGIN_STATUS_WARNING`
- `PLUGIN_STATUS_ERROR`
- `PLUGIN_STATUS_RUNNING`
- `PLUGIN_STATUS_STOPPED`

Use `number: 0.64` with `PLUGIN_VALUE_FORMAT_PERCENT` for 64%. Use `progress: 0.64` for progress bars.

## Layout Components

Stack:

```javascript
{
  id: "header",
  stack: {
    axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL",
    spacing: 8,
    children: [
      { id: "icon", icon: { name: "shippingbox.fill", appearance: { accent: "PLUGIN_ACCENT_BLUE" } } },
      { id: "title", text: { text: "NAS Online", style: "PLUGIN_TEXT_STYLE_TITLE" } }
    ]
  }
}
```

Grid:

```javascript
{
  id: "metrics",
  grid: {
    columns: 2,
    spacing: 8,
    appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
    children: [
      { id: "cpu", value: { title: "CPU", value: { number: 0.32, format: "PLUGIN_VALUE_FORMAT_PERCENT" } } },
      { id: "memory", value: { title: "Memory", value: { number: 0.56, format: "PLUGIN_VALUE_FORMAT_PERCENT" } } }
    ]
  }
}
```

Card:

```javascript
{
  id: "open-detail",
  card: {
    appearance: { accent: "PLUGIN_ACCENT_TEAL", variant: "PLUGIN_COMPONENT_VARIANT_FILLED" },
    onTap: { plugin: { actionId: "openDetail" } },
    children: [
      { id: "title", text: { text: "NAS Managed", style: "PLUGIN_TEXT_STYLE_TITLE" } }
    ]
  }
}
```

## Display Components

Text:

```javascript
{ id: "copy", text: { text: "Text body", style: "PLUGIN_TEXT_STYLE_BODY" } }
```

Text styles:

- `PLUGIN_TEXT_STYLE_TITLE`
- `PLUGIN_TEXT_STYLE_SUBTITLE`
- `PLUGIN_TEXT_STYLE_BODY`
- `PLUGIN_TEXT_STYLE_CAPTION`
- `PLUGIN_TEXT_STYLE_VALUE`

Value:

```javascript
{
  id: "storage-value",
  value: {
    title: "Storage",
    subtitle: "Remaining 7.2 TB",
    value: { number: 0.64, format: "PLUGIN_VALUE_FORMAT_PERCENT", status: "PLUGIN_STATUS_HEALTHY" },
    appearance: { accent: "PLUGIN_ACCENT_TEAL", icon: "internaldrive.fill" }
  }
}
```

Badge:

```javascript
{ id: "state", badge: { text: "Online", value: { status: "PLUGIN_STATUS_RUNNING" }, appearance: { accent: "PLUGIN_ACCENT_GREEN" } } }
```

Button:

```javascript
{ id: "refresh", button: { title: "Refresh", onTap: { plugin: { actionId: "refresh" } } } }
```

List:

```javascript
{
  id: "containers",
  list: {
    title: "Containers",
    items: [
      { title: "docker", subtitle: "running", value: { text: "32%", status: "PLUGIN_STATUS_RUNNING" } }
    ]
  }
}
```

Progress:

```javascript
{
  id: "storage",
  progress: {
    title: "Main pool",
    subtitle: "Remaining 7.2 TB",
    value: { number: 0.64, format: "PLUGIN_VALUE_FORMAT_PERCENT" },
    progress: 0.64,
    appearance: { accent: "PLUGIN_ACCENT_TEAL" }
  }
}
```

## Charts

Chart:

```javascript
{
  id: "load",
  chart: {
    title: "Load",
    kind: "PLUGIN_CHART_KIND_LINE",
    points: [
      { label: "00:00", value: 26 },
      { label: "06:00", value: 38 }
    ],
    options: { min: 0, max: 100, showLabels: true, emptyText: "No data" },
    appearance: { accent: "PLUGIN_ACCENT_BLUE" }
  }
}
```

Chart kinds:

- `PLUGIN_CHART_KIND_LINE`
- `PLUGIN_CHART_KIND_BAR`
- `PLUGIN_CHART_KIND_AREA`
- `PLUGIN_CHART_KIND_DONUT`
- `PLUGIN_CHART_KIND_GAUGE`

Segmented gauge:

```javascript
{
  id: "memory-segments",
  segmentedGauge: {
    title: "Memory",
    centerValue: { number: 0.68, format: "PLUGIN_VALUE_FORMAT_PERCENT" },
    showLegend: true,
    segments: [
      { label: "Used", value: 68, appearance: { accent: "PLUGIN_ACCENT_BLUE" } },
      { label: "Cache", value: 22, appearance: { accent: "PLUGIN_ACCENT_TEAL" } },
      { label: "Free", value: 10, appearance: { accent: "PLUGIN_ACCENT_GRAY" } }
    ]
  }
}
```

## Data And Controls

Table:

```javascript
{
  id: "processes",
  table: {
    title: "Processes",
    columns: [
      { key: "name", title: "Name" },
      { key: "cpu", title: "CPU", format: "PLUGIN_VALUE_FORMAT_PERCENT", width: "PLUGIN_COMPONENT_SIZE_COMPACT" }
    ],
    rows: [
      {
        id: "p1",
        values: { name: { text: "dockerd" }, cpu: { number: 0.12, format: "PLUGIN_VALUE_FORMAT_PERCENT" } },
        status: "PLUGIN_STATUS_RUNNING"
      }
    ]
  }
}
```

Description list:

```javascript
{
  id: "details",
  descriptionList: {
    title: "Details",
    columns: 2,
    items: [
      { title: "Host", value: { text: "nas" } },
      { title: "Version", value: { text: "1.0.0" } }
    ]
  }
}
```

Form:

```javascript
{
  id: "filters",
  form: {
    title: "Filters",
    submitTitle: "Apply",
    fields: [
      { key: "keyword", label: "Keyword", input: "PLUGIN_CONFIG_INPUT_TEXT", value: "docker" },
      { key: "enabled", label: "Enabled", input: "PLUGIN_CONFIG_INPUT_SWITCH", value: "true" }
    ],
    onSubmit: { plugin: { actionId: "applyFilters" } }
  }
}
```

Action menu:

```javascript
{
  id: "actions",
  actionMenu: {
    title: "Actions",
    items: [
      { title: "Refresh", onTap: { plugin: { actionId: "refresh" } } },
      { title: "Restart", destructive: true, onTap: { plugin: { actionId: "restart" } } }
    ]
  }
}
```

Confirm:

```javascript
{
  id: "confirm-restart",
  confirm: {
    title: "Restart service",
    message: "Restart now?",
    confirmTitle: "Restart",
    cancelTitle: "Cancel",
    destructive: true,
    onConfirm: { plugin: { actionId: "restart" } }
  }
}
```

## Structure Helpers

Tabs:

```javascript
{
  id: "tabs",
  tabs: {
    selectedId: "overview",
    tabs: [
      { id: "overview", title: "Overview", children: [{ id: "ok", text: { text: "OK" } }] },
      { id: "raw", title: "Raw", children: [{ id: "json", codeBlock: { code: "{}", language: "json", wrap: true } }] }
    ]
  }
}
```

Disclosure:

```javascript
{
  id: "advanced",
  disclosure: {
    title: "Advanced",
    subtitle: "Optional details",
    expanded: false,
    children: [{ id: "raw", codeBlock: { title: "JSON", code: "{}", language: "json", wrap: true } }]
  }
}
```

State block:

```javascript
{ id: "empty", stateBlock: { kind: "PLUGIN_STATE_KIND_EMPTY", title: "No data", message: "Try again later" } }
```

State kinds:

- `PLUGIN_STATE_KIND_EMPTY`
- `PLUGIN_STATE_KIND_LOADING`
- `PLUGIN_STATE_KIND_ERROR`
- `PLUGIN_STATE_KIND_PERMISSION`
- `PLUGIN_STATE_KIND_UNSUPPORTED`

Code block:

```javascript
{ id: "raw", codeBlock: { title: "Raw JSON", code: JSON.stringify(data, null, 2), language: "json", wrap: true } }
```

Icon:

```javascript
{ id: "icon", icon: { name: "shippingbox.fill", appearance: { accent: "PLUGIN_ACCENT_BLUE" } } }
```

Image:

```javascript
{ id: "image", image: { url: "https://example.com/image.png", mode: "fit" } }
```

Divider and spacer:

```javascript
{ id: "line", divider: {} }
{ id: "gap", spacer: { length: 12 } }
```

## Actions And Navigation

Most tappable components support `onTap`:

```javascript
onTap: { plugin: { actionId: "refresh", params: { scope: "all" } } }
onTap: { navigate: { surface: "detail", route: "overview" } }
```

Forms use `onSubmit`; confirm uses `onConfirm`.

## Widget Design

Widgets use the same component DSL but must be denser and size-aware:

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
        value: { number: 0.64, format: "PLUGIN_VALUE_FORMAT_PERCENT" },
        progress: 0.64,
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

  return {
    title: "NAS Widget",
    components: [{ id: "widget-card", card: { children } }]
  };
};
```

Widget guidance:

- `small`: one compact card, title plus one status line.
- `medium`: title, summary, one progress/value block.
- `large`: can include a list or multiple metrics, but avoid long text.
- Avoid tables, large charts, verbose code blocks, or deep nested cards in widgets.

