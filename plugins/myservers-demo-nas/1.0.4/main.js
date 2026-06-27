function demoLabel(ctx) {
  return (ctx.config && ctx.config.host_label) || "NAS";
}

function demoAccent(ctx) {
  return (ctx.config && ctx.config.accent) || "blue";
}

function demoPoints() {
  return [
    { label: "09:00", value: 32 },
    { label: "10:00", value: 41 },
    { label: "11:00", value: 37 },
    { label: "12:00", value: 52 },
    { label: "13:00", value: 46 }
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
        id: "load",
        progressCard: {
          title: "模拟负载",
          subtitle: "Goja 生成的 dashboard 组件",
          value: { number: 0.58, unit: "%", format: "percent", status: "PLUGIN_STATUS_HEALTHY" },
          progress: 0.58,
          appearance: { accent: demoAccent(ctx), icon: "speedometer", variant: "tinted" },
          onTap: { plugin: { actionId: "refresh" } }
        }
      },
      {
        id: "status",
        statusBadge: {
          title: "插件状态",
          value: { text: "运行中", status: "PLUGIN_STATUS_RUNNING" },
          appearance: { accent: "green", icon: "play.circle.fill", variant: "tinted" }
        }
      },
      {
        id: "metrics",
        metricGrid: {
          title: "指标",
          appearance: { accent: demoAccent(ctx), variant: "tinted", hideBackground: true },
          metrics: [
            { title: "配置名称", value: { text: label }, appearance: { accent: demoAccent(ctx) } },
            { title: "组件数", value: { number: 8, unit: "个", format: "number" }, appearance: { accent: "purple" } },
            { title: "执行端", value: { text: "NAS" }, appearance: { accent: "green" } }
          ]
        }
      },
      {
        id: "open-detail",
        actionButton: {
          title: "打开详情",
          subtitle: "测试 toast + navigate effects",
          appearance: { accent: "blue", icon: "arrow.right.circle", variant: "filled" },
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
        progressCard: {
          title: "模拟负载",
          value: { number: 0.58, unit: "%", format: "percent", status: "PLUGIN_STATUS_HEALTHY" },
          progress: 0.58,
          appearance: { accent: demoAccent(ctx), icon: "speedometer", variant: "tinted" }
        }
      },
      {
        id: "background",
        infoCard: {
          title: "后台刷新次数",
          value: { text: String(globalThis.demoBackgroundCount) },
          subtitle: "由 background(ctx) 更新",
          appearance: { accent: "green", icon: "clock.arrow.circlepath", variant: "tinted" }
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
        infoCard: {
          title: "当前配置",
          subtitle: "这个值来自安装时的配置表单",
          value: { text: label },
          appearance: { accent: demoAccent(ctx), icon: "gearshape", variant: "tinted" }
        }
      },
      {
        id: "trend",
        lineChart: {
          title: "模拟趋势",
          points: demoPoints(),
          appearance: { accent: demoAccent(ctx), icon: "chart.xyaxis.line", variant: "tinted" },
          options: { min: 0, max: 100, showLabels: true, emptyText: "暂无趋势数据" }
        }
      },
      {
        id: "checks",
        listCard: {
          title: "验证项",
          items: [
            { title: "市场列表", subtitle: "GET /plugins", value: { text: "通过", status: "PLUGIN_STATUS_HEALTHY" }, appearance: { accent: "green", icon: "list.bullet" } },
            { title: "NAS 下载", subtitle: "manifest assets + checksum", value: { text: "通过", status: "PLUGIN_STATUS_HEALTHY" }, appearance: { accent: "green", icon: "arrow.down.circle" } },
            { title: "Goja Action", subtitle: "点击按钮触发 actions.<id>(ctx)", value: { text: "待点击", status: "PLUGIN_STATUS_WARNING" }, appearance: { accent: "orange", icon: "hand.tap" } }
          ],
          appearance: { accent: demoAccent(ctx), variant: "tinted" }
        }
      },
      {
        id: "refresh",
        actionButton: {
          title: "刷新示例数据",
          subtitle: "触发 actions.refresh(ctx) 并刷新页面",
          appearance: { accent: demoAccent(ctx), icon: "arrow.clockwise", variant: "filled" },
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
                infoCard: {
                  title: "最近动作",
                  value: { text: "refresh", status: "PLUGIN_STATUS_HEALTHY" },
                  subtitle: "由 Goja actions.refresh(ctx) 返回",
                  appearance: { accent: demoAccent(ctx), icon: "bolt.circle", variant: "tinted" }
                }
              }
            ]
          }
        }
      ]
    };
  }
};
