function displayName(ctx) {
  return (ctx.config && ctx.config.display_name) || "家庭服务器";
}

function points() {
  return [
    { label: "10:00", value: 28 },
    { label: "10:05", value: 43 },
    { label: "10:10", value: 35 },
    { label: "10:15", value: 52 }
  ];
}

function statusCard(ctx, compact) {
  const children = [
    {
      id: "header",
      stack: {
        axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL",
        spacing: 8,
        children: [
          {
            id: "icon",
            icon: {
              appearance: {
                accent: "PLUGIN_ACCENT_TEAL",
                iconSource: { systemName: "server.rack" }
              }
            }
          },
          {
            id: "name",
            text: { text: displayName(ctx), style: "PLUGIN_TEXT_STYLE_TITLE" }
          },
          {
            id: "health",
            badge: {
              text: "在线",
              value: { status: "PLUGIN_STATUS_HEALTHY" },
              appearance: { accent: "PLUGIN_ACCENT_GREEN" }
            }
          }
        ]
      }
    },
    {
      id: "memory",
      progress: {
        title: "内存",
        subtitle: "8.9 GB / 16 GB",
        progress: 0.56,
        value: { number: 0.56, format: "PLUGIN_VALUE_FORMAT_PERCENT" },
        appearance: {
          accent: "PLUGIN_ACCENT_PURPLE",
          iconSource: { systemName: "memorychip" }
        }
      }
    }
  ];

  if (!compact) {
    children.splice(1, 0, {
      id: "cpu-chart",
      chart: {
        title: "CPU 使用率",
        kind: "PLUGIN_CHART_KIND_LINE",
        points: points(),
        options: { min: 0, max: 100, showLabels: true, hideRange: true },
        appearance: { accent: "PLUGIN_ACCENT_BLUE" }
      }
    });
  }

  return {
    id: "status-card",
    card: {
      appearance: { variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
      children: children,
      onTap: { navigate: { surface: "detail", route: "overview" } }
    }
  };
}

globalThis.dashboard = function (ctx) {
  return { title: "服务状态", components: [statusCard(ctx, false)] };
};

globalThis.detail = function (ctx) {
  return {
    title: displayName(ctx),
    components: [
      statusCard(ctx, false),
      {
        id: "info",
        descriptionList: {
          title: "运行信息",
          columns: 2,
          items: [
            { title: "状态", value: { text: "健康", status: "PLUGIN_STATUS_HEALTHY" } },
            { title: "版本", value: { text: "1.0.0" } }
          ]
        }
      },
      {
        id: "open-sheet",
        button: {
          title: "查看操作",
          appearance: {
            accent: "PLUGIN_ACCENT_BLUE",
            variant: "PLUGIN_COMPONENT_VARIANT_FILLED",
            iconSource: { systemName: "rectangle.bottomhalf.inset.filled" }
          },
          onTap: {
            navigate: {
              surface: "sheet",
              route: "actions",
              detents: ["compact", "medium", "large"],
              initialDetent: "medium"
            }
          }
        }
      },
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
          onChange: { plugin: { actionId: "setAlerts" } }
        }
      }
    ]
  };
};

globalThis.sheet = function (ctx) {
  return {
    title: "服务操作",
    components: [
      {
        id: "sheet-title",
        stateBlock: {
          kind: "PLUGIN_STATE_KIND_EMPTY",
          title: displayName(ctx) + " 运行正常",
          message: "这是由插件返回、App 原生展示的半弹层。",
          appearance: {
            accent: "PLUGIN_ACCENT_GREEN",
            iconSource: { systemName: "checkmark.circle.fill" }
          }
        }
      },
      {
        id: "refresh",
        button: {
          title: "刷新状态",
          onTap: { plugin: { actionId: "refresh" } }
        }
      }
    ]
  };
};

globalThis.widget = function (ctx) {
  const compact = ctx.widgetSize === "small";
  return { title: "服务摘要", components: [statusCard(ctx, compact)] };
};

globalThis.actions = {
  setAlerts: function (ctx) {
    return {
      effects: [
        { toast: { text: ctx.params.value === "true" ? "通知已开启" : "通知已关闭", level: "success" } }
      ]
    };
  },
  refresh: function () {
    return {
      effects: [
        { toast: { text: "状态已刷新", level: "success" } },
        { refresh: { surface: "current" } }
      ]
    };
  }
};
