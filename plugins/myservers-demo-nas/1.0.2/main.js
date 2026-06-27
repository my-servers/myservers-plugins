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
        id: "summary",
        section: {
          title: label + " 概览",
          children: [
            {
              id: "load",
              progressCard: {
                title: "模拟负载",
                subtitle: "Goja 生成的 dashboard 组件",
                value: 0.58,
                unit: "%",
                accent: demoAccent(ctx),
                onTap: { actionId: "refresh" }
              }
            },
            {
              id: "status",
              statusBadge: {
                title: "插件状态",
                value: "运行中",
                status: "healthy",
                accent: "green"
              }
            }
          ]
        }
      },
      {
        id: "metrics",
        metricGrid: {
          title: "指标",
          metrics: [
            { title: "配置名称", value: label, unit: "", accent: demoAccent(ctx) },
            { title: "组件数", value: "8", unit: "个", accent: "purple" },
            { title: "执行端", value: "NAS", unit: "", accent: "green" }
          ]
        }
      },
      {
        id: "open-detail",
        actionButton: {
          title: "打开详情",
          subtitle: "测试 toast + navigate effects",
          icon: "arrow.right.circle",
          onTap: { actionId: "openDetail", route: "detail" }
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
          value: 0.58,
          unit: "%",
          accent: demoAccent(ctx)
        }
      },
      {
        id: "background",
        infoCard: {
          title: "后台刷新次数",
          value: String(globalThis.demoBackgroundCount),
          subtitle: "由 background(ctx) 更新",
          accent: "green"
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
          value: label,
          accent: demoAccent(ctx)
        }
      },
      {
        id: "trend",
        lineChart: {
          title: "模拟趋势",
          points: demoPoints(),
          accent: demoAccent(ctx)
        }
      },
      {
        id: "checks",
        listCard: {
          title: "验证项",
          items: [
            { title: "市场列表", subtitle: "GET /plugins", value: "通过", status: "healthy", icon: "list.bullet" },
            { title: "NAS 下载", subtitle: "manifest assets + checksum", value: "通过", status: "healthy", icon: "arrow.down.circle" },
            { title: "Goja Action", subtitle: "点击按钮触发 actions.<id>(ctx)", value: "待点击", status: "warning", icon: "hand.tap" }
          ]
        }
      },
      {
        id: "refresh",
        actionButton: {
          title: "刷新示例数据",
          subtitle: "触发 actions.refresh(ctx) 并刷新页面",
          icon: "arrow.clockwise",
          onTap: { actionId: "refresh" }
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
            components: [
              {
                id: "last-action",
                infoCard: {
                  title: "最近动作",
                  value: "refresh",
                  subtitle: "由 Goja actions.refresh(ctx) 返回",
                  accent: demoAccent(ctx)
                }
              }
            ]
          }
        }
      ]
    };
  }
};
