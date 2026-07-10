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

function demoMetricSummaries() {
  return [
    { title: "平均", value: { number: 28.6, unit: "%", format: "percent" } },
    { title: "最高", value: { number: 52.1, unit: "%", format: "percent" } },
    { title: "最低", value: { number: 15.3, unit: "%", format: "percent" } },
    { title: "当前", value: { number: 32.4, unit: "%", format: "percent" } }
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
    components: [
      {
        id: "info",
        value: {
          title: "当前配置",
          subtitle: "这个值来自安装时的配置表单",
          value: { text: label },
          appearance: { accent: demoAccent(ctx), icon: "gearshape", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
        }
      },
      {
        id: "trend",
        chart: {
          title: "模拟趋势",
          kind: "PLUGIN_CHART_KIND_LINE",
          points: demoPoints(),
          appearance: { accent: demoAccent(ctx), icon: "chart.xyaxis.line", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
          options: { min: 0, max: 100, showLabels: true, emptyText: "暂无趋势数据" }
        }
      },
      {
        id: "checks",
        list: {
          title: "验证项",
          items: [
            { title: "市场列表", subtitle: "GET /plugins", value: { text: "通过", status: "PLUGIN_STATUS_HEALTHY" }, appearance: { accent: "PLUGIN_ACCENT_GREEN", icon: "list.bullet" } },
            { title: "NAS 下载", subtitle: "manifest assets + checksum", value: { text: "通过", status: "PLUGIN_STATUS_HEALTHY" }, appearance: { accent: "PLUGIN_ACCENT_GREEN", icon: "arrow.down.circle" } },
            { title: "Goja Action", subtitle: "点击按钮触发 actions.<id>(ctx)", value: { text: "待点击", status: "PLUGIN_STATUS_WARNING" }, appearance: { accent: "PLUGIN_ACCENT_ORANGE", icon: "hand.tap" } }
          ],
          appearance: { accent: demoAccent(ctx), variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
        }
      },
      {
        id: "process-table",
        table: {
          title: "通用表格",
          columns: [
            { key: "name", title: "名称" },
            { key: "status", title: "状态", width: "PLUGIN_COMPONENT_SIZE_COMPACT" },
            { key: "usage", title: "占用", format: "PLUGIN_VALUE_FORMAT_PERCENT", width: "PLUGIN_COMPONENT_SIZE_COMPACT" }
          ],
          rows: [
            { id: "docker", values: { name: { text: "Docker" }, status: { text: "运行中", status: "PLUGIN_STATUS_RUNNING" }, usage: { number: 0.32, format: "PLUGIN_VALUE_FORMAT_PERCENT" } }, status: "PLUGIN_STATUS_RUNNING" },
            { id: "backup", values: { name: { text: "Backup" }, status: { text: "空闲" }, usage: { number: 0.04, format: "PLUGIN_VALUE_FORMAT_PERCENT" } }, status: "PLUGIN_STATUS_HEALTHY" }
          ],
          appearance: { accent: demoAccent(ctx), variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
        }
      },
      {
        id: "runtime-info",
        descriptionList: {
          title: "通用键值详情",
          columns: 2,
          items: [
            { title: "插件版本", value: { text: "1.0.8" } },
            { title: "配置名称", value: { text: label } },
            { title: "渲染入口", value: { text: ctx.surface || "detail" } },
            { title: "动作模型", value: { text: "受控 Action" } }
          ],
          appearance: { accent: demoAccent(ctx) }
        }
      },
      {
        id: "component-tabs",
        tabs: {
          selectedId: "state",
          tabs: [
            {
              id: "state",
              title: "状态",
              children: [
                { id: "empty-state", stateBlock: { kind: "PLUGIN_STATE_KIND_EMPTY", title: "暂无告警", message: "这是通用状态块，不绑定 NAS 业务。", appearance: { accent: "PLUGIN_ACCENT_GREEN" } } }
              ]
            },
            {
              id: "raw",
              title: "文本",
              children: [
                { id: "raw-json", codeBlock: { title: "结构化输出", language: "json", wrap: true, code: '{\\n  "ok": true,\\n  "source": "goja"\\n}' } }
              ]
            }
          ],
          appearance: { accent: demoAccent(ctx), variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
        }
      },
      {
        id: "advanced-section",
        disclosure: {
          title: "高级组件",
          subtitle: "折叠区块里可以继续组合任意组件",
          expanded: false,
          children: [
            { id: "usage-gauge", chart: { title: "Gauge 图表", kind: "PLUGIN_CHART_KIND_GAUGE", points: [{ label: "使用率", value: 58 }], options: { min: 0, max: 100 }, appearance: { accent: demoAccent(ctx) } } },
            { id: "action-menu", actionMenu: { title: "操作菜单", items: [{ title: "刷新", onTap: { plugin: { actionId: "refresh" } } }, { title: "危险操作示例", destructive: true, onTap: { plugin: { actionId: "refresh" } } }] } },
            { id: "confirm-action", confirm: { title: "确认动作", message: "通用确认组件可包裹危险操作。", confirmTitle: "确认", destructive: true, onConfirm: { plugin: { actionId: "refresh" } } } }
          ],
          appearance: { accent: demoAccent(ctx) }
        }
      },
      {
        id: "refresh",
        button: {
          title: "刷新示例数据",
          subtitle: "触发 actions.refresh(ctx) 并刷新页面",
          appearance: { accent: demoAccent(ctx), icon: "arrow.clockwise", variant: "PLUGIN_COMPONENT_VARIANT_FILLED" },
          onTap: { plugin: { actionId: "refresh" } }
        }
      }
    ]
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
