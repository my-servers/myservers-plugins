function sheetComponents(route) {
  return [
    { id: "sheet-route", text: { text: "Route: " + route, style: "PLUGIN_TEXT_STYLE_TITLE" } },
    { id: "sheet-value", value: { title: "Sheet", value: { text: "ready" } } },
    { id: "sheet-refresh", button: { title: "Refresh", onTap: { plugin: { actionId: "sheetRefresh" } } } },
    { id: "sheet-next", button: { title: "Next Sheet", onTap: { plugin: { actionId: "nextSheet" } } } },
    { id: "sheet-detail", button: { title: "Open Detail", onTap: { plugin: { actionId: "openDetail" } } } }
  ];
}

globalThis.dashboard = function() {
  return {
    title: "Sheet Demo",
    components: [{ id: "open-sheet", button: {
      title: "Open Bottom Sheet",
      onTap: { navigate: {
        surface: "sheet",
        route: "sheet-demo",
        detents: ["compact", "medium", "large"],
        initialDetent: "compact"
      } }
    } }]
  };
};

globalThis.detail = function(ctx) {
  return { title: "Detail", components: sheetComponents(ctx.route || "detail") };
};

globalThis.sheet = function(ctx) {
  return { title: "Bottom Sheet", components: sheetComponents(ctx.route || "sheet") };
};

globalThis.actions = {
  sheetRefresh: function(ctx) {
    return { effects: [
      { toast: { text: ctx.surface + ":" + ctx.route, level: "success" } },
      { refresh: { surface: "sheet" } }
    ] };
  },
  nextSheet: function() {
    return { effects: [{ navigate: {
      surface: "sheet",
      route: "sheet-second",
      detents: ["medium", "large"],
      initialDetent: "medium"
    } }] };
  },
  openDetail: function() {
    return { effects: [{ navigate: { surface: "detail", route: "sheet-detail" } }] };
  }
};
