var OPENWRT_SESSION_KEY = "openwrt-session-v1";
var OPENWRT_SNAPSHOT_KEY = "openwrt-snapshot-v1";
var OPENWRT_HISTORY_KEY = "openwrt-traffic-history-v1";
var SESSION_TTL_MS = 240000;
var SNAPSHOT_TTL_MS = 30000;
var HISTORY_TTL_MS = 604800000;

function configValue(ctx, key) {
  if (!ctx.config || ctx.config[key] === undefined || ctx.config[key] === null) return "";
  return String(ctx.config[key]).trim();
}

function actionParam(ctx, key) {
  if (!ctx.params || ctx.params[key] === undefined || ctx.params[key] === null) return "";
  return String(ctx.params[key]).trim();
}

function configEnabled(ctx, key, fallback) {
  var value = configValue(ctx, key).toLowerCase();
  if (!value) return fallback;
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function safeNumber(value) {
  var number = Number(value);
  return isFinite(number) ? number : 0;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(safeNumber(value), minimum), maximum);
}

function baseURL(ctx) {
  var value = configValue(ctx, "base_url");
  if (!value) throw new Error("请先配置 OpenWrt 地址");
  if (!/^https?:\/\//i.test(value)) throw new Error("OpenWrt 地址必须以 http:// 或 https:// 开头");
  value = value.replace(/\/+$/, "");
  if (/\/ubus$/i.test(value)) value = value.slice(0, -5);
  return value;
}

function ubusURL(ctx) {
  return baseURL(ctx) + "/ubus";
}

function rpcErrorMessage(code) {
  var messages = {
    1: "无效命令",
    2: "无效参数",
    3: "未找到接口",
    4: "未找到方法",
    5: "未找到资源",
    6: "没有权限",
    7: "请求超时",
    8: "当前不支持"
  };
  return messages[code] || ("ubus 错误 " + code);
}

function rawRPC(ctx, session, object, method, params) {
  if (!ctx.http || !ctx.http.request) throw new Error("插件尚未获得网络访问权限");
  var response = ctx.http.request({
    url: ubusURL(ctx),
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "call",
      params: [session, object, method, params || {}]
    })
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error("OpenWrt 返回 HTTP " + response.status);
  }
  var body = response.json;
  if (!body) throw new Error("OpenWrt 返回了无法解析的数据");
  if (body.error) throw new Error(String(body.error.message || "JSON-RPC 请求失败"));
  if (!body.result || body.result.length < 1) throw new Error("ubus 返回格式不正确");
  var code = safeNumber(body.result[0]);
  if (code !== 0) throw new Error(rpcErrorMessage(code));
  return body.result.length > 1 && body.result[1] ? body.result[1] : {};
}

function login(ctx, force) {
  if (!force && ctx.cache) {
    var cached = ctx.cache.get(OPENWRT_SESSION_KEY);
    if (cached && cached.token) return String(cached.token);
  }
  var username = configValue(ctx, "username") || "root";
  var password = configValue(ctx, "password");
  var result = rawRPC(
    ctx,
    "00000000000000000000000000000000",
    "session",
    "login",
    { username: username, password: password }
  );
  var token = String(result.ubus_rpc_session || "");
  if (!token) throw new Error("OpenWrt 登录失败，请检查用户名、密码和 rpcd 权限");
  if (ctx.cache) ctx.cache.set(OPENWRT_SESSION_KEY, { token: token }, { ttlMs: SESSION_TTL_MS });
  return token;
}

function ubusCall(ctx, object, method, params) {
  var token = login(ctx, false);
  try {
    return rawRPC(ctx, token, object, method, params || {});
  } catch (firstError) {
    if (ctx.cache) ctx.cache.delete(OPENWRT_SESSION_KEY);
    token = login(ctx, true);
    return rawRPC(ctx, token, object, method, params || {});
  }
}

function optionalCall(ctx, object, method, params, fallback) {
  try {
    return ubusCall(ctx, object, method, params || {});
  } catch (_) {
    return fallback;
  }
}

function formatBytes(value) {
  var bytes = Math.max(0, safeNumber(value));
  var units = ["B", "KB", "MB", "GB", "TB"];
  var index = 0;
  while (bytes >= 1024 && index < units.length - 1) {
    bytes /= 1024;
    index += 1;
  }
  var digits = bytes >= 100 || index === 0 ? 0 : 1;
  return bytes.toFixed(digits).replace(/\.0$/, "") + " " + units[index];
}

function formatRate(value) {
  return formatBytes(value) + "/s";
}

function kilobytesPerSecond(value) {
  return safeNumber(value) / 1024;
}

function formatDuration(value) {
  var seconds = Math.max(0, Math.floor(safeNumber(value)));
  var days = Math.floor(seconds / 86400);
  var hours = Math.floor((seconds % 86400) / 3600);
  var minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return days + " 天 " + hours + " 小时";
  if (hours > 0) return hours + " 小时 " + minutes + " 分钟";
  return minutes + " 分钟";
}

function timeLabel(timestamp) {
  var date = new Date(timestamp);
  var hour = String(date.getHours()).padStart(2, "0");
  var minute = String(date.getMinutes()).padStart(2, "0");
  return hour + ":" + minute;
}

function interfaceAddress(item) {
  var addresses = item && item["ipv4-address"] ? item["ipv4-address"] : [];
  if (addresses.length > 0 && addresses[0].address) return String(addresses[0].address);
  var v6 = item && item["ipv6-address"] ? item["ipv6-address"] : [];
  return v6.length > 0 && v6[0].address ? String(v6[0].address) : "未分配地址";
}

function selectWAN(interfaces) {
  var candidates = interfaces || [];
  var index;
  for (index = 0; index < candidates.length; index += 1) {
    if (String(candidates[index].interface || "").toLowerCase() === "wan") return candidates[index];
  }
  for (index = 0; index < candidates.length; index += 1) {
    var proto = String(candidates[index].proto || "").toLowerCase();
    if (candidates[index].up && (proto === "dhcp" || proto === "pppoe" || proto === "static")) return candidates[index];
  }
  return candidates.length > 0 ? candidates[0] : {};
}

function memoryUsage(info) {
  var memory = info && info.memory ? info.memory : {};
  var total = safeNumber(memory.total);
  if (total <= 0) return { total: 0, used: 0, fraction: 0 };
  var available = safeNumber(memory.available);
  var used = available > 0
    ? total - available
    : total - safeNumber(memory.free) - safeNumber(memory.buffered) - safeNumber(memory.cached);
  used = clamp(used, 0, total);
  return { total: total, used: used, fraction: used / total };
}

function loadAverage(info) {
  var load = info && info.load ? info.load : [];
  return load.length > 0 ? safeNumber(load[0]) / 65535 : 0;
}

function deviceStatistics(ctx, wan) {
  var name = String((wan && (wan.l3_device || wan.device)) || "");
  if (!name) return { name: "", rx: 0, tx: 0 };
  var status = optionalCall(ctx, "network.device", "status", { name: name }, {});
  var statistics = status.statistics || {};
  return {
    name: name,
    rx: safeNumber(statistics.rx_bytes || status.rx_bytes),
    tx: safeNumber(statistics.tx_bytes || status.tx_bytes)
  };
}

function updateHistory(ctx, rx, tx, now) {
  if (!ctx.cache) return [];
  var history = ctx.cache.get(OPENWRT_HISTORY_KEY) || [];
  if (!Array.isArray(history)) history = [];
  var previous = history.length > 0 ? history[history.length - 1] : null;
  var rxRate = 0;
  var txRate = 0;
  if (previous && now > safeNumber(previous.timestamp)) {
    var elapsed = Math.max((now - safeNumber(previous.timestamp)) / 1000, 1);
    if (rx >= safeNumber(previous.rx)) rxRate = (rx - safeNumber(previous.rx)) / elapsed;
    if (tx >= safeNumber(previous.tx)) txRate = (tx - safeNumber(previous.tx)) / elapsed;
  }
  var point = { timestamp: now, rx: rx, tx: tx, rxRate: rxRate, txRate: txRate };
  if (previous && now - safeNumber(previous.timestamp) < 15000) history[history.length - 1] = point;
  else history.push(point);
  if (history.length > 48) history = history.slice(history.length - 48);
  ctx.cache.set(OPENWRT_HISTORY_KEY, history, { ttlMs: HISTORY_TTL_MS });
  return history;
}

function loadSnapshot(ctx, force) {
  if (!force && ctx.cache) {
    var cached = ctx.cache.get(OPENWRT_SNAPSHOT_KEY);
    if (cached && cached.board && cached.info) return cached;
  }
  var board = ubusCall(ctx, "system", "board", {});
  var info = ubusCall(ctx, "system", "info", {});
  var network = ubusCall(ctx, "network.interface", "dump", {});
  var interfaces = network.interface || [];
  var wan = selectWAN(interfaces);
  var traffic = deviceStatistics(ctx, wan);
  var now = Date.now();
  var history = updateHistory(ctx, traffic.rx, traffic.tx, now);
  var snapshot = {
    capturedAt: now,
    board: board,
    info: info,
    interfaces: interfaces,
    wan: wan,
    traffic: traffic,
    history: history
  };
  if (ctx.cache) ctx.cache.set(OPENWRT_SNAPSHOT_KEY, snapshot, { ttlMs: SNAPSHOT_TTL_MS });
  return snapshot;
}

function releaseText(board) {
  var release = board && board.release ? board.release : {};
  return String(release.description || release.version || board.system || "OpenWrt");
}

function appearance(accent, icon, variant) {
  return {
    accent: accent || "PLUGIN_ACCENT_BLUE",
    variant: variant || "PLUGIN_COMPONENT_VARIANT_TINTED",
    iconSource: { systemName: icon || "wifi.router.fill" }
  };
}

function statusBlock(kind, title, message, actionTitle) {
  return {
    id: "openwrt-state",
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
    title: "OpenWrt",
    components: [statusBlock("PLUGIN_STATE_KIND_ERROR", "无法连接 OpenWrt", message, "重新连接")]
  };
}

function valueComponent(id, title, subtitle, number, format, accent, icon, status) {
  return {
    id: id,
    value: {
      title: title,
      subtitle: subtitle || "",
      value: { number: safeNumber(number), format: format || "PLUGIN_VALUE_FORMAT_NUMBER", status: status || "PLUGIN_STATUS_NEUTRAL" },
      appearance: appearance(accent, icon)
    }
  };
}

function textValueComponent(id, title, subtitle, text, accent, icon, status) {
  return {
    id: id,
    value: {
      title: title,
      subtitle: subtitle || "",
      value: { text: String(text || "-"), status: status || "PLUGIN_STATUS_NEUTRAL" },
      appearance: appearance(accent, icon)
    }
  };
}

function dashboardPage(ctx, snapshot) {
  var board = snapshot.board;
  var wan = snapshot.wan || {};
  var hostname = String(board.hostname || "OpenWrt");
  var isOnline = Boolean(wan.up);
  return {
    title: "",
    components: [
      {
        id: "openwrt-dashboard-summary",
        value: {
          title: hostname,
          subtitle: releaseText(board) + " · WAN " + String(wan.proto || "-").toUpperCase(),
          value: {
            text: isOnline ? "在线" : "WAN 离线",
            status: isOnline ? "PLUGIN_STATUS_HEALTHY" : "PLUGIN_STATUS_STOPPED"
          },
          appearance: {
            accent: isOnline ? "PLUGIN_ACCENT_BLUE" : "PLUGIN_ACCENT_RED",
            iconSource: { systemName: "wifi.router.fill" },
            hideBackground: true
          },
          onTap: { navigate: { surface: "detail", route: "overview" } }
        }
      }
    ]
  };
}

function historyPoints(history, key) {
  var points = [];
  for (var index = 0; index < history.length; index += 1) {
    points.push({ label: timeLabel(history[index].timestamp), value: safeNumber(history[index][key]) });
  }
  return points;
}

function historyRatePoints(history, key) {
  var points = [];
  for (var index = 0; index < history.length; index += 1) {
    points.push({ label: timeLabel(history[index].timestamp), value: kilobytesPerSecond(history[index][key]) });
  }
  return points;
}

function interfaceItems(interfaces, interactive) {
  var result = [];
  for (var index = 0; index < interfaces.length; index += 1) {
    var item = interfaces[index] || {};
    var name = String(item.interface || item.device || "接口");
    var row = {
      title: name,
      subtitle: String(item.proto || "-").toUpperCase() + " · " + interfaceAddress(item),
      value: { text: item.up ? "已连接" : "未连接", status: item.up ? "PLUGIN_STATUS_HEALTHY" : "PLUGIN_STATUS_STOPPED" },
      appearance: appearance(item.up ? "PLUGIN_ACCENT_GREEN" : "PLUGIN_ACCENT_GRAY", item.up ? "network" : "network.slash")
    };
    if (interactive) row.onTap = { navigate: { surface: "detail", route: "interface:" + index } };
    result.push(row);
  }
  return result;
}

function rateValueComponent(id, title, subtitle, bytesPerSecond, accent, icon) {
  return {
    id: id,
    value: {
      title: title,
      subtitle: subtitle || "",
      value: { number: kilobytesPerSecond(bytesPerSecond), unit: "KB/s", format: "PLUGIN_VALUE_FORMAT_NUMBER" },
      appearance: appearance(accent, icon)
    }
  };
}

function addressList(item, key) {
  var addresses = item && item[key] ? item[key] : [];
  var result = [];
  for (var index = 0; index < addresses.length; index += 1) {
    var address = addresses[index] || {};
    if (!address.address) continue;
    result.push(String(address.address) + (address.mask !== undefined ? "/" + String(address.mask) : ""));
  }
  return result.length ? result.join("、") : "未分配";
}

function interfaceGateway(item) {
  var routes = item && item.route ? item.route : [];
  for (var index = 0; index < routes.length; index += 1) {
    var route = routes[index] || {};
    if ((String(route.target || "") === "0.0.0.0" || String(route.target || "") === "::") && route.nexthop) return String(route.nexthop);
  }
  return "-";
}

function interfacePage(ctx, snapshot, index) {
  var item = snapshot.interfaces[index];
  if (!item) return { title: "网络接口", components: [statusBlock("PLUGIN_STATE_KIND_ERROR", "接口不存在", "接口列表可能已经发生变化，请返回后重试。", "返回")] };
  var name = String(item.interface || item.device || "接口");
  var device = String(item.l3_device || item.device || name);
  var deviceStatus = optionalCall(ctx, "network.device", "status", { name: device }, {});
  var statistics = deviceStatus.statistics || {};
  var dnsServers = item["dns-server"] || [];
  var components = [
    {
      id: "openwrt-interface-summary",
      value: {
        title: name,
        subtitle: String(item.proto || "-").toUpperCase() + " · " + device,
        value: { text: item.up ? "已连接" : "未连接", status: item.up ? "PLUGIN_STATUS_HEALTHY" : "PLUGIN_STATUS_STOPPED" },
        appearance: appearance(item.up ? "PLUGIN_ACCENT_GREEN" : "PLUGIN_ACCENT_GRAY", item.up ? "network" : "network.slash", "PLUGIN_COMPONENT_VARIANT_TINTED")
      }
    },
    {
      id: "openwrt-interface-addresses",
      descriptionList: {
        title: "接口信息",
        columns: 2,
        items: [
          { title: "IPv4", value: { text: addressList(item, "ipv4-address") }, appearance: appearance("PLUGIN_ACCENT_BLUE", "4.circle.fill") },
          { title: "IPv6", value: { text: addressList(item, "ipv6-address") }, appearance: appearance("PLUGIN_ACCENT_INDIGO", "6.circle.fill") },
          { title: "网关", value: { text: interfaceGateway(item) }, appearance: appearance("PLUGIN_ACCENT_ORANGE", "arrow.triangle.branch") },
          { title: "DNS", value: { text: dnsServers.length ? dnsServers.join("、") : "-" }, appearance: appearance("PLUGIN_ACCENT_TEAL", "network") },
          { title: "运行时间", value: { text: formatDuration(item.uptime) }, appearance: appearance("PLUGIN_ACCENT_GREEN", "clock.arrow.circlepath") },
          { title: "MAC", value: { text: String(deviceStatus.macaddr || "-").toUpperCase() }, appearance: appearance("PLUGIN_ACCENT_GRAY", "number") }
        ],
        appearance: { accent: "PLUGIN_ACCENT_BLUE", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
      }
    },
    {
      id: "openwrt-interface-traffic",
      descriptionList: {
        title: "累计流量",
        columns: 2,
        items: [
          { title: "下载", value: { text: formatBytes(statistics.rx_bytes || deviceStatus.rx_bytes) }, appearance: appearance("PLUGIN_ACCENT_BLUE", "arrow.down.circle.fill") },
          { title: "上传", value: { text: formatBytes(statistics.tx_bytes || deviceStatus.tx_bytes) }, appearance: appearance("PLUGIN_ACCENT_ORANGE", "arrow.up.circle.fill") },
          { title: "接收包", value: { number: safeNumber(statistics.rx_packets || deviceStatus.rx_packets), format: "PLUGIN_VALUE_FORMAT_NUMBER" }, appearance: appearance("PLUGIN_ACCENT_BLUE", "shippingbox.fill") },
          { title: "发送包", value: { number: safeNumber(statistics.tx_packets || deviceStatus.tx_packets), format: "PLUGIN_VALUE_FORMAT_NUMBER" }, appearance: appearance("PLUGIN_ACCENT_ORANGE", "shippingbox.fill") }
        ],
        appearance: { accent: "PLUGIN_ACCENT_TEAL", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
      }
    }
  ];
  return { title: name, components: components };
}

function overviewPage(ctx, snapshot) {
  var board = snapshot.board;
  var info = snapshot.info;
  var memory = memoryUsage(info);
  var wan = snapshot.wan || {};
  var load = loadAverage(info);
  var history = snapshot.history || [];
  var components = [
    {
      id: "openwrt-system-summary",
      descriptionList: {
        title: String(board.hostname || "OpenWrt"),
        columns: 2,
        items: [
          { title: "型号", value: { text: String(board.model || "未知") }, appearance: appearance("PLUGIN_ACCENT_BLUE", "wifi.router.fill") },
          { title: "固件", value: { text: releaseText(board) }, appearance: appearance("PLUGIN_ACCENT_TEAL", "shippingbox.fill") },
          { title: "内核", value: { text: String(board.kernel || "-") }, appearance: appearance("PLUGIN_ACCENT_GRAY", "cpu") },
          { title: "运行时间", value: { text: formatDuration(info.uptime) }, appearance: appearance("PLUGIN_ACCENT_GREEN", "clock.arrow.circlepath") }
        ],
        appearance: { accent: "PLUGIN_ACCENT_BLUE", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
      }
    },
    {
      id: "openwrt-resource-grid",
      grid: {
        columns: 2,
        spacing: 8,
        appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
        children: [
          valueComponent("openwrt-load", "系统负载", "最近 1 分钟", load, "PLUGIN_VALUE_FORMAT_NUMBER", load > 1.5 ? "PLUGIN_ACCENT_ORANGE" : "PLUGIN_ACCENT_GREEN", "speedometer", load > 1.5 ? "PLUGIN_STATUS_WARNING" : "PLUGIN_STATUS_HEALTHY"),
          valueComponent("openwrt-memory", "内存使用", formatBytes(memory.used) + " / " + formatBytes(memory.total), memory.fraction, "PLUGIN_VALUE_FORMAT_PERCENT", "PLUGIN_ACCENT_PURPLE", "memorychip"),
          rateValueComponent("openwrt-rx", "实时下载", snapshot.traffic.name, history.length ? history[history.length - 1].rxRate : 0, "PLUGIN_ACCENT_BLUE", "arrow.down.circle.fill"),
          rateValueComponent("openwrt-tx", "实时上传", snapshot.traffic.name, history.length ? history[history.length - 1].txRate : 0, "PLUGIN_ACCENT_ORANGE", "arrow.up.circle.fill")
        ]
      }
    },
    {
      id: "openwrt-traffic-chart",
      multiLineChart: {
        title: "WAN 实时流量（KB/s）",
        series: [
          { id: "download", name: "下载", points: historyRatePoints(history, "rxRate"), appearance: { accent: "PLUGIN_ACCENT_BLUE" } },
          { id: "upload", name: "上传", points: historyRatePoints(history, "txRate"), appearance: { accent: "PLUGIN_ACCENT_ORANGE" } }
        ],
        options: { showLabels: true, emptyText: "等待采集流量数据" },
        appearance: { accent: "PLUGIN_ACCENT_BLUE", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
      }
    },
    {
      id: "openwrt-navigation",
      list: {
        title: "网络",
        items: [
          { title: "客户端", subtitle: "DHCP 租约与主机信息", value: { text: "查看" }, appearance: appearance("PLUGIN_ACCENT_INDIGO", "person.2.fill"), onTap: { navigate: { surface: "detail", route: "clients" } } },
          { title: "无线网络", subtitle: "无线设备、信道和关联客户端", value: { text: "查看" }, appearance: appearance("PLUGIN_ACCENT_TEAL", "wifi"), onTap: { navigate: { surface: "detail", route: "wireless" } } }
        ],
        appearance: { accent: "PLUGIN_ACCENT_BLUE", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
      }
    },
    {
      id: "openwrt-interfaces",
      list: {
        title: "网络接口",
        items: interfaceItems(snapshot.interfaces, true),
        appearance: { accent: "PLUGIN_ACCENT_GREEN", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
      }
    }
  ];
  if (configEnabled(ctx, "allow_actions", false)) {
    components.push({
      id: "openwrt-actions",
      disclosure: {
        title: "设备操作",
        subtitle: "执行前需要再次确认",
        expanded: false,
        appearance: { accent: "PLUGIN_ACCENT_ORANGE", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
        children: [
          {
            id: "openwrt-reload-network",
            confirm: {
              title: "重载网络？",
              message: "网络连接可能会短暂中断。",
              confirmTitle: "重载",
              cancelTitle: "取消",
              destructive: false,
              onConfirm: { plugin: { actionId: "reloadNetwork" } },
              appearance: appearance("PLUGIN_ACCENT_ORANGE", "arrow.triangle.2.circlepath")
            }
          },
          {
            id: "openwrt-reboot",
            confirm: {
              title: "重启 OpenWrt？",
              message: "路由器和当前网络将在重启期间不可用。",
              confirmTitle: "重启",
              cancelTitle: "取消",
              destructive: true,
              onConfirm: { plugin: { actionId: "reboot" } },
              appearance: appearance("PLUGIN_ACCENT_RED", "power")
            }
          }
        ]
      }
    });
  }
  return { title: String(board.hostname || "OpenWrt") + " · 概览", components: components };
}

function normalizeLeases(payload) {
  var leases = payload && (payload.dhcp_leases || payload.leases) ? (payload.dhcp_leases || payload.leases) : [];
  var leases6 = payload && payload.dhcp6_leases ? payload.dhcp6_leases : [];
  if (!Array.isArray(leases)) leases = [];
  if (!Array.isArray(leases6)) leases6 = [];
  return leases.concat(leases6);
}

function stringList(value) {
  if (!Array.isArray(value)) return [];
  var result = [];
  for (var index = 0; index < value.length; index += 1) {
    if (value[index] !== undefined && value[index] !== null && String(value[index]).trim()) result.push(String(value[index]));
  }
  return result;
}

function pushUnique(target, value) {
  var text = String(value || "").trim();
  if (text && target.indexOf(text) < 0) target.push(text);
}

function clientRecords(ctx) {
  var leasesPayload = optionalCall(ctx, "luci-rpc", "getDHCPLeases", {}, {});
  var hintsPayload = optionalCall(ctx, "luci-rpc", "getHostHints", {}, {});
  var leases = normalizeLeases(leasesPayload);
  var records = [];
  var byMac = {};
  var index;
  for (index = 0; index < leases.length; index += 1) {
    var lease = leases[index] || {};
    var mac = String(lease.macaddr || lease.mac || "").toUpperCase();
    var record = {
      name: String(lease.hostname || mac || "未知设备"),
      mac: mac,
      ipv4: [],
      ipv6: [],
      expires: safeNumber(lease.expires),
      staticLease: Boolean(lease.static),
      duid: String(lease.duid || ""),
      source: "DHCP 租约",
      online: true
    };
    var leaseAddress = String(lease.ipaddr || lease.ip || "");
    if (leaseAddress.indexOf(":") >= 0) pushUnique(record.ipv6, leaseAddress);
    else pushUnique(record.ipv4, leaseAddress);
    records.push(record);
    if (mac) byMac[mac] = record;
  }
  if (hintsPayload && typeof hintsPayload === "object") {
    var keys = Object.keys(hintsPayload);
    for (index = 0; index < keys.length; index += 1) {
      var hint = hintsPayload[keys[index]] || {};
      var hintMac = String(keys[index] || "").toUpperCase();
      var existing = byMac[hintMac];
      if (!existing) {
        existing = {
          name: String(hint.name || hintMac || "未知设备"),
          mac: hintMac,
          ipv4: [],
          ipv6: [],
          expires: 0,
          staticLease: false,
          duid: "",
          source: "主机发现",
          online: false
        };
        records.push(existing);
        if (hintMac) byMac[hintMac] = existing;
      } else if ((!existing.name || existing.name === existing.mac) && hint.name) {
        existing.name = String(hint.name);
      }
      var ipv4 = stringList(hint.ipaddrs || hint.ipv4);
      var ipv6 = stringList(hint.ip6addrs || hint.ipv6);
      for (var ipv4Index = 0; ipv4Index < ipv4.length; ipv4Index += 1) pushUnique(existing.ipv4, ipv4[ipv4Index]);
      for (var ipv6Index = 0; ipv6Index < ipv6.length; ipv6Index += 1) pushUnique(existing.ipv6, ipv6[ipv6Index]);
    }
  }
  return records;
}

function clientAddress(record) {
  if (record.ipv4.length) return record.ipv4[0];
  if (record.ipv6.length) return record.ipv6[0];
  return "未发现 IP";
}

function clientsPage(ctx) {
  var records = clientRecords(ctx);
  var items = [];
  for (var index = 0; index < records.length; index += 1) {
    var record = records[index];
    items.push({
      title: record.name,
      subtitle: clientAddress(record) + (record.mac ? " · " + record.mac : ""),
      value: { text: record.online ? (record.expires ? formatDuration(record.expires) : "在线") : "已发现", status: record.online ? "PLUGIN_STATUS_HEALTHY" : "PLUGIN_STATUS_NEUTRAL" },
      appearance: appearance(record.online ? "PLUGIN_ACCENT_GREEN" : "PLUGIN_ACCENT_BLUE", "desktopcomputer"),
      onTap: { navigate: { surface: "detail", route: "client:" + index } }
    });
  }
  if (records.length === 0) {
    return {
      title: "客户端",
      components: [statusBlock("PLUGIN_STATE_KIND_EMPTY", "暂无客户端数据", "当前固件可能未安装 LuCI rpc 扩展，或没有活动 DHCP 租约。", "刷新")]
    };
  }
  return {
    title: "客户端",
    components: [{ id: "openwrt-clients", list: { title: items.length + " 个客户端", items: items, appearance: { accent: "PLUGIN_ACCENT_GREEN", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" } } }]
  };
}

function clientDetailPage(ctx, index) {
  var records = clientRecords(ctx);
  var record = records[index];
  if (!record) return { title: "客户端详情", components: [statusBlock("PLUGIN_STATE_KIND_ERROR", "客户端不存在", "客户端列表可能已经发生变化，请返回后重试。", "刷新")] };
  var leaseText = record.expires ? formatDuration(record.expires) : (record.online ? "有效" : "无活动租约");
  var components = [
    {
      id: "openwrt-client-summary",
      value: {
        title: record.name,
        subtitle: clientAddress(record),
        value: { text: record.online ? "在线" : "已发现", status: record.online ? "PLUGIN_STATUS_HEALTHY" : "PLUGIN_STATUS_NEUTRAL" },
        appearance: appearance(record.online ? "PLUGIN_ACCENT_GREEN" : "PLUGIN_ACCENT_BLUE", "desktopcomputer", "PLUGIN_COMPONENT_VARIANT_TINTED")
      }
    },
    {
      id: "openwrt-client-details",
      descriptionList: {
        title: "客户端信息",
        columns: 2,
        items: [
          { title: "MAC", value: { text: record.mac || "-" }, appearance: appearance("PLUGIN_ACCENT_GRAY", "number") },
          { title: "来源", value: { text: record.source }, appearance: appearance("PLUGIN_ACCENT_BLUE", "antenna.radiowaves.left.and.right") },
          { title: "IPv4", value: { text: record.ipv4.length ? record.ipv4.join("、") : "未分配" }, appearance: appearance("PLUGIN_ACCENT_BLUE", "4.circle.fill") },
          { title: "IPv6", value: { text: record.ipv6.length ? record.ipv6.join("、") : "未分配" }, appearance: appearance("PLUGIN_ACCENT_INDIGO", "6.circle.fill") },
          { title: "租约", value: { text: leaseText }, appearance: appearance(record.online ? "PLUGIN_ACCENT_GREEN" : "PLUGIN_ACCENT_GRAY", "clock") },
          { title: "分配方式", value: { text: record.staticLease ? "静态" : "动态" }, appearance: appearance("PLUGIN_ACCENT_ORANGE", "arrow.triangle.2.circlepath") }
        ],
        appearance: { accent: "PLUGIN_ACCENT_GREEN", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
      }
    }
  ];
  if (record.duid) {
    components.push({
      id: "openwrt-client-duid",
      value: {
        title: "DUID",
        subtitle: "DHCPv6 客户端标识",
        value: { text: record.duid },
        appearance: appearance("PLUGIN_ACCENT_INDIGO", "key.fill", "PLUGIN_COMPONENT_VARIANT_TINTED")
      }
    });
  }
  return { title: record.name, components: components };
}

function wirelessPage(ctx) {
  var devicesPayload = optionalCall(ctx, "iwinfo", "devices", {}, {});
  var devices = devicesPayload.devices || [];
  if (!Array.isArray(devices) || devices.length === 0) {
    return {
      title: "无线网络",
      components: [statusBlock("PLUGIN_STATE_KIND_EMPTY", "暂无无线数据", "请确认设备具有无线功能并安装 rpcd-mod-iwinfo。", "刷新")]
    };
  }
  var components = [];
  for (var index = 0; index < devices.length; index += 1) {
    var device = String(devices[index]);
    var info = optionalCall(ctx, "iwinfo", "info", { device: device }, {});
    var clients = optionalCall(ctx, "iwinfo", "assoclist", { device: device }, {});
    var associations = clients.results || clients.assoclist || [];
    var count = Array.isArray(associations) ? associations.length : Object.keys(associations || {}).length;
    components.push({
      id: "openwrt-wifi-" + index,
      descriptionList: {
        title: String(info.ssid || device),
        columns: 2,
        items: [
          { title: "设备", value: { text: device }, appearance: appearance("PLUGIN_ACCENT_TEAL", "wifi") },
          { title: "信道", value: { number: safeNumber(info.channel) }, appearance: appearance("PLUGIN_ACCENT_BLUE", "dot.radiowaves.left.and.right") },
          { title: "频率", value: { text: info.frequency ? String(info.frequency) + " MHz" : "-" }, appearance: appearance("PLUGIN_ACCENT_INDIGO", "antenna.radiowaves.left.and.right") },
          { title: "客户端", value: { number: count }, appearance: appearance("PLUGIN_ACCENT_GREEN", "person.2.fill") }
        ],
        appearance: { accent: "PLUGIN_ACCENT_TEAL", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
      }
    });
  }
  return { title: "无线网络", components: components };
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
    if (route === "clients") return clientsPage(ctx);
    if (route.indexOf("client:") === 0) return clientDetailPage(ctx, Math.max(0, parseInt(route.slice(7), 10) || 0));
    if (route === "wireless") return wirelessPage(ctx);
    var snapshot = loadSnapshot(ctx, false);
    if (route.indexOf("interface:") === 0) return interfacePage(ctx, snapshot, Math.max(0, parseInt(route.slice(10), 10) || 0));
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
    var memory = memoryUsage(snapshot.info);
    var components = [
      valueComponent("openwrt-widget-status", String(snapshot.board.hostname || "OpenWrt"), releaseText(snapshot.board), snapshot.wan && snapshot.wan.up ? 1 : 0, "PLUGIN_VALUE_FORMAT_NUMBER", snapshot.wan && snapshot.wan.up ? "PLUGIN_ACCENT_GREEN" : "PLUGIN_ACCENT_RED", "wifi.router.fill")
    ];
    if (ctx.widgetSize === "medium" || ctx.widgetSize === "large") {
      components.push(valueComponent("openwrt-widget-memory", "内存", formatBytes(memory.used), memory.fraction, "PLUGIN_VALUE_FORMAT_PERCENT", "PLUGIN_ACCENT_PURPLE", "memorychip"));
    }
    if (ctx.widgetSize === "large") {
      components.push({ id: "openwrt-widget-interfaces", list: { title: "接口", items: interfaceItems(snapshot.interfaces, false).slice(0, 3), appearance: { accent: "PLUGIN_ACCENT_BLUE" } } });
    }
    return { title: "OpenWrt", components: components };
  } catch (error) {
    return errorPage(error);
  }
};

globalThis.background = function (ctx) {
  try {
    loadSnapshot(ctx, true);
    return {};
  } catch (error) {
    if (ctx.log && ctx.log.error) ctx.log.error(String(error && error.message ? error.message : error));
    return {};
  }
};

globalThis.actions = {
  refresh: function (ctx) {
    if (ctx.cache) ctx.cache.delete(OPENWRT_SNAPSHOT_KEY);
    return { effects: [{ refresh: { surface: "current" } }] };
  },
  reloadNetwork: function (ctx) {
    if (!configEnabled(ctx, "allow_actions", false)) throw new Error("请先在插件配置中开启设备操作");
    ubusCall(ctx, "network", "reload", {});
    if (ctx.cache) ctx.cache.delete(OPENWRT_SNAPSHOT_KEY);
    return { effects: [{ toast: { text: "已请求重载网络", level: "success", durationMs: 2200 } }, { refresh: { surface: "current" } }] };
  },
  reboot: function (ctx) {
    if (!configEnabled(ctx, "allow_actions", false)) throw new Error("请先在插件配置中开启设备操作");
    ubusCall(ctx, "system", "reboot", {});
    return { effects: [{ toast: { text: "OpenWrt 正在重启", level: "warning", durationMs: 3000 } }] };
  }
};
