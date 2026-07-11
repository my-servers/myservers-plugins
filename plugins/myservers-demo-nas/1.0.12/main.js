function demoLabel(ctx) {
  return (ctx.config && ctx.config.host_label) || "NAS";
}

function demoAccent(ctx) {
  const accent = (ctx.config && ctx.config.accent) || "blue";
  if (accent === "green") return "PLUGIN_ACCENT_GREEN";
  if (accent === "purple") return "PLUGIN_ACCENT_PURPLE";
  return "PLUGIN_ACCENT_BLUE";
}

function demoPoints() {
  return [
    { label: "00:00", value: 26 },
    { label: "03:00", value: 31 },
    { label: "06:00", value: 24 },
    { label: "09:00", value: 38 },
    { label: "12:00", value: 28 },
    { label: "15:00", value: 46 },
    { label: "18:00", value: 34 },
    { label: "21:00", value: 52 },
    { label: "24:00", value: 32.4 }
  ];
}

function demoMemoryPoints() {
  return [
    { label: "00:00", value: 38 },
    { label: "04:00", value: 42 },
    { label: "08:00", value: 47 },
    { label: "12:00", value: 45 },
    { label: "16:00", value: 51 },
    { label: "20:00", value: 54 },
    { label: "24:00", value: 56 }
  ];
}

function demoMemorySegments() {
  return [
    { label: "已用", value: 56, appearance: { accent: "PLUGIN_ACCENT_BLUE" } },
    { label: "缓存", value: 28, appearance: { accent: "PLUGIN_ACCENT_TEAL" } },
    { label: "可用", value: 16, appearance: { accent: "PLUGIN_ACCENT_GRAY" } }
  ];
}

function demoMetricSummaries() {
  return [
    { title: "平均", value: { number: 28.6, unit: "%", format: "percent" } },
    { title: "最高", value: { number: 52.1, unit: "%", format: "percent" } },
    { title: "最低", value: { number: 15.3, unit: "%", format: "percent" } },
    { title: "当前", value: { number: 32.4, unit: "%", format: "percent" } }
  ];
}

function prettyCode(component) {
  return JSON.stringify(component, null, 2);
}

function componentExample(id, title, description, component) {
  return {
    id: id,
    card: {
      appearance: { accent: "PLUGIN_ACCENT_GRAY", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
      children: [
        { id: id + "-title", text: { text: title, style: "PLUGIN_TEXT_STYLE_TITLE" } },
        { id: id + "-description", text: { text: description, style: "PLUGIN_TEXT_STYLE_CAPTION" } },
        {
          id: id + "-code",
          disclosure: {
            title: "插件代码",
            subtitle: "展开查看可复制的 JSON 示例",
            expanded: false,
            appearance: { accent: "PLUGIN_ACCENT_GRAY", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
            children: [
              {
                id: id + "-code-block",
                codeBlock: {
                  title: "JSON",
                  language: "json",
                  wrap: true,
                  code: prettyCode(component),
                  appearance: { accent: "PLUGIN_ACCENT_GRAY", hideBackground: true }
                }
              }
            ]
          }
        },
        { id: id + "-render-label", text: { text: "实际渲染", style: "PLUGIN_TEXT_STYLE_CAPTION" } },
        component
      ]
    }
  };
}

function demoComponentShowcase(ctx, label) {
  const stackComponent = {
    id: "render-stack",
    stack: {
      axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL",
      spacing: 8,
      children: [
        { id: "render-stack-icon", icon: { name: "square.stack.3d.up.fill", appearance: { accent: demoAccent(ctx) } } },
        { id: "render-stack-text", text: { text: "横向/纵向组合容器", style: "PLUGIN_TEXT_STYLE_BODY" } },
        { id: "render-stack-badge", badge: { text: "stack", appearance: { accent: demoAccent(ctx) } } }
      ]
    }
  };
  const gridComponent = {
    id: "render-grid",
    grid: {
      columns: 2,
      spacing: 8,
      appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
      children: [
        { id: "render-grid-cpu", value: { title: "CPU", value: { number: 0.32, format: "PLUGIN_VALUE_FORMAT_PERCENT" }, appearance: { accent: demoAccent(ctx), icon: "cpu" } } },
        { id: "render-grid-mem", value: { title: "内存", value: { number: 0.56, format: "PLUGIN_VALUE_FORMAT_PERCENT" }, appearance: { accent: "PLUGIN_ACCENT_GREEN", icon: "memorychip" } } }
      ]
    }
  };
  const cardComponent = {
    id: "render-card",
    card: {
      appearance: { accent: "PLUGIN_ACCENT_TEAL", variant: "PLUGIN_COMPONENT_VARIANT_FILLED" },
      children: [
        { id: "render-card-title", text: { text: "Card", style: "PLUGIN_TEXT_STYLE_TITLE" } },
        { id: "render-card-body", text: { text: "卡片容器，可包裹任意子组件并承载点击动作。", style: "PLUGIN_TEXT_STYLE_BODY" } }
      ],
      onTap: { plugin: { actionId: "refresh" } }
    }
  };
  const textComponent = {
    id: "render-text",
    text: { text: "Text：标题、副标题、正文、说明、数值文本", style: "PLUGIN_TEXT_STYLE_BODY", appearance: { accent: demoAccent(ctx) } }
  };
  const valueComponent = {
    id: "render-value",
    value: { title: "Value", subtitle: "标题 + 数值 + 趋势", value: { number: 0.724, format: "PLUGIN_VALUE_FORMAT_PERCENT", trend: 3.4, status: "PLUGIN_STATUS_HEALTHY" }, appearance: { accent: demoAccent(ctx), icon: "gauge.medium" } }
  };
  const badgeComponent = {
    id: "render-badge",
    badge: { text: "Badge", value: { text: "运行中", status: "PLUGIN_STATUS_RUNNING" }, appearance: { accent: "PLUGIN_ACCENT_GREEN" } }
  };
  const buttonComponent = {
    id: "render-button",
    button: { title: "Button", subtitle: "点击触发插件 action", appearance: { accent: demoAccent(ctx), icon: "bolt.circle", variant: "PLUGIN_COMPONENT_VARIANT_FILLED" }, onTap: { plugin: { actionId: "refresh" } } }
  };
  const listComponent = {
    id: "render-list",
    list: {
      title: "List",
      items: [
        { title: "第一项", subtitle: "带状态和值", value: { text: "正常", status: "PLUGIN_STATUS_HEALTHY" }, appearance: { accent: "PLUGIN_ACCENT_GREEN", icon: "checkmark.circle" } },
        { title: "第二项", subtitle: "可点击", value: { text: "查看" }, appearance: { accent: demoAccent(ctx), icon: "arrow.right.circle" }, onTap: { plugin: { actionId: "openDetail" } } }
      ],
      appearance: { accent: demoAccent(ctx), variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
    }
  };
  const progressComponent = {
    id: "render-progress",
    progress: { title: "Progress", subtitle: "0 到 1 的线性进度", value: { number: 0.58, format: "PLUGIN_VALUE_FORMAT_PERCENT", status: "PLUGIN_STATUS_RUNNING" }, progress: 0.58, appearance: { accent: demoAccent(ctx), icon: "speedometer" } }
  };
  const lineChartComponent = {
    id: "render-line-chart",
    chart: { title: "Chart Line", kind: "PLUGIN_CHART_KIND_LINE", points: demoPoints(), options: { min: 0, max: 100, showLabels: true }, appearance: { accent: demoAccent(ctx) } }
  };
  const areaChartComponent = {
    id: "render-area-chart",
    chart: { title: "Chart Area", kind: "PLUGIN_CHART_KIND_AREA", points: demoMemoryPoints(), options: { min: 0, max: 100, showLabels: true }, appearance: { accent: "PLUGIN_ACCENT_GREEN" } }
  };
  const barChartComponent = {
    id: "render-bar-chart",
    chart: { title: "Chart Bar", kind: "PLUGIN_CHART_KIND_BAR", points: demoPoints().slice(0, 6), options: { min: 0, max: 100, showLabels: true }, appearance: { accent: "PLUGIN_ACCENT_ORANGE" } }
  };
  const donutChartComponent = {
    id: "render-donut-chart",
    chart: { title: "Chart Donut", kind: "PLUGIN_CHART_KIND_DONUT", points: [{ label: "A", value: 40 }, { label: "B", value: 35 }, { label: "C", value: 25 }], appearance: { accent: "PLUGIN_ACCENT_PURPLE" } }
  };
  const gaugeChartComponent = {
    id: "render-gauge-chart",
    chart: { title: "Chart Gauge", kind: "PLUGIN_CHART_KIND_GAUGE", points: [{ label: "使用率", value: 58 }], options: { min: 0, max: 100 }, appearance: { accent: demoAccent(ctx) } }
  };
  const segmentedGaugeComponent = {
    id: "render-segmented-gauge",
    segmentedGauge: { title: "Segmented Gauge", segments: demoMemorySegments(), centerValue: { number: 0.56, format: "PLUGIN_VALUE_FORMAT_PERCENT" }, showLegend: true, appearance: { accent: demoAccent(ctx) } }
  };
  const tableComponent = {
    id: "render-table",
    table: {
      title: "Table",
      columns: [
        { key: "name", title: "名称" },
        { key: "status", title: "状态", width: "PLUGIN_COMPONENT_SIZE_COMPACT" },
        { key: "usage", title: "占用", format: "PLUGIN_VALUE_FORMAT_PERCENT", width: "PLUGIN_COMPONENT_SIZE_COMPACT" }
      ],
      rows: [
        { id: "row-1", values: { name: { text: "worker" }, status: { text: "运行中", status: "PLUGIN_STATUS_RUNNING" }, usage: { number: 0.32, format: "PLUGIN_VALUE_FORMAT_PERCENT" } }, status: "PLUGIN_STATUS_RUNNING" },
        { id: "row-2", values: { name: { text: "backup" }, status: { text: "空闲" }, usage: { number: 0.04, format: "PLUGIN_VALUE_FORMAT_PERCENT" } }, status: "PLUGIN_STATUS_HEALTHY" }
      ],
      appearance: { accent: demoAccent(ctx), variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
    }
  };
  const descriptionListComponent = {
    id: "render-description-list",
    descriptionList: {
      title: "Description List",
      columns: 2,
      items: [
        { title: "插件", value: { text: label } },
        { title: "版本", value: { text: "1.0.12" } },
        { title: "入口", value: { text: ctx.surface || "detail" } },
        { title: "动作", value: { text: "受控 Action" } }
      ],
      appearance: { accent: demoAccent(ctx) }
    }
  };
  const formComponent = {
    id: "render-form",
    form: {
      title: "Form",
      submitTitle: "提交",
      fields: [
        { key: "keyword", label: "关键字", input: "PLUGIN_CONFIG_INPUT_TEXT", value: "demo" },
        { key: "enabled", label: "启用", input: "PLUGIN_CONFIG_INPUT_SWITCH", value: "true" }
      ],
      onSubmit: { plugin: { actionId: "refresh" } },
      appearance: { accent: demoAccent(ctx) }
    }
  };
  const actionMenuComponent = {
    id: "render-action-menu",
    actionMenu: { title: "Action Menu", items: [{ title: "刷新", onTap: { plugin: { actionId: "refresh" } } }, { title: "危险操作", destructive: true, onTap: { plugin: { actionId: "refresh" } } }], appearance: { accent: demoAccent(ctx), icon: "ellipsis.circle" } }
  };
  const confirmComponent = {
    id: "render-confirm",
    confirm: { title: "Confirm", message: "确认组件用于危险操作二次确认。", confirmTitle: "确认", cancelTitle: "取消", destructive: true, onConfirm: { plugin: { actionId: "refresh" } }, appearance: { accent: "PLUGIN_ACCENT_RED", icon: "checkmark.shield" } }
  };
  const tabsComponent = {
    id: "render-tabs",
    tabs: {
      selectedId: "first",
      tabs: [
        { id: "first", title: "Tab A", children: [{ id: "tab-a-text", text: { text: "Tabs：分段展示一组子组件", style: "PLUGIN_TEXT_STYLE_BODY" } }] },
        { id: "second", title: "Tab B", children: [{ id: "tab-b-badge", badge: { text: "第二页", appearance: { accent: "PLUGIN_ACCENT_PURPLE" } } }] }
      ],
      appearance: { accent: demoAccent(ctx), variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
    }
  };
  const disclosureComponent = {
    id: "render-disclosure",
    disclosure: {
      title: "Disclosure",
      subtitle: "折叠区块",
      expanded: true,
      children: [{ id: "disclosure-text", text: { text: "这里可以继续组合任意组件。", style: "PLUGIN_TEXT_STYLE_BODY" } }],
      appearance: { accent: demoAccent(ctx) }
    }
  };
  const stateEmptyComponent = {
    id: "render-state-empty",
    stateBlock: { kind: "PLUGIN_STATE_KIND_EMPTY", title: "State Empty", message: "空状态展示。", appearance: { accent: "PLUGIN_ACCENT_GRAY" } }
  };
  const stateLoadingComponent = {
    id: "render-state-loading",
    stateBlock: { kind: "PLUGIN_STATE_KIND_LOADING", title: "State Loading", message: "加载状态展示。", appearance: { accent: demoAccent(ctx) } }
  };
  const stateErrorComponent = {
    id: "render-state-error",
    stateBlock: { kind: "PLUGIN_STATE_KIND_ERROR", title: "State Error", message: "错误状态展示。", appearance: { accent: "PLUGIN_ACCENT_RED" } }
  };
  const codeBlockComponent = {
    id: "render-code-block",
    codeBlock: { title: "Code Block", language: "json", wrap: true, code: JSON.stringify({ ok: true, component: "codeBlock" }, null, 2), appearance: { accent: demoAccent(ctx) } }
  };
  const iconComponent = {
    id: "render-icon",
    icon: { name: "shippingbox.fill", appearance: { accent: demoAccent(ctx), size: "PLUGIN_COMPONENT_SIZE_LARGE" } }
  };
  const imageComponent = {
    id: "render-image",
    image: { url: "https://dummyimage.com/600x240/2563eb/ffffff.png&text=Plugin+Image", mode: "fit", appearance: { size: "PLUGIN_COMPONENT_SIZE_REGULAR" } }
  };
  const dividerComponent = {
    id: "render-divider",
    divider: {}
  };
  const spacerComponent = {
    id: "render-spacer",
    spacer: { length: 12 }
  };

  return [
    { id: "showcase-title", text: { text: "组件开发示例", style: "PLUGIN_TEXT_STYLE_TITLE" } },
    { id: "showcase-subtitle", text: { text: "每个示例都按标题、插件代码、实际渲染排列。复制代码对象到 dashboard、widget 或 detail 的 components 数组即可开始开发。", style: "PLUGIN_TEXT_STYLE_SUBTITLE" } },
    componentExample("component-stack", "Stack", "组合多个子组件，适合做横向指标、标题栏和操作区。", stackComponent),
    componentExample("component-grid", "Grid", "按列数排列子组件，适合 NAS 指标看板。", gridComponent),
    componentExample("component-card", "Card", "卡片容器可以承载子组件、样式和点击动作。", cardComponent),
    componentExample("component-text", "Text", "渲染标题、正文、说明等文本内容。", textComponent),
    componentExample("component-value", "Value", "展示名称、数值、单位、趋势和状态。", valueComponent),
    componentExample("component-badge", "Badge", "展示短状态和值，适合运行中、异常、同步中。", badgeComponent),
    componentExample("component-button", "Button", "触发插件 action，可配置图标、强调色和填充样式。", buttonComponent),
    componentExample("component-list", "List", "展示多行项目，每一行都可以带状态、值和点击动作。", listComponent),
    componentExample("component-progress", "Progress", "展示 0 到 1 的线性进度。", progressComponent),
    componentExample("component-line-chart", "Chart Line", "展示连续趋势数据。", lineChartComponent),
    componentExample("component-area-chart", "Chart Area", "展示带面积填充的趋势数据。", areaChartComponent),
    componentExample("component-bar-chart", "Chart Bar", "展示柱状对比数据。", barChartComponent),
    componentExample("component-donut-chart", "Chart Donut", "展示占比分布数据。", donutChartComponent),
    componentExample("component-gauge-chart", "Chart Gauge", "展示单项使用率仪表。", gaugeChartComponent),
    componentExample("component-segmented-gauge", "Segmented Gauge", "展示多段占比，适合内存、磁盘、存储池分布。", segmentedGaugeComponent),
    componentExample("component-table", "Table", "展示结构化行列数据。", tableComponent),
    componentExample("component-description-list", "Description List", "展示键值信息，适合元数据和配置摘要。", descriptionListComponent),
    componentExample("component-form", "Form", "展示插件内表单，并通过 onSubmit 调用 action。", formComponent),
    componentExample("component-action-menu", "Action Menu", "展示一组操作入口，支持危险操作标记。", actionMenuComponent),
    componentExample("component-confirm", "Confirm", "展示二次确认动作，适合重启、删除等危险操作。", confirmComponent),
    componentExample("component-tabs", "Tabs", "在一个区域内切换展示多组子组件。", tabsComponent),
    componentExample("component-disclosure", "Disclosure", "可展开的详情区块，适合放日志或高级信息。", disclosureComponent),
    componentExample("component-state-empty", "State Empty", "空状态组件。", stateEmptyComponent),
    componentExample("component-state-loading", "State Loading", "加载状态组件。", stateLoadingComponent),
    componentExample("component-state-error", "State Error", "错误状态组件。", stateErrorComponent),
    componentExample("component-code-block", "Code Block", "展示代码片段，适合插件教程或调试信息。", codeBlockComponent),
    componentExample("component-icon", "Icon", "展示系统图标。", iconComponent),
    componentExample("component-image", "Image", "展示远程图片。", imageComponent),
    componentExample("component-divider", "Divider", "分隔上下内容。", dividerComponent),
    componentExample("component-spacer", "Spacer", "控制局部间距。", spacerComponent)
  ];
}

globalThis.demoBackgroundCount = 0;

globalThis.background = function(ctx) {
  if (ctx.taskId === "refresh-demo") {
    globalThis.demoBackgroundCount = globalThis.demoBackgroundCount + 1;
  }
  return {};
};

globalThis.dashboard = function(ctx) {
  const label = demoLabel(ctx);
  return {
    title: label + " 控制台",
    components: [
      {
        id: "dashboard-card",
        card: {
          appearance: { accent: demoAccent(ctx), icon: "shippingbox.fill", variant: "PLUGIN_COMPONENT_VARIANT_FILLED" },
          onTap: { plugin: { actionId: "openDetail" } },
          children: [
            {
              id: "hero-header",
              stack: {
                axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL",
                spacing: 8,
                children: [
                  { id: "hero-icon", icon: { name: "sparkles", appearance: { accent: "PLUGIN_ACCENT_TEAL", size: "PLUGIN_COMPONENT_SIZE_LARGE" } } },
                  { id: "hero-title", text: { text: label + " 已接管", style: "PLUGIN_TEXT_STYLE_TITLE" } },
                  { id: "hero-state", badge: { text: "在线", value: { status: "PLUGIN_STATUS_RUNNING" }, appearance: { accent: "PLUGIN_ACCENT_GREEN" } } }
                ]
              }
            },
            { id: "hero-subtitle", text: { text: "主存储池健康，12 个容器运行中。点击查看完整插件详情。", style: "PLUGIN_TEXT_STYLE_CAPTION" } },
            {
              id: "dashboard-storage",
              progress: {
                title: "主存储池",
                subtitle: "已用 64% · 剩余 7.2 TB",
                value: { number: 0.64, format: "PLUGIN_VALUE_FORMAT_PERCENT", status: "PLUGIN_STATUS_HEALTHY" },
                progress: 0.64,
                appearance: { accent: "PLUGIN_ACCENT_TEAL", icon: "internaldrive.fill" }
              }
            },
            {
              id: "dashboard-metrics",
              grid: {
                columns: 3,
                spacing: 8,
                appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
                children: [
                  { id: "cpu", value: { title: "CPU", value: { number: 0.32, format: "PLUGIN_VALUE_FORMAT_PERCENT", status: "PLUGIN_STATUS_HEALTHY" }, appearance: { accent: demoAccent(ctx), icon: "cpu" } } },
                  { id: "memory", value: { title: "内存", value: { number: 0.56, format: "PLUGIN_VALUE_FORMAT_PERCENT", status: "PLUGIN_STATUS_RUNNING" }, appearance: { accent: "PLUGIN_ACCENT_GREEN", icon: "memorychip" } } },
                  { id: "network", value: { title: "网络", value: { number: 84, unit: "MB/s", status: "PLUGIN_STATUS_HEALTHY" }, appearance: { accent: "PLUGIN_ACCENT_ORANGE", icon: "network" } } }
                ]
              }
            }
          ]
        }
      }
    ]
  };
};

globalThis.widget = function(ctx) {
  const label = demoLabel(ctx);
  return {
    title: label + " 小组件",
    components: [
      {
        id: "load",
        progress: {
          title: "模拟负载",
          value: { number: 0.58, unit: "%", format: "PLUGIN_VALUE_FORMAT_PERCENT", status: "PLUGIN_STATUS_HEALTHY" },
          progress: 0.58,
          appearance: { accent: demoAccent(ctx), icon: "speedometer", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
        }
      },
      {
        id: "background",
        value: {
          title: "后台刷新次数",
          value: { text: String(globalThis.demoBackgroundCount) },
          subtitle: "由 background(ctx) 更新",
          appearance: { accent: "PLUGIN_ACCENT_GREEN", icon: "clock.arrow.circlepath", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
        }
      }
    ]
  };
};

globalThis.detail = function(ctx) {
  const label = demoLabel(ctx);
  return {
    title: "NAS 示例详情",
    components: demoComponentShowcase(ctx, label)
  };
};

globalThis.actions = {
  openDetail: function(ctx) {
    return {
      effects: [
        { toast: { text: "正在打开插件详情", level: "info" } },
        { navigate: { surface: "detail", route: "detail" } }
      ]
    };
  },
  refresh: function(ctx) {
    return {
      effects: [
        { toast: { text: "插件动作已在 NAS 上执行：" + demoLabel(ctx), level: "success" } },
        { refresh: { surface: "current" } },
        {
          replaceComponents: {
            targetId: "metrics",
            components: [
              {
                id: "last-action",
                value: {
                  title: "最近动作",
                  value: { text: "refresh", status: "PLUGIN_STATUS_HEALTHY" },
                  subtitle: "由 Goja actions.refresh(ctx) 返回",
                  appearance: { accent: demoAccent(ctx), icon: "bolt.circle", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
                }
              }
            ]
          }
        }
      ]
    };
  }
};
