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

function demoComponentShowcase(ctx, label) {
  return [
    { id: "showcase-title", text: { text: "组件总览", style: "PLUGIN_TEXT_STYLE_TITLE" } },
    { id: "showcase-subtitle", text: { text: "以下按组件类型逐个展示，方便检查 dashboard widget 和详情页的一致渲染。", style: "PLUGIN_TEXT_STYLE_SUBTITLE" } },
    {
      id: "component-stack",
      card: {
        appearance: { accent: demoAccent(ctx), variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
        children: [
          { id: "stack-label", text: { text: "Stack", style: "PLUGIN_TEXT_STYLE_TITLE" } },
          {
            id: "stack-sample",
            stack: {
              axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL",
              spacing: 8,
              children: [
                { id: "stack-icon", icon: { name: "square.stack.3d.up.fill", appearance: { accent: demoAccent(ctx) } } },
                { id: "stack-text", text: { text: "横向/纵向组合容器", style: "PLUGIN_TEXT_STYLE_BODY" } },
                { id: "stack-badge", badge: { text: "stack", appearance: { accent: demoAccent(ctx) } } }
              ]
            }
          }
        ]
      }
    },
    {
      id: "component-grid",
      card: {
        children: [
          { id: "grid-label", text: { text: "Grid", style: "PLUGIN_TEXT_STYLE_TITLE" } },
          {
            id: "grid-sample",
            grid: {
              columns: 2,
              spacing: 8,
              appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
              children: [
                { id: "grid-cpu", value: { title: "CPU", value: { number: 0.32, format: "PLUGIN_VALUE_FORMAT_PERCENT" }, appearance: { accent: demoAccent(ctx), icon: "cpu" } } },
                { id: "grid-mem", value: { title: "内存", value: { number: 0.56, format: "PLUGIN_VALUE_FORMAT_PERCENT" }, appearance: { accent: "PLUGIN_ACCENT_GREEN", icon: "memorychip" } } }
              ]
            }
          }
        ]
      }
    },
    {
      id: "component-card",
      card: {
        appearance: { accent: "PLUGIN_ACCENT_TEAL", variant: "PLUGIN_COMPONENT_VARIANT_FILLED" },
        children: [
          { id: "card-title", text: { text: "Card", style: "PLUGIN_TEXT_STYLE_TITLE" } },
          { id: "card-body", text: { text: "卡片容器，可包裹任意子组件并承载点击动作。", style: "PLUGIN_TEXT_STYLE_BODY" } }
        ],
        onTap: { plugin: { actionId: "refresh" } }
      }
    },
    { id: "component-text", text: { text: "Text：标题、副标题、正文、说明、数值文本", style: "PLUGIN_TEXT_STYLE_BODY", appearance: { accent: demoAccent(ctx) } } },
    { id: "component-value", value: { title: "Value", subtitle: "标题 + 数值 + 趋势", value: { number: 0.724, format: "PLUGIN_VALUE_FORMAT_PERCENT", trend: 3.4, status: "PLUGIN_STATUS_HEALTHY" }, appearance: { accent: demoAccent(ctx), icon: "gauge.medium" } } },
    { id: "component-badge", badge: { text: "Badge", value: { text: "运行中", status: "PLUGIN_STATUS_RUNNING" }, appearance: { accent: "PLUGIN_ACCENT_GREEN" } } },
    { id: "component-button", button: { title: "Button", subtitle: "点击触发插件 action", appearance: { accent: demoAccent(ctx), icon: "bolt.circle", variant: "PLUGIN_COMPONENT_VARIANT_FILLED" }, onTap: { plugin: { actionId: "refresh" } } } },
    {
      id: "component-list",
      list: {
        title: "List",
        items: [
          { title: "第一项", subtitle: "带状态和值", value: { text: "正常", status: "PLUGIN_STATUS_HEALTHY" }, appearance: { accent: "PLUGIN_ACCENT_GREEN", icon: "checkmark.circle" } },
          { title: "第二项", subtitle: "可点击", value: { text: "查看" }, appearance: { accent: demoAccent(ctx), icon: "arrow.right.circle" }, onTap: { plugin: { actionId: "openDetail" } } }
        ],
        appearance: { accent: demoAccent(ctx), variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
      }
    },
    { id: "component-progress", progress: { title: "Progress", subtitle: "0 到 1 的线性进度", value: { number: 0.58, format: "PLUGIN_VALUE_FORMAT_PERCENT", status: "PLUGIN_STATUS_RUNNING" }, progress: 0.58, appearance: { accent: demoAccent(ctx), icon: "speedometer" } } },
    { id: "component-line-chart", chart: { title: "Chart Line", kind: "PLUGIN_CHART_KIND_LINE", points: demoPoints(), options: { min: 0, max: 100, showLabels: true }, appearance: { accent: demoAccent(ctx) } } },
    { id: "component-area-chart", chart: { title: "Chart Area", kind: "PLUGIN_CHART_KIND_AREA", points: demoMemoryPoints(), options: { min: 0, max: 100, showLabels: true }, appearance: { accent: "PLUGIN_ACCENT_GREEN" } } },
    { id: "component-bar-chart", chart: { title: "Chart Bar", kind: "PLUGIN_CHART_KIND_BAR", points: demoPoints().slice(0, 6), options: { min: 0, max: 100, showLabels: true }, appearance: { accent: "PLUGIN_ACCENT_ORANGE" } } },
    { id: "component-donut-chart", chart: { title: "Chart Donut", kind: "PLUGIN_CHART_KIND_DONUT", points: [{ label: "A", value: 40 }, { label: "B", value: 35 }, { label: "C", value: 25 }], appearance: { accent: "PLUGIN_ACCENT_PURPLE" } } },
    { id: "component-gauge-chart", chart: { title: "Chart Gauge", kind: "PLUGIN_CHART_KIND_GAUGE", points: [{ label: "使用率", value: 58 }], options: { min: 0, max: 100 }, appearance: { accent: demoAccent(ctx) } } },
    { id: "component-segmented-gauge", segmentedGauge: { title: "Segmented Gauge", segments: demoMemorySegments(), centerValue: { number: 0.56, format: "PLUGIN_VALUE_FORMAT_PERCENT" }, showLegend: true, appearance: { accent: demoAccent(ctx) } } },
    {
      id: "component-table",
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
    },
    {
      id: "component-description-list",
      descriptionList: {
        title: "Description List",
        columns: 2,
        items: [
          { title: "插件", value: { text: label } },
          { title: "版本", value: { text: "1.0.10" } },
          { title: "入口", value: { text: ctx.surface || "detail" } },
          { title: "动作", value: { text: "受控 Action" } }
        ],
        appearance: { accent: demoAccent(ctx) }
      }
    },
    {
      id: "component-form",
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
    },
    { id: "component-action-menu", actionMenu: { title: "Action Menu", items: [{ title: "刷新", onTap: { plugin: { actionId: "refresh" } } }, { title: "危险操作", destructive: true, onTap: { plugin: { actionId: "refresh" } } }], appearance: { accent: demoAccent(ctx), icon: "ellipsis.circle" } } },
    { id: "component-confirm", confirm: { title: "Confirm", message: "确认组件用于危险操作二次确认。", confirmTitle: "确认", cancelTitle: "取消", destructive: true, onConfirm: { plugin: { actionId: "refresh" } }, appearance: { accent: "PLUGIN_ACCENT_RED", icon: "checkmark.shield" } } },
    {
      id: "component-tabs",
      tabs: {
        selectedId: "first",
        tabs: [
          { id: "first", title: "Tab A", children: [{ id: "tab-a-text", text: { text: "Tabs：分段展示一组子组件", style: "PLUGIN_TEXT_STYLE_BODY" } }] },
          { id: "second", title: "Tab B", children: [{ id: "tab-b-badge", badge: { text: "第二页", appearance: { accent: "PLUGIN_ACCENT_PURPLE" } } }] }
        ],
        appearance: { accent: demoAccent(ctx), variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
      }
    },
    {
      id: "component-disclosure",
      disclosure: {
        title: "Disclosure",
        subtitle: "折叠区块",
        expanded: true,
        children: [{ id: "disclosure-text", text: { text: "这里可以继续组合任意组件。", style: "PLUGIN_TEXT_STYLE_BODY" } }],
        appearance: { accent: demoAccent(ctx) }
      }
    },
    { id: "component-state-empty", stateBlock: { kind: "PLUGIN_STATE_KIND_EMPTY", title: "State Empty", message: "空状态展示。", appearance: { accent: "PLUGIN_ACCENT_GRAY" } } },
    { id: "component-state-loading", stateBlock: { kind: "PLUGIN_STATE_KIND_LOADING", title: "State Loading", message: "加载状态展示。", appearance: { accent: demoAccent(ctx) } } },
    { id: "component-state-error", stateBlock: { kind: "PLUGIN_STATE_KIND_ERROR", title: "State Error", message: "错误状态展示。", appearance: { accent: "PLUGIN_ACCENT_RED" } } },
    { id: "component-code-block", codeBlock: { title: "Code Block", language: "json", wrap: true, code: JSON.stringify({ ok: true, component: "codeBlock" }, null, 2), appearance: { accent: demoAccent(ctx) } } },
    {
      id: "component-icon-image",
      card: {
        children: [
          { id: "icon-title", text: { text: "Icon / Image", style: "PLUGIN_TEXT_STYLE_TITLE" } },
          { id: "icon-sample", icon: { name: "shippingbox.fill", appearance: { accent: demoAccent(ctx), size: "PLUGIN_COMPONENT_SIZE_LARGE" } } },
          { id: "image-sample", image: { url: "https://dummyimage.com/600x240/2563eb/ffffff.png&text=Plugin+Image", mode: "fit", appearance: { size: "PLUGIN_COMPONENT_SIZE_REGULAR" } } }
        ],
        appearance: { accent: demoAccent(ctx) }
      }
    },
    {
      id: "component-divider-spacer",
      card: {
        children: [
          { id: "divider-spacer-title", text: { text: "Divider / Spacer", style: "PLUGIN_TEXT_STYLE_TITLE" } },
          { id: "divider-before", text: { text: "上方内容", style: "PLUGIN_TEXT_STYLE_CAPTION" } },
          { id: "divider-sample", divider: {} },
          { id: "spacer-sample", spacer: { length: 12 } },
          { id: "divider-after", text: { text: "下方内容", style: "PLUGIN_TEXT_STYLE_CAPTION" } }
        ],
        appearance: { accent: "PLUGIN_ACCENT_GRAY" }
      }
    }
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
    title: "NAS 示例插件",
    components: [
      {
        id: "summary-card",
        card: {
          appearance: { accent: demoAccent(ctx), variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
          onTap: { plugin: { actionId: "openDetail" } },
          children: [
            {
              id: "summary-title",
              stack: {
                axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL",
                spacing: 8,
                children: [
                  { id: "summary-icon", icon: { name: "shippingbox.fill", appearance: { accent: demoAccent(ctx) } } },
                  { id: "summary-text", text: { text: label + " 运行概览", style: "PLUGIN_TEXT_STYLE_TITLE" } },
                  { id: "summary-state", badge: { text: "运行中", value: { status: "PLUGIN_STATUS_RUNNING" }, appearance: { accent: "PLUGIN_ACCENT_GREEN" } } }
                ]
              }
            },
            {
              id: "load",
              progress: {
                title: "模拟负载",
                subtitle: "Goja 生成的 dashboard 组件",
                value: { number: 0.58, unit: "%", format: "PLUGIN_VALUE_FORMAT_PERCENT", status: "PLUGIN_STATUS_HEALTHY" },
                progress: 0.58,
                appearance: { accent: demoAccent(ctx), icon: "speedometer" },
                onTap: { plugin: { actionId: "refresh" } }
              }
            }
          ]
        }
      },
      {
        id: "metrics",
        grid: {
          columns: 2,
          spacing: 8,
          appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
          children: [
            { id: "cpu", value: { title: "CPU 使用率", value: { number: 32.4, unit: "%", format: "PLUGIN_VALUE_FORMAT_PERCENT", trend: 5.2, status: "PLUGIN_STATUS_HEALTHY" }, appearance: { accent: demoAccent(ctx), icon: "cpu" }, onTap: { plugin: { actionId: "openDetail" } } } },
            { id: "memory", value: { title: "内存使用率", subtitle: "系统内存占用情况", value: { number: 56, unit: "%", format: "PLUGIN_VALUE_FORMAT_PERCENT", trend: 3.1, status: "PLUGIN_STATUS_RUNNING" }, appearance: { accent: "PLUGIN_ACCENT_GREEN", icon: "memorychip" } } },
            { id: "io", value: { title: "磁盘 IO", subtitle: "读写吞吐趋势", value: { number: 32.4, unit: "%", format: "PLUGIN_VALUE_FORMAT_PERCENT", trend: 5.2, status: "PLUGIN_STATUS_HEALTHY" }, appearance: { accent: demoAccent(ctx), icon: "internaldrive" } } }
          ]
        }
      },
      {
        id: "open-detail",
        button: {
          title: "打开详情",
          subtitle: "测试 toast + navigate effects",
          appearance: { accent: "PLUGIN_ACCENT_BLUE", icon: "arrow.right.circle", variant: "PLUGIN_COMPONENT_VARIANT_FILLED" },
          onTap: { plugin: { actionId: "openDetail" } }
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