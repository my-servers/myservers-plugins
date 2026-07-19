var HA_CACHE_KEY = "home-assistant-snapshot-v1";
var HA_CACHE_TTL_MS = 15000;
var HA_CACHE_BACKGROUND_TTL_MS = 120000;
var HA_PAGE_SIZE = 30;
var HA_LOGO_URL = "https://www.home-assistant.io/images/favicon-192x192.png";

var DOMAIN_ORDER = [
  "light", "switch", "climate", "cover", "fan", "media_player", "lock",
  "sensor", "binary_sensor", "person", "device_tracker", "weather",
  "scene", "script", "automation", "input_boolean", "input_number", "number", "button"
];

var DOMAIN_LABELS = {
  light: "灯光",
  switch: "开关",
  climate: "温控",
  cover: "窗帘与门",
  fan: "风扇",
  media_player: "媒体播放器",
  lock: "门锁",
  sensor: "传感器",
  binary_sensor: "二元传感器",
  person: "家庭成员",
  device_tracker: "设备位置",
  weather: "天气",
  scene: "场景",
  script: "脚本",
  automation: "自动化",
  input_boolean: "布尔助手",
  input_number: "数值助手",
  number: "数值控制",
  button: "按钮"
};

var DOMAIN_ICONS = {
  light: "lightbulb.fill",
  switch: "switch.2",
  climate: "thermometer.medium",
  cover: "window.shade.open",
  fan: "fan.fill",
  media_player: "play.rectangle.fill",
  lock: "lock.fill",
  sensor: "waveform.path.ecg",
  binary_sensor: "dot.radiowaves.left.and.right",
  person: "person.fill",
  device_tracker: "location.fill",
  weather: "cloud.sun.fill",
  scene: "sparkles",
  script: "play.square.stack.fill",
  automation: "gearshape.2.fill",
  input_boolean: "checkmark.circle.fill",
  input_number: "number.circle.fill",
  number: "number.circle.fill",
  button: "button.programmable"
};

var DOMAIN_ACCENTS = {
  light: "PLUGIN_ACCENT_ORANGE",
  switch: "PLUGIN_ACCENT_BLUE",
  climate: "PLUGIN_ACCENT_RED",
  cover: "PLUGIN_ACCENT_TEAL",
  fan: "PLUGIN_ACCENT_INDIGO",
  media_player: "PLUGIN_ACCENT_PURPLE",
  lock: "PLUGIN_ACCENT_GREEN",
  sensor: "PLUGIN_ACCENT_BLUE",
  binary_sensor: "PLUGIN_ACCENT_TEAL",
  person: "PLUGIN_ACCENT_PURPLE",
  device_tracker: "PLUGIN_ACCENT_INDIGO",
  weather: "PLUGIN_ACCENT_BLUE",
  scene: "PLUGIN_ACCENT_ORANGE",
  script: "PLUGIN_ACCENT_INDIGO",
  automation: "PLUGIN_ACCENT_GREEN",
  input_boolean: "PLUGIN_ACCENT_GREEN",
  input_number: "PLUGIN_ACCENT_BLUE",
  number: "PLUGIN_ACCENT_BLUE",
  button: "PLUGIN_ACCENT_ORANGE"
};

function configValue(ctx, key) {
  if (!ctx.config || ctx.config[key] === undefined || ctx.config[key] === null) return "";
  return String(ctx.config[key]).trim();
}

function configEnabled(ctx, key, fallback) {
  var value = configValue(ctx, key).toLowerCase();
  if (!value) return fallback;
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function actionParam(ctx, key) {
  if (!ctx.params || ctx.params[key] === undefined || ctx.params[key] === null) return "";
  return String(ctx.params[key]).trim();
}

function safeNumber(value, fallback) {
  var number = Number(value);
  return isFinite(number) ? number : (fallback === undefined ? 0 : fallback);
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(safeNumber(value, minimum), minimum), maximum);
}

function baseURL(ctx) {
  var value = configValue(ctx, "base_url");
  if (!value) throw new Error("请先配置 Home Assistant 地址");
  if (!/^https?:\/\//i.test(value)) throw new Error("Home Assistant 地址必须以 http:// 或 https:// 开头");
  value = value.replace(/\/+$/, "");
  value = value.replace(/\/api$/i, "");
  return value;
}

function accessToken(ctx) {
  var token = configValue(ctx, "token");
  if (!token) throw new Error("请先配置 Home Assistant 长期访问令牌");
  return token;
}

function responseMessage(response, fallback) {
  if (response && response.json && response.json.message) return String(response.json.message);
  if (response && response.body) {
    var body = String(response.body).trim();
    if (body) return body.length > 180 ? body.slice(0, 180) + "…" : body;
  }
  return fallback;
}

function haRequest(ctx, path, method, payload) {
  if (!ctx.http || !ctx.http.request) throw new Error("插件尚未获得网络访问权限");
  var response = ctx.http.request({
    url: baseURL(ctx) + path,
    method: method || "GET",
    headers: {
      authorization: "Bearer " + accessToken(ctx),
      accept: "application/json",
      "content-type": "application/json"
    },
    body: payload === undefined || payload === null ? "" : JSON.stringify(payload)
  });
  if (response.status === 401) throw new Error("访问令牌无效或已失效");
  if (response.status === 403) throw new Error("当前令牌没有执行此操作的权限");
  if (response.status < 200 || response.status >= 300) {
    throw new Error(responseMessage(response, "Home Assistant 返回 HTTP " + response.status));
  }
  return response.json === undefined || response.json === null ? response.body : response.json;
}

function serviceCall(ctx, domain, service, data) {
  var allowedDomains = {
    light: true, switch: true, climate: true, cover: true, fan: true,
    media_player: true, lock: true, scene: true, script: true, automation: true,
    input_boolean: true, input_number: true, number: true, button: true
  };
  if (!allowedDomains[domain]) throw new Error("不支持控制此实体类型");
  if (!/^[a-z0-9_]+$/.test(service)) throw new Error("服务名称不合法");
  return haRequest(ctx, "/api/services/" + domain + "/" + service, "POST", data || {});
}

function clearSnapshot(ctx) {
  if (ctx.cache) ctx.cache.delete(HA_CACHE_KEY);
}

function loadSnapshot(ctx, force) {
  if (!force && ctx.cache) {
    var cached = ctx.cache.get(HA_CACHE_KEY);
    if (cached && Array.isArray(cached.states) && cached.config) return cached;
  }
  var config = haRequest(ctx, "/api/config", "GET");
  var states = haRequest(ctx, "/api/states", "GET");
  if (!Array.isArray(states)) throw new Error("Home Assistant 返回的实体列表格式不正确");
  var snapshot = { capturedAt: Date.now(), config: config || {}, states: states };
  if (ctx.cache) ctx.cache.set(HA_CACHE_KEY, snapshot, { ttlMs: force ? HA_CACHE_BACKGROUND_TTL_MS : HA_CACHE_TTL_MS });
  return snapshot;
}

function domainOf(entity) {
  var entityID = String(entity && entity.entity_id ? entity.entity_id : "");
  var separator = entityID.indexOf(".");
  return separator > 0 ? entityID.slice(0, separator) : "unknown";
}

function validEntityID(entityID) {
  return /^[a-z0-9_]+\.[a-zA-Z0-9_]+$/.test(String(entityID || ""));
}

function friendlyName(entity) {
  var attributes = entity && entity.attributes ? entity.attributes : {};
  if (attributes.friendly_name) return String(attributes.friendly_name);
  var entityID = String(entity && entity.entity_id ? entity.entity_id : "实体");
  var separator = entityID.indexOf(".");
  var raw = separator >= 0 ? entityID.slice(separator + 1) : entityID;
  return raw.replace(/_/g, " ");
}

function domainLabel(domain) {
  return DOMAIN_LABELS[domain] || domain;
}

function domainIcon(domain) {
  return DOMAIN_ICONS[domain] || "square.grid.2x2.fill";
}

function domainAccent(domain) {
  return DOMAIN_ACCENTS[domain] || "PLUGIN_ACCENT_GRAY";
}

function appearance(accent, icon, variant, iconURL) {
  return {
    accent: accent || "PLUGIN_ACCENT_BLUE",
    variant: variant || "PLUGIN_COMPONENT_VARIANT_TINTED",
    iconSource: {
      systemName: icon || "house.fill",
      url: iconURL || ""
    }
  };
}

function isUnavailable(entity) {
  var state = String(entity && entity.state !== undefined ? entity.state : "").toLowerCase();
  return state === "unavailable" || state === "unknown" || state === "none" || state === "";
}

function isOn(entity) {
  var state = String(entity && entity.state !== undefined ? entity.state : "").toLowerCase();
  return state === "on" || state === "open" || state === "home" || state === "playing" ||
    state === "heat" || state === "cool" || state === "heating" || state === "cooling" ||
    state === "unlocked" || state === "active";
}

function entityStatus(entity) {
  if (isUnavailable(entity)) return "PLUGIN_STATUS_STOPPED";
  return isOn(entity) ? "PLUGIN_STATUS_HEALTHY" : "PLUGIN_STATUS_NEUTRAL";
}

function stateLabel(entity) {
  if (!entity) return "未知";
  var state = String(entity.state === undefined ? "" : entity.state);
  var labels = {
    on: "开启", off: "关闭", open: "打开", closed: "关闭", opening: "正在打开", closing: "正在关闭",
    locked: "已锁定", unlocked: "已解锁", locking: "正在锁定", unlocking: "正在解锁",
    home: "在家", not_home: "离家", unavailable: "不可用", unknown: "未知",
    playing: "播放中", paused: "已暂停", idle: "空闲", standby: "待机",
    heat: "制热", cool: "制冷", heat_cool: "自动温控", dry: "除湿", fan_only: "送风", auto: "自动",
    active: "活动", triggered: "已触发"
  };
  var normalized = state.toLowerCase();
  var value = labels[normalized] || state;
  var unit = entity.attributes && entity.attributes.unit_of_measurement ? String(entity.attributes.unit_of_measurement) : "";
  return value + unit;
}

function entitySubtitle(entity) {
  var attributes = entity && entity.attributes ? entity.attributes : {};
  var details = [];
  if (attributes.device_class) details.push(String(attributes.device_class).replace(/_/g, " "));
  if (attributes.current_temperature !== undefined) details.push("当前 " + String(attributes.current_temperature) + "°");
  else if (attributes.brightness !== undefined && entity.state === "on") details.push("亮度 " + Math.round(clamp(attributes.brightness, 0, 255) / 255 * 100) + "%");
  else if (attributes.current_position !== undefined) details.push("位置 " + Math.round(safeNumber(attributes.current_position)) + "%");
  else if (attributes.source) details.push(String(attributes.source));
  if (!details.length) details.push(String(entity.entity_id || ""));
  return details.join(" · ");
}

function statusBlock(kind, title, message, actionTitle) {
  return {
    id: "ha-state",
    stateBlock: {
      kind: kind,
      title: title,
      message: message,
      actionTitle: actionTitle || "重试",
      action: { plugin: { actionId: "refresh" } },
      appearance: appearance("PLUGIN_ACCENT_ORANGE", "exclamationmark.triangle.fill")
    }
  };
}

function errorPage(error) {
  var message = error && error.message ? String(error.message) : String(error || "连接失败");
  return {
    title: "Home Assistant",
    components: [statusBlock("PLUGIN_STATE_KIND_ERROR", "无法连接 Home Assistant", message, "重新连接")]
  };
}

function groupedStates(states) {
  var grouped = {};
  for (var index = 0; index < states.length; index += 1) {
    var entity = states[index] || {};
    var domain = domainOf(entity);
    if (!grouped[domain]) grouped[domain] = [];
    grouped[domain].push(entity);
  }
  return grouped;
}

function sortedDomains(grouped) {
  var keys = Object.keys(grouped || {});
  keys.sort(function (left, right) {
    var leftIndex = DOMAIN_ORDER.indexOf(left);
    var rightIndex = DOMAIN_ORDER.indexOf(right);
    if (leftIndex < 0) leftIndex = 1000;
    if (rightIndex < 0) rightIndex = 1000;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return left.localeCompare(right);
  });
  return keys;
}

function findEntity(states, entityID) {
  for (var index = 0; index < states.length; index += 1) {
    if (String(states[index].entity_id || "") === entityID) return states[index];
  }
  return null;
}

function dashboardPage(ctx, snapshot) {
  var states = snapshot.states;
  var unavailable = 0;
  var active = 0;
  for (var index = 0; index < states.length; index += 1) {
    if (isUnavailable(states[index])) unavailable += 1;
    else if (isOn(states[index])) active += 1;
  }
  var healthy = states.length > 0 && unavailable === 0;
  var name = String(snapshot.config.location_name || "Home Assistant");
  return {
    title: "",
    components: [
      {
        id: "ha-dashboard-summary",
        value: {
          title: name,
          subtitle: states.length + " 个实体 · " + active + " 个活动",
          value: {
            text: states.length === 0 ? "暂无实体" : (unavailable > 0 ? unavailable + " 个不可用" : "运行正常"),
            status: healthy ? "PLUGIN_STATUS_HEALTHY" : "PLUGIN_STATUS_WARNING"
          },
          appearance: {
            accent: healthy ? "PLUGIN_ACCENT_BLUE" : "PLUGIN_ACCENT_ORANGE",
            hideBackground: true,
            iconSource: { systemName: "house.fill", url: HA_LOGO_URL }
          },
          onTap: { navigate: { surface: "detail", route: "overview" } }
        }
      }
    ]
  };
}

function summaryValue(id, title, subtitle, value, accent, icon, status) {
  return {
    id: id,
    value: {
      title: title,
      subtitle: subtitle || "",
      value: { number: safeNumber(value), format: "PLUGIN_VALUE_FORMAT_NUMBER", status: status || "PLUGIN_STATUS_NEUTRAL" },
      appearance: appearance(accent, icon)
    }
  };
}

function domainListItems(grouped) {
  var domains = sortedDomains(grouped);
  var items = [];
  for (var index = 0; index < domains.length; index += 1) {
    var domain = domains[index];
    var entities = grouped[domain] || [];
    var unavailable = 0;
    for (var entityIndex = 0; entityIndex < entities.length; entityIndex += 1) {
      if (isUnavailable(entities[entityIndex])) unavailable += 1;
    }
    items.push({
      title: domainLabel(domain),
      subtitle: unavailable > 0 ? unavailable + " 个不可用" : "全部可用",
      value: { number: entities.length, status: unavailable > 0 ? "PLUGIN_STATUS_WARNING" : "PLUGIN_STATUS_HEALTHY" },
      appearance: appearance(domainAccent(domain), domainIcon(domain)),
      onTap: { navigate: { surface: "detail", route: "domain:" + domain + ":0" } }
    });
  }
  return items;
}

function sensorItems(states, limit) {
  var result = [];
  for (var index = 0; index < states.length && result.length < limit; index += 1) {
    var entity = states[index];
    var domain = domainOf(entity);
    if (domain !== "sensor" && domain !== "weather") continue;
    if (isUnavailable(entity)) continue;
    var number = Number(entity.state);
    if (!isFinite(number) && domain !== "weather") continue;
    result.push({
      title: friendlyName(entity),
      subtitle: entitySubtitle(entity),
      value: { text: stateLabel(entity), status: entityStatus(entity) },
      appearance: appearance(domainAccent(domain), domainIcon(domain)),
      onTap: { navigate: { surface: "detail", route: "entity:" + encodeURIComponent(String(entity.entity_id || "")) } }
    });
  }
  return result;
}

var QUICK_CONTROL_DOMAINS = {
  light: true,
  switch: true,
  input_boolean: true,
  automation: true,
  fan: true,
  climate: true,
  cover: true,
  media_player: true,
  input_number: true,
  number: true,
  lock: true,
  scene: true,
  script: true,
  button: true
};

var QUICK_CONTROL_ORDER = [
  "light", "switch", "input_boolean", "fan", "climate", "cover", "media_player",
  "lock", "scene", "script", "button", "automation", "input_number", "number"
];

function quickControlRank(entity) {
  var domain = domainOf(entity);
  var rank = QUICK_CONTROL_ORDER.indexOf(domain);
  return rank < 0 ? QUICK_CONTROL_ORDER.length : rank;
}

function quickControlSubtitle(entity) {
  var attributes = entity && entity.attributes ? entity.attributes : {};
  var domain = domainOf(entity);
  if (isUnavailable(entity)) return "设备当前不可用";
  if (domain === "light" && attributes.brightness !== undefined) {
    return "亮度 " + Math.round(clamp(attributes.brightness, 0, 255) / 255 * 100) + "%";
  }
  if (domain === "fan" && attributes.percentage !== undefined) return "风速 " + Math.round(safeNumber(attributes.percentage)) + "%";
  if (domain === "climate" && attributes.current_temperature !== undefined) return "当前 " + attributeText(attributes.current_temperature) + "°";
  if (domain === "cover" && attributes.current_position !== undefined) return "位置 " + Math.round(safeNumber(attributes.current_position)) + "%";
  if (domain === "media_player" && attributes.media_title) return String(attributes.media_title);
  if (domain === "input_number" || domain === "number") return "轻触调节数值";
  if (domain === "lock") return "轻触查看控制";
  if (domain === "scene") return "轻触激活场景";
  if (domain === "script") return "轻触运行脚本";
  if (domain === "button") return "轻触执行操作";
  return isOn(entity) ? "轻触关闭" : "轻触开启";
}

function quickControlValue(entity) {
  var domain = domainOf(entity);
  if (domain === "scene") return "激活";
  if (domain === "script") return "运行";
  if (domain === "button") return "执行";
  if (domain === "input_number" || domain === "number") return stateLabel(entity);
  return stateLabel(entity);
}

function quickControlAction(ctx, entity) {
  var entityID = String(entity.entity_id || "");
  var domain = domainOf(entity);
  if (!configEnabled(ctx, "allow_controls", false) || isUnavailable(entity)) {
    return { navigate: { surface: "detail", route: "entity:" + encodeURIComponent(entityID) } };
  }
  if (domain === "light" || domain === "switch" || domain === "fan" || domain === "input_boolean" || domain === "automation") {
    return actionRef("setQuickEntityState", entityID, { value: !isOn(entity) });
  }
  if (domain === "scene" || domain === "script" || domain === "button") {
    return actionRef("activateEntity", entityID, { domain: domain });
  }
  return { navigate: { surface: "detail", route: "entity:" + encodeURIComponent(entityID) } };
}

function quickControlCard(ctx, entity, index) {
  var domain = domainOf(entity);
  var active = isOn(entity);
  return {
    id: "ha-quick-control-" + index,
    card: {
      appearance: appearance(
        domainAccent(domain),
        domainIcon(domain),
        active ? "PLUGIN_COMPONENT_VARIANT_FILLED" : "PLUGIN_COMPONENT_VARIANT_TINTED"
      ),
      onTap: quickControlAction(ctx, entity),
      children: [
        {
          id: "ha-quick-control-value-" + index,
          value: {
            title: friendlyName(entity),
            subtitle: quickControlSubtitle(entity),
            value: { text: quickControlValue(entity), status: entityStatus(entity) },
            appearance: {
              accent: domainAccent(domain),
              variant: "PLUGIN_COMPONENT_VARIANT_TINTED",
              hideBackground: true,
              iconSource: { systemName: domainIcon(domain), url: "" }
            }
          }
        }
      ]
    }
  };
}

function quickControlCards(ctx, states, limit) {
  var candidates = [];
  for (var index = 0; index < states.length; index += 1) {
    var entity = states[index];
    if (QUICK_CONTROL_DOMAINS[domainOf(entity)] && !isUnavailable(entity)) candidates.push(entity);
  }
  candidates.sort(function (left, right) {
    var rankDiff = quickControlRank(left) - quickControlRank(right);
    if (rankDiff !== 0) return rankDiff;
    if (isOn(left) !== isOn(right)) return isOn(left) ? -1 : 1;
    return friendlyName(left).localeCompare(friendlyName(right));
  });
  var cards = [];
  for (index = 0; index < candidates.length && cards.length < limit; index += 1) {
    cards.push(quickControlCard(ctx, candidates[index], cards.length));
  }
  return cards;
}

function overviewPage(ctx, snapshot) {
  var states = snapshot.states;
  var grouped = groupedStates(states);
  var active = 0;
  var unavailable = 0;
  for (var index = 0; index < states.length; index += 1) {
    if (isUnavailable(states[index])) unavailable += 1;
    else if (isOn(states[index])) active += 1;
  }
  var name = String(snapshot.config.location_name || "Home Assistant");
  var components = [
    {
      id: "ha-overview-header",
      value: {
        title: name,
        subtitle: "Home Assistant " + String(snapshot.config.version || ""),
        value: { text: states.length === 0 ? "暂无实体" : (unavailable > 0 ? unavailable + " 个不可用" : "运行正常"), status: states.length === 0 || unavailable > 0 ? "PLUGIN_STATUS_WARNING" : "PLUGIN_STATUS_HEALTHY" },
        appearance: appearance(states.length === 0 || unavailable > 0 ? "PLUGIN_ACCENT_ORANGE" : "PLUGIN_ACCENT_BLUE", "house.fill", "PLUGIN_COMPONENT_VARIANT_TINTED", HA_LOGO_URL)
      }
    }
  ];
  var quickCards = quickControlCards(ctx, states, 8);
  if (quickCards.length > 0) {
    components.push({
      id: "ha-quick-controls-title",
      text: {
        text: configEnabled(ctx, "allow_controls", false) ? "常用控制" : "常用设备",
        style: "PLUGIN_TEXT_STYLE_TITLE",
        appearance: { hideBackground: true }
      }
    });
    components.push({
      id: "ha-quick-controls",
      grid: {
        columns: 2,
        spacing: 10,
        appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
        children: quickCards
      }
    });
  }
  components.push(
    {
      id: "ha-overview-metrics",
      grid: {
        columns: 2,
        spacing: 8,
        appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
        children: [
          summaryValue("ha-total", "实体", "已载入", states.length, "PLUGIN_ACCENT_BLUE", "square.grid.2x2.fill", "PLUGIN_STATUS_HEALTHY"),
          summaryValue("ha-active", "活动", "当前开启或运行", active, "PLUGIN_ACCENT_GREEN", "bolt.fill", "PLUGIN_STATUS_HEALTHY"),
          summaryValue("ha-domains", "类型", "实体域", Object.keys(grouped).length, "PLUGIN_ACCENT_INDIGO", "square.stack.3d.up.fill", "PLUGIN_STATUS_NEUTRAL"),
          summaryValue("ha-unavailable", "不可用", "需要关注", unavailable, unavailable > 0 ? "PLUGIN_ACCENT_ORANGE" : "PLUGIN_ACCENT_GRAY", "exclamationmark.triangle.fill", unavailable > 0 ? "PLUGIN_STATUS_WARNING" : "PLUGIN_STATUS_HEALTHY")
        ]
      }
    },
    {
      id: "ha-search",
      form: {
        title: "查找实体",
        submitTitle: "搜索",
        fields: [
          { key: "query", label: "名称或实体 ID", placeholder: "例如 客厅 或 light.living_room", input: "PLUGIN_CONFIG_INPUT_TEXT", required: true }
        ],
        onSubmit: { plugin: { actionId: "search" } },
        appearance: appearance("PLUGIN_ACCENT_BLUE", "magnifyingglass")
      }
    },
    {
      id: "ha-domains",
      list: {
        title: "设备与实体",
        items: domainListItems(grouped),
        appearance: { accent: "PLUGIN_ACCENT_BLUE", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
      }
    }
  );
  var sensors = sensorItems(states, 6);
  if (sensors.length > 0) {
    components.push({
      id: "ha-sensors",
      list: {
        title: "环境摘要",
        items: sensors,
        appearance: { accent: "PLUGIN_ACCENT_TEAL", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
      }
    });
  }
  return { title: "概览", components: components };
}

function entityListItem(entity) {
  var domain = domainOf(entity);
  return {
    title: friendlyName(entity),
    subtitle: entitySubtitle(entity),
    value: { text: stateLabel(entity), status: entityStatus(entity) },
    appearance: appearance(domainAccent(domain), domainIcon(domain)),
    onTap: { navigate: { surface: "detail", route: "entity:" + encodeURIComponent(String(entity.entity_id || "")) } }
  };
}

function pageNavigation(domain, page, totalPages) {
  var items = [];
  if (page > 0) {
    items.push({
      title: "上一页",
      subtitle: "第 " + page + " 页",
      appearance: appearance("PLUGIN_ACCENT_BLUE", "chevron.left"),
      onTap: { navigate: { surface: "detail", route: "domain:" + domain + ":" + (page - 1) } }
    });
  }
  if (page + 1 < totalPages) {
    items.push({
      title: "下一页",
      subtitle: "第 " + (page + 2) + " 页",
      appearance: appearance("PLUGIN_ACCENT_BLUE", "chevron.right"),
      onTap: { navigate: { surface: "detail", route: "domain:" + domain + ":" + (page + 1) } }
    });
  }
  if (!items.length) return null;
  return {
    id: "ha-pagination",
    actionMenu: {
      title: "第 " + (page + 1) + " / " + totalPages + " 页",
      items: items,
      appearance: appearance("PLUGIN_ACCENT_BLUE", "book.pages.fill")
    }
  };
}

function domainPage(snapshot, domain, page) {
  var grouped = groupedStates(snapshot.states);
  var entities = grouped[domain] || [];
  entities.sort(function (left, right) { return friendlyName(left).localeCompare(friendlyName(right)); });
  var totalPages = Math.max(1, Math.ceil(entities.length / HA_PAGE_SIZE));
  page = Math.max(0, Math.min(page, totalPages - 1));
  var start = page * HA_PAGE_SIZE;
  var slice = entities.slice(start, start + HA_PAGE_SIZE);
  if (!slice.length) {
    return { title: domainLabel(domain), components: [statusBlock("PLUGIN_STATE_KIND_EMPTY", "暂无" + domainLabel(domain), "Home Assistant 当前没有此类型实体。", "刷新")] };
  }
  var items = [];
  for (var index = 0; index < slice.length; index += 1) items.push(entityListItem(slice[index]));
  var components = [
    {
      id: "ha-domain-list",
      list: {
        title: domainLabel(domain) + " · " + entities.length,
        items: items,
        appearance: { accent: domainAccent(domain), variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
      }
    }
  ];
  var pagination = pageNavigation(domain, page, totalPages);
  if (pagination) components.push(pagination);
  return { title: domainLabel(domain), components: components };
}

function searchableText(entity) {
  return (friendlyName(entity) + " " + String(entity.entity_id || "") + " " + stateLabel(entity)).toLowerCase();
}

function searchPage(snapshot, query) {
  query = String(query || "").trim().toLowerCase();
  if (!query) return { title: "搜索", components: [statusBlock("PLUGIN_STATE_KIND_EMPTY", "请输入关键字", "可以搜索名称或实体 ID。", "刷新")] };
  var matches = [];
  for (var index = 0; index < snapshot.states.length && matches.length < 100; index += 1) {
    if (searchableText(snapshot.states[index]).indexOf(query) >= 0) matches.push(snapshot.states[index]);
  }
  if (!matches.length) return { title: "搜索", components: [statusBlock("PLUGIN_STATE_KIND_EMPTY", "没有匹配的实体", "请尝试更短的名称或实体 ID。", "刷新")] };
  var items = [];
  for (var matchIndex = 0; matchIndex < matches.length; matchIndex += 1) items.push(entityListItem(matches[matchIndex]));
  return {
    title: "搜索结果",
    components: [{ id: "ha-search-results", list: { title: matches.length + " 个结果", items: items, appearance: { accent: "PLUGIN_ACCENT_BLUE", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" } } }]
  };
}

function attributeText(value) {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.length ? value.join("、") : "-";
  if (typeof value === "object") {
    try {
      var text = JSON.stringify(value);
      return text.length > 240 ? text.slice(0, 240) + "…" : text;
    } catch (_) {
      return String(value);
    }
  }
  return String(value);
}

function attributeLabel(key) {
  var labels = {
    friendly_name: "名称", device_class: "设备类型", unit_of_measurement: "单位",
    current_temperature: "当前温度", temperature: "目标温度", humidity: "湿度",
    brightness: "亮度", current_position: "当前位置", percentage: "百分比",
    volume_level: "音量", source: "来源", media_title: "媒体标题", media_artist: "艺术家",
    battery_level: "电量", hvac_action: "温控动作", hvac_mode: "温控模式"
  };
  return labels[key] || key.replace(/_/g, " ");
}

function entityDetails(entity) {
  var attributes = entity.attributes || {};
  var preferred = [
    "friendly_name", "device_class", "unit_of_measurement", "current_temperature", "temperature", "humidity",
    "brightness", "current_position", "percentage", "volume_level", "source", "media_title", "media_artist",
    "battery_level", "hvac_action", "hvac_mode"
  ];
  var keys = [];
  var index;
  for (index = 0; index < preferred.length; index += 1) {
    if (attributes[preferred[index]] !== undefined) keys.push(preferred[index]);
  }
  var allKeys = Object.keys(attributes).sort();
  for (index = 0; index < allKeys.length && keys.length < 18; index += 1) {
    if (keys.indexOf(allKeys[index]) < 0 && allKeys[index] !== "supported_features") keys.push(allKeys[index]);
  }
  var items = [
    { title: "实体 ID", value: { text: String(entity.entity_id || "-") }, appearance: appearance("PLUGIN_ACCENT_GRAY", "number") },
    { title: "状态", value: { text: stateLabel(entity), status: entityStatus(entity) }, appearance: appearance(domainAccent(domainOf(entity)), domainIcon(domainOf(entity))) }
  ];
  for (index = 0; index < keys.length; index += 1) {
    items.push({
      title: attributeLabel(keys[index]),
      value: { text: attributeText(attributes[keys[index]]) },
      appearance: appearance("PLUGIN_ACCENT_GRAY", "info.circle")
    });
  }
  if (entity.last_changed) items.push({ title: "最后变化", value: { text: String(entity.last_changed) }, appearance: appearance("PLUGIN_ACCENT_GRAY", "clock") });
  return items;
}

function actionRef(actionID, entityID, extra) {
  var params = { entityId: entityID };
  var keys = Object.keys(extra || {});
  for (var index = 0; index < keys.length; index += 1) params[keys[index]] = String(extra[keys[index]]);
  return { plugin: { actionId: actionID, params: params } };
}

function switchControl(entity, controlsEnabled) {
  var domain = domainOf(entity);
  return {
    id: "ha-control-toggle",
    toggle: {
      title: friendlyName(entity),
      subtitle: controlsEnabled ? "切换设备状态" : "在插件配置中开启设备控制后可操作",
      isOn: isOn(entity),
      disabled: !controlsEnabled || isUnavailable(entity),
      appearance: appearance(domainAccent(domain), domainIcon(domain)),
      onChange: actionRef("toggleEntity", String(entity.entity_id), { domain: domain })
    }
  };
}

function sliderControl(id, title, subtitle, value, minimum, maximum, step, unit, accent, icon, actionID, entityID, controlsEnabled) {
  return {
    id: id,
    slider: {
      title: title,
      subtitle: controlsEnabled ? subtitle : "在插件配置中开启设备控制后可操作",
      value: { number: safeNumber(value), unit: unit || "", format: "PLUGIN_VALUE_FORMAT_NUMBER" },
      min: safeNumber(minimum),
      max: safeNumber(maximum, 100),
      step: safeNumber(step),
      disabled: !controlsEnabled,
      appearance: appearance(accent, icon),
      onChange: actionRef(actionID, entityID)
    }
  };
}

function entityControls(ctx, entity) {
  var controlsEnabled = configEnabled(ctx, "allow_controls", false);
  var domain = domainOf(entity);
  var attributes = entity.attributes || {};
  var components = [];
  if (domain === "light") {
    components.push(switchControl(entity, controlsEnabled));
    if (attributes.brightness !== undefined) {
      components.push(sliderControl("ha-control-brightness", "亮度", "0% 到 100%", Math.round(clamp(attributes.brightness, 0, 255) / 255 * 100), 0, 100, 1, "%", "PLUGIN_ACCENT_ORANGE", "sun.max.fill", "setBrightness", entity.entity_id, controlsEnabled));
    }
  } else if (domain === "switch" || domain === "input_boolean" || domain === "automation") {
    components.push(switchControl(entity, controlsEnabled));
  } else if (domain === "climate") {
    if (attributes.temperature !== undefined) {
      components.push(sliderControl("ha-control-temperature", "目标温度", "当前 " + attributeText(attributes.current_temperature) + "°", attributes.temperature, safeNumber(attributes.min_temp, 7), safeNumber(attributes.max_temp, 35), safeNumber(attributes.target_temp_step, 0.5), "°", "PLUGIN_ACCENT_RED", "thermometer.medium", "setTemperature", entity.entity_id, controlsEnabled));
    }
    var modes = Array.isArray(attributes.hvac_modes) ? attributes.hvac_modes : [];
    if (controlsEnabled && modes.length > 0) {
      var modeItems = [];
      for (var modeIndex = 0; modeIndex < modes.length; modeIndex += 1) {
        modeItems.push({
          title: stateLabel({ state: String(modes[modeIndex]), attributes: {} }),
          subtitle: String(modes[modeIndex]) === String(entity.state) ? "当前模式" : "切换模式",
          appearance: appearance(String(modes[modeIndex]) === String(entity.state) ? "PLUGIN_ACCENT_GREEN" : "PLUGIN_ACCENT_RED", "thermometer.medium"),
          onTap: actionRef("setHVACMode", entity.entity_id, { mode: modes[modeIndex] })
        });
      }
      components.push({ id: "ha-control-hvac", actionMenu: { title: "温控模式", items: modeItems, appearance: appearance("PLUGIN_ACCENT_RED", "thermometer.medium") } });
    }
  } else if (domain === "cover") {
    if (attributes.current_position !== undefined) {
      components.push(sliderControl("ha-control-cover", "开合位置", "0% 关闭 · 100% 打开", attributes.current_position, 0, 100, 1, "%", "PLUGIN_ACCENT_TEAL", "window.shade.open", "setCoverPosition", entity.entity_id, controlsEnabled));
    }
    if (controlsEnabled) {
      components.push({
        id: "ha-control-cover-actions",
        actionMenu: {
          title: "窗帘操作",
          items: [
            { title: "打开", appearance: appearance("PLUGIN_ACCENT_GREEN", "arrow.up.circle.fill"), onTap: actionRef("coverOpen", entity.entity_id) },
            { title: "停止", appearance: appearance("PLUGIN_ACCENT_ORANGE", "stop.circle.fill"), onTap: actionRef("coverStop", entity.entity_id) },
            { title: "关闭", appearance: appearance("PLUGIN_ACCENT_BLUE", "arrow.down.circle.fill"), onTap: actionRef("coverClose", entity.entity_id) }
          ],
          appearance: appearance("PLUGIN_ACCENT_TEAL", "window.shade.open")
        }
      });
    }
  } else if (domain === "fan") {
    components.push(switchControl(entity, controlsEnabled));
    if (attributes.percentage !== undefined) {
      components.push(sliderControl("ha-control-fan", "风速", "百分比风速", attributes.percentage, 0, 100, safeNumber(attributes.percentage_step, 1), "%", "PLUGIN_ACCENT_INDIGO", "fan.fill", "setFanPercentage", entity.entity_id, controlsEnabled));
    }
  } else if (domain === "media_player") {
    if (attributes.volume_level !== undefined) {
      components.push(sliderControl("ha-control-volume", "音量", "0% 到 100%", safeNumber(attributes.volume_level) * 100, 0, 100, 1, "%", "PLUGIN_ACCENT_PURPLE", "speaker.wave.2.fill", "setVolume", entity.entity_id, controlsEnabled));
    }
    if (controlsEnabled) {
      components.push({
        id: "ha-control-media",
        actionMenu: {
          title: "媒体控制",
          items: [
            { title: "播放 / 暂停", appearance: appearance("PLUGIN_ACCENT_PURPLE", "playpause.fill"), onTap: actionRef("mediaPlayPause", entity.entity_id) },
            { title: "上一首", appearance: appearance("PLUGIN_ACCENT_BLUE", "backward.fill"), onTap: actionRef("mediaPrevious", entity.entity_id) },
            { title: "下一首", appearance: appearance("PLUGIN_ACCENT_BLUE", "forward.fill"), onTap: actionRef("mediaNext", entity.entity_id) }
          ],
          appearance: appearance("PLUGIN_ACCENT_PURPLE", "play.rectangle.fill")
        }
      });
    }
  } else if (domain === "input_number" || domain === "number") {
    components.push(sliderControl("ha-control-number", friendlyName(entity), "设置数值", safeNumber(entity.state), safeNumber(attributes.min, 0), safeNumber(attributes.max, 100), safeNumber(attributes.step, 1), String(attributes.unit_of_measurement || ""), "PLUGIN_ACCENT_BLUE", "number.circle.fill", "setNumber", entity.entity_id, controlsEnabled));
  } else if (domain === "lock" && controlsEnabled) {
    var unlock = String(entity.state) === "locked";
    components.push({
      id: "ha-control-lock",
      confirm: {
        title: unlock ? "解锁" + friendlyName(entity) + "？" : "锁定" + friendlyName(entity) + "？",
        message: unlock ? "这会立即解锁设备，请确认周围环境安全。" : "这会立即锁定设备。",
        confirmTitle: unlock ? "解锁" : "锁定",
        cancelTitle: "取消",
        destructive: unlock,
        onConfirm: actionRef(unlock ? "unlockEntity" : "lockEntity", entity.entity_id),
        appearance: appearance(unlock ? "PLUGIN_ACCENT_RED" : "PLUGIN_ACCENT_GREEN", unlock ? "lock.open.fill" : "lock.fill")
      }
    });
  } else if ((domain === "scene" || domain === "script" || domain === "button") && controlsEnabled) {
    components.push({
      id: "ha-control-run",
      button: {
        title: domain === "button" ? "按下按钮" : (domain === "scene" ? "激活场景" : "运行脚本"),
        subtitle: friendlyName(entity),
        appearance: appearance(domainAccent(domain), domainIcon(domain), "PLUGIN_COMPONENT_VARIANT_FILLED"),
        onTap: actionRef("activateEntity", entity.entity_id, { domain: domain })
      }
    });
  }
  var controllable = {
    light: true, switch: true, input_boolean: true, automation: true, climate: true,
    cover: true, fan: true, media_player: true, input_number: true, number: true,
    lock: true, scene: true, script: true, button: true
  };
  if (!controlsEnabled && controllable[domain]) {
    components.unshift({
      id: "ha-controls-disabled",
      stateBlock: {
        kind: "PLUGIN_STATE_KIND_PERMISSION",
        title: "设备控制未开启",
        message: "当前仅展示状态。可在插件配置中开启“允许设备控制”。",
        appearance: appearance("PLUGIN_ACCENT_ORANGE", "hand.raised.fill")
      }
    });
  }
  return components;
}

function entityPage(ctx, snapshot, entityID) {
  var entity = findEntity(snapshot.states, entityID);
  if (!entity) return { title: "实体详情", components: [statusBlock("PLUGIN_STATE_KIND_ERROR", "实体不存在", "实体可能已被删除或重命名，请返回后刷新。", "刷新")] };
  var domain = domainOf(entity);
  var components = [
    {
      id: "ha-entity-summary",
      value: {
        title: friendlyName(entity),
        subtitle: String(entity.entity_id || ""),
        value: { text: stateLabel(entity), status: entityStatus(entity) },
        appearance: appearance(domainAccent(domain), domainIcon(domain), "PLUGIN_COMPONENT_VARIANT_TINTED")
      }
    }
  ];
  var controls = entityControls(ctx, entity);
  for (var controlIndex = 0; controlIndex < controls.length; controlIndex += 1) components.push(controls[controlIndex]);
  components.push({
    id: "ha-entity-details",
    descriptionList: {
      title: "实体信息",
      columns: 1,
      items: entityDetails(entity),
      appearance: { accent: domainAccent(domain), variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
    }
  });
  return { title: friendlyName(entity), components: components };
}

function successEffects(ctx, message) {
  clearSnapshot(ctx);
  return { effects: [{ toast: { text: message, level: "success", durationMs: 1800 } }, { refresh: { surface: "current" } }] };
}

function requireControls(ctx) {
  if (!configEnabled(ctx, "allow_controls", false)) throw new Error("请先在插件配置中开启设备控制");
}

function requireEntityParam(ctx) {
  var entityID = actionParam(ctx, "entityId");
  if (!validEntityID(entityID)) throw new Error("实体 ID 不合法");
  return entityID;
}

globalThis.dashboard = function (ctx) {
  try {
    return dashboardPage(ctx, loadSnapshot(ctx, false));
  } catch (error) {
    return errorPage(error);
  }
};

globalThis.detail = function (ctx) {
  try {
    var route = String(ctx.route || "overview");
    var snapshot = loadSnapshot(ctx, false);
    if (route.indexOf("entity:") === 0) return entityPage(ctx, snapshot, decodeURIComponent(route.slice(7)));
    if (route.indexOf("search:") === 0) return searchPage(snapshot, decodeURIComponent(route.slice(7)));
    if (route.indexOf("domain:") === 0) {
      var parts = route.split(":");
      var domain = String(parts[1] || "");
      var page = Math.max(0, parseInt(parts[2], 10) || 0);
      return domainPage(snapshot, domain, page);
    }
    return overviewPage(ctx, snapshot);
  } catch (error) {
    return errorPage(error);
  }
};

globalThis.sheet = function (ctx) {
  return globalThis.detail(ctx);
};

globalThis.widget = function (ctx) {
  try {
    var snapshot = loadSnapshot(ctx, false);
    var states = snapshot.states;
    var unavailable = 0;
    var active = 0;
    for (var index = 0; index < states.length; index += 1) {
      if (isUnavailable(states[index])) unavailable += 1;
      else if (isOn(states[index])) active += 1;
    }
    var components = [
      {
        id: "ha-widget-summary",
        value: {
          title: String(snapshot.config.location_name || "Home Assistant"),
          subtitle: states.length + " 个实体",
          value: { text: states.length === 0 ? "暂无实体" : (unavailable > 0 ? unavailable + " 个不可用" : "运行正常"), status: states.length === 0 || unavailable > 0 ? "PLUGIN_STATUS_WARNING" : "PLUGIN_STATUS_HEALTHY" },
          appearance: appearance(states.length === 0 || unavailable > 0 ? "PLUGIN_ACCENT_ORANGE" : "PLUGIN_ACCENT_BLUE", "house.fill", "PLUGIN_COMPONENT_VARIANT_TINTED", HA_LOGO_URL)
        }
      }
    ];
    if (ctx.widgetSize === "medium" || ctx.widgetSize === "large") {
      components.push(summaryValue("ha-widget-active", "活动实体", "当前开启或运行", active, "PLUGIN_ACCENT_GREEN", "bolt.fill", "PLUGIN_STATUS_HEALTHY"));
    }
    if (ctx.widgetSize === "large") {
      var sensors = sensorItems(states, 4);
      if (sensors.length > 0) components.push({ id: "ha-widget-sensors", list: { title: "环境摘要", items: sensors, appearance: { accent: "PLUGIN_ACCENT_TEAL" } } });
    }
    return { title: "Home Assistant", components: components };
  } catch (error) {
    return errorPage(error);
  }
};

globalThis.background = function (ctx) {
  try {
    loadSnapshot(ctx, true);
  } catch (error) {
    if (ctx.log && ctx.log.error) ctx.log.error(String(error && error.message ? error.message : error));
  }
  return {};
};

globalThis.actions = {
  refresh: function (ctx) {
    clearSnapshot(ctx);
    return { effects: [{ refresh: { surface: "current" } }] };
  },
  search: function (ctx) {
    var query = actionParam(ctx, "query");
    if (!query) throw new Error("请输入名称或实体 ID");
    return { effects: [{ navigate: { surface: "detail", route: "search:" + encodeURIComponent(query) } }] };
  },
  toggleEntity: function (ctx) {
    requireControls(ctx);
    var entityID = requireEntityParam(ctx);
    var domain = entityID.split(".")[0];
    var allowed = { light: true, switch: true, fan: true, input_boolean: true, automation: true };
    if (!allowed[domain]) throw new Error("此实体不支持开关控制");
    var enabled = actionParam(ctx, "value").toLowerCase() === "true";
    serviceCall(ctx, domain, enabled ? "turn_on" : "turn_off", { entity_id: entityID });
    return successEffects(ctx, enabled ? "已开启" : "已关闭");
  },
  setQuickEntityState: function (ctx) {
    requireControls(ctx);
    var entityID = requireEntityParam(ctx);
    var domain = entityID.split(".")[0];
    var allowed = { light: true, switch: true, fan: true, input_boolean: true, automation: true };
    if (!allowed[domain]) throw new Error("此实体不支持快捷开关");
    var enabled = actionParam(ctx, "value").toLowerCase() === "true";
    serviceCall(ctx, domain, enabled ? "turn_on" : "turn_off", { entity_id: entityID });
    return successEffects(ctx, enabled ? "已开启" : "已关闭");
  },
  setBrightness: function (ctx) {
    requireControls(ctx);
    var entityID = requireEntityParam(ctx);
    var value = Math.round(clamp(actionParam(ctx, "value"), 0, 100));
    serviceCall(ctx, "light", "turn_on", { entity_id: entityID, brightness_pct: value });
    return successEffects(ctx, "亮度已设为 " + value + "%");
  },
  setTemperature: function (ctx) {
    requireControls(ctx);
    var entityID = requireEntityParam(ctx);
    var value = safeNumber(actionParam(ctx, "value"));
    serviceCall(ctx, "climate", "set_temperature", { entity_id: entityID, temperature: value });
    return successEffects(ctx, "目标温度已更新");
  },
  setHVACMode: function (ctx) {
    requireControls(ctx);
    var entityID = requireEntityParam(ctx);
    var mode = actionParam(ctx, "mode");
    if (!/^[a-z0-9_]+$/.test(mode)) throw new Error("温控模式不合法");
    serviceCall(ctx, "climate", "set_hvac_mode", { entity_id: entityID, hvac_mode: mode });
    return successEffects(ctx, "温控模式已切换");
  },
  setCoverPosition: function (ctx) {
    requireControls(ctx);
    var entityID = requireEntityParam(ctx);
    var value = Math.round(clamp(actionParam(ctx, "value"), 0, 100));
    serviceCall(ctx, "cover", "set_cover_position", { entity_id: entityID, position: value });
    return successEffects(ctx, "位置已设为 " + value + "%");
  },
  coverOpen: function (ctx) {
    requireControls(ctx);
    serviceCall(ctx, "cover", "open_cover", { entity_id: requireEntityParam(ctx) });
    return successEffects(ctx, "已请求打开");
  },
  coverStop: function (ctx) {
    requireControls(ctx);
    serviceCall(ctx, "cover", "stop_cover", { entity_id: requireEntityParam(ctx) });
    return successEffects(ctx, "已请求停止");
  },
  coverClose: function (ctx) {
    requireControls(ctx);
    serviceCall(ctx, "cover", "close_cover", { entity_id: requireEntityParam(ctx) });
    return successEffects(ctx, "已请求关闭");
  },
  setFanPercentage: function (ctx) {
    requireControls(ctx);
    var entityID = requireEntityParam(ctx);
    var value = Math.round(clamp(actionParam(ctx, "value"), 0, 100));
    serviceCall(ctx, "fan", "set_percentage", { entity_id: entityID, percentage: value });
    return successEffects(ctx, "风速已设为 " + value + "%");
  },
  setVolume: function (ctx) {
    requireControls(ctx);
    var entityID = requireEntityParam(ctx);
    var value = clamp(actionParam(ctx, "value"), 0, 100);
    serviceCall(ctx, "media_player", "volume_set", { entity_id: entityID, volume_level: value / 100 });
    return successEffects(ctx, "音量已更新");
  },
  mediaPlayPause: function (ctx) {
    requireControls(ctx);
    serviceCall(ctx, "media_player", "media_play_pause", { entity_id: requireEntityParam(ctx) });
    return successEffects(ctx, "已切换播放状态");
  },
  mediaPrevious: function (ctx) {
    requireControls(ctx);
    serviceCall(ctx, "media_player", "media_previous_track", { entity_id: requireEntityParam(ctx) });
    return successEffects(ctx, "已切换到上一首");
  },
  mediaNext: function (ctx) {
    requireControls(ctx);
    serviceCall(ctx, "media_player", "media_next_track", { entity_id: requireEntityParam(ctx) });
    return successEffects(ctx, "已切换到下一首");
  },
  setNumber: function (ctx) {
    requireControls(ctx);
    var entityID = requireEntityParam(ctx);
    var domain = entityID.split(".")[0];
    if (domain !== "number" && domain !== "input_number") throw new Error("此实体不支持数值控制");
    serviceCall(ctx, domain, "set_value", { entity_id: entityID, value: safeNumber(actionParam(ctx, "value")) });
    return successEffects(ctx, "数值已更新");
  },
  lockEntity: function (ctx) {
    requireControls(ctx);
    serviceCall(ctx, "lock", "lock", { entity_id: requireEntityParam(ctx) });
    return successEffects(ctx, "已请求锁定");
  },
  unlockEntity: function (ctx) {
    requireControls(ctx);
    serviceCall(ctx, "lock", "unlock", { entity_id: requireEntityParam(ctx) });
    return successEffects(ctx, "已请求解锁");
  },
  activateEntity: function (ctx) {
    requireControls(ctx);
    var entityID = requireEntityParam(ctx);
    var domain = entityID.split(".")[0];
    if (domain === "button") serviceCall(ctx, domain, "press", { entity_id: entityID });
    else if (domain === "scene" || domain === "script") serviceCall(ctx, domain, "turn_on", { entity_id: entityID });
    else throw new Error("此实体不支持执行操作");
    return successEffects(ctx, domain === "scene" ? "场景已激活" : (domain === "script" ? "脚本已运行" : "按钮已按下"));
  }
};
