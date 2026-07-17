var CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";
var CLOUDFLARE_ICON_URL = "https://www.cloudflare.com/favicon.ico";
var ACCOUNT_CACHE_KEY = "cloudflare-overview-account-v2";
var ZONE_CACHE_PREFIX = "cloudflare-overview-zone-";
var ZONE_RANGE_PREFIX = "cloudflare-overview-zone-range-";
var HOSTNAME_CACHE_PREFIX = "cloudflare-overview-hostnames-";
var SNAPSHOT_FRESH_MS = 120000;

var HTTP_ANALYTICS_QUERY = [
  "query MyServersHTTPAnalytics($zoneTag: string!, $since: DateTime!, $until: DateTime!) {",
  "  viewer {",
  "    zones(filter: { zoneTag: $zoneTag }) {",
  "      requests: httpRequestsAdaptiveGroups(",
  "        limit: 1000",
  "        filter: { datetime_geq: $since, datetime_leq: $until }",
  "        orderBy: [datetimeHour_ASC]",
  "      ) {",
  "        count",
  "        dimensions { datetimeHour }",
  "        sum { edgeResponseBytes visits }",
  "      }",
  "      cache: httpRequestsAdaptiveGroups(",
  "        limit: 1000",
  "        filter: { datetime_geq: $since, datetime_leq: $until }",
  "        orderBy: [datetimeHour_ASC]",
  "      ) {",
  "        count",
  "        dimensions { datetimeHour cacheStatus }",
  "        sum { edgeResponseBytes }",
  "      }",
  "    }",
  "  }",
  "}"
].join("\n");

var HTTP_ANALYTICS_DAILY_QUERY = [
  "query MyServersHTTPAnalyticsDaily($zoneTag: string!, $since: Date!, $until: Date!) {",
  "  viewer {",
  "    zones(filter: { zoneTag: $zoneTag }) {",
  "      requests: httpRequests1dGroups(",
  "        limit: 31",
  "        filter: { date_geq: $since, date_leq: $until }",
  "        orderBy: [date_ASC]",
  "      ) {",
  "        dimensions { date }",
  "        sum { bytes cachedBytes requests }",
  "        uniq { uniques }",
  "      }",
  "    }",
  "  }",
  "}"
].join("\n");

var ZONE_SUMMARY_QUERY = [
  "query MyServersZoneSummaries($zoneTags: [string!]!, $since: DateTime!, $until: DateTime!) {",
  "  viewer {",
  "    zones(filter: { zoneTag_in: $zoneTags }) {",
  "      zoneTag",
  "      summary: httpRequestsAdaptiveGroups(",
  "        limit: 1",
  "        filter: { datetime_geq: $since, datetime_leq: $until }",
  "      ) {",
  "        count",
  "        sum { edgeResponseBytes }",
  "      }",
  "    }",
  "  }",
  "}"
].join("\n");

var HOSTNAME_SUMMARY_QUERY = [
  "query MyServersHostnameSummaries($zoneTag: string!, $since: DateTime!, $until: DateTime!) {",
  "  viewer {",
  "    zones(filter: { zoneTag: $zoneTag }) {",
  "      hostnames: httpRequestsAdaptiveGroups(",
  "        limit: 1000",
  "        filter: { datetime_geq: $since, datetime_lt: $until, requestSource: \"eyeball\" }",
  "      ) {",
  "        count",
  "        dimensions { clientRequestHTTPHost }",
  "        sum { edgeResponseBytes visits }",
  "      }",
  "    }",
  "  }",
  "}"
].join("\n");

var HOSTNAME_ANALYTICS_QUERY = [
  "query MyServersHostnameAnalytics($zoneTag: string!, $hostname: string!, $since: DateTime!, $until: DateTime!) {",
  "  viewer {",
  "    zones(filter: { zoneTag: $zoneTag }) {",
  "      requests: httpRequestsAdaptiveGroups(",
  "        limit: 1000",
  "        filter: { datetime_geq: $since, datetime_lt: $until, clientRequestHTTPHost: $hostname, requestSource: \"eyeball\" }",
  "        orderBy: [datetimeHour_ASC]",
  "      ) {",
  "        count",
  "        dimensions { datetimeHour }",
  "        sum { edgeResponseBytes visits }",
  "      }",
  "      cache: httpRequestsAdaptiveGroups(",
  "        limit: 1000",
  "        filter: { datetime_geq: $since, datetime_lt: $until, clientRequestHTTPHost: $hostname, requestSource: \"eyeball\" }",
  "        orderBy: [datetimeHour_ASC]",
  "      ) {",
  "        dimensions { datetimeHour cacheStatus }",
  "        sum { edgeResponseBytes }",
  "      }",
  "    }",
  "  }",
  "}"
].join("\n");

function configValue(ctx, key) {
  if (!ctx.config || ctx.config[key] === undefined || ctx.config[key] === null) return "";
  return String(ctx.config[key]).trim();
}

function actionParam(ctx, key) {
  if (!ctx.params || ctx.params[key] === undefined || ctx.params[key] === null) return "";
  return String(ctx.params[key]).trim();
}

function isEnabled(ctx, key, fallback) {
  var value = configValue(ctx, key).toLowerCase();
  if (value === "") return fallback;
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function iconSource(systemName) {
  return { systemName: systemName || "cloud.fill", url: CLOUDFLARE_ICON_URL };
}

function safeNumber(value) {
  var number = Number(value);
  return isFinite(number) ? number : 0;
}

function compactNumber(value) {
  var number = safeNumber(value);
  var magnitude = Math.abs(number);
  var divisor = 1;
  var suffix = "";
  if (magnitude >= 1000000000) { divisor = 1000000000; suffix = "B"; }
  else if (magnitude >= 1000000) { divisor = 1000000; suffix = "M"; }
  else if (magnitude >= 1000) { divisor = 1000; suffix = "K"; }
  var scaled = number / divisor;
  if (!suffix) return String(Math.round(scaled));
  return (Math.abs(scaled) >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)).replace(/\.0$/, "") + suffix;
}

function compactBytes(value) {
  var bytes = Math.max(0, safeNumber(value));
  var units = ["B", "KB", "MB", "GB", "TB"];
  var index = 0;
  while (bytes >= 1024 && index < units.length - 1) {
    bytes /= 1024;
    index += 1;
  }
  return (bytes >= 100 || index === 0 ? bytes.toFixed(0) : bytes.toFixed(1)).replace(/\.0$/, "") + " " + units[index];
}

function firstErrorMessage(payload, fallback) {
  if (payload && payload.errors && payload.errors.length > 0) {
    var item = payload.errors[0] || {};
    if (item.message) return String(item.message);
  }
  return fallback;
}

function apiRequest(ctx, path, method, payload) {
  if (!ctx.http || !ctx.http.request) throw new Error("插件尚未获得 Cloudflare HTTP 访问权限");
  var token = configValue(ctx, "api_token");
  if (!token) throw new Error("请先配置 Cloudflare API Token");

  var options = {
    url: CLOUDFLARE_API + path,
    method: method || "GET",
    headers: {
      authorization: "Bearer " + token,
      accept: "application/json"
    },
    body: ""
  };
  if (payload !== undefined && payload !== null) {
    options.headers["content-type"] = "application/json";
    options.body = JSON.stringify(payload);
  }

  var response = ctx.http.request(options);
  var body = response.json;
  if (response.status < 200 || response.status >= 300) {
    throw new Error(firstErrorMessage(body, "Cloudflare API 返回 HTTP " + response.status));
  }
  if (!body) throw new Error("Cloudflare API 返回了无法解析的数据");
  if (body.success === false) throw new Error(firstErrorMessage(body, "Cloudflare API 请求失败"));
  return body;
}

function listZones(ctx) {
  var zones = [];
  var page = 1;
  var totalPages = 1;
  do {
    var payload = apiRequest(ctx, "/zones?per_page=50&page=" + page + "&order=name&direction=asc", "GET");
    zones = zones.concat(payload.result || []);
    totalPages = Math.max(1, safeNumber(payload.result_info && payload.result_info.total_pages));
    page += 1;
  } while (page <= totalPages && page <= 20);
  return zones;
}

function findZone(zones, zoneID) {
  for (var index = 0; index < zones.length; index += 1) {
    if (String(zones[index].id || "") === String(zoneID || "")) return zones[index];
  }
  return null;
}

function zoneRoute(zoneID, section) {
  return "zone:" + String(zoneID || "") + ":" + String(section || "overview");
}

function hostnameRoute(zoneID, hostname) {
  return zoneRoute(zoneID, "hostname") + ":" + encodeURIComponent(String(hostname || ""));
}

function decodeRouteValue(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch (_) {
    return String(value || "");
  }
}

function parseRoute(route) {
  var parts = String(route || "zones").split(":");
  if (parts[0] === "zone" && parts[1]) {
    return { kind: "zone", zoneID: parts[1], section: parts[2] || "overview", recordID: decodeRouteValue(parts.slice(3).join(":")) };
  }
  if (parts[0] === "tunnels") {
    return { kind: "tunnels", accountID: parts[1] || "" };
  }
  return { kind: "zones" };
}

function hourLabel(value) {
  var text = String(value || "");
  var match = text.match(/T(\d{2}):/);
  return match ? match[1] + ":00" : text.slice(0, 10);
}

function dayLabel(value) {
  var text = String(value || "");
  var match = text.match(/-(\d{2})-(\d{2})/);
  return match ? match[1] + "/" + match[2] : text.slice(0, 10);
}

function dateValue(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function analyticsRangeConfig(value) {
  var ranges = {
    "24h": { key: "24h", label: "最近 24 小时", days: 1, daily: false },
    "7d": { key: "7d", label: "最近 7 天", days: 7, daily: true },
    "30d": { key: "30d", label: "最近 30 天", days: 30, daily: true }
  };
  return ranges[String(value || "")] || ranges["24h"];
}

function analyticsRangeDates(rangeKey) {
  var range = analyticsRangeConfig(rangeKey);
  var until = new Date();
  var since = new Date(until.getTime() - range.days * 24 * 60 * 60 * 1000);
  return { range: range, since: since, until: until };
}

function adaptiveQueryWindows(rangeKey) {
  var dates = analyticsRangeDates(rangeKey);
  if (!dates.range.daily) return { range: dates.range, windows: [{ since: dates.since, until: dates.until }] };
  var windows = [];
  var end = dates.until;
  for (var index = 0; index < dates.range.days; index += 1) {
    var start = new Date(Math.max(dates.since.getTime(), end.getTime() - 24 * 60 * 60 * 1000));
    windows.push({ since: start, until: end });
    end = start;
  }
  return { range: dates.range, windows: windows };
}

function selectedAnalyticsRange(ctx, zoneID) {
  if (!ctx.cache) return "24h";
  var selected = ctx.cache.get(ZONE_RANGE_PREFIX + String(zoneID || ""));
  return analyticsRangeConfig(selected).key;
}

function cacheStatusIsHit(status) {
  var normalized = String(status || "").toLowerCase();
  return normalized === "hit" || normalized === "revalidated" || normalized === "updating" || normalized === "stale";
}

function queryAnalytics(ctx, zoneID, rangeKey) {
  var range = analyticsRangeConfig(rangeKey);
  var until = new Date();
  var since = new Date(until.getTime() - (range.daily ? range.days - 1 : range.days) * 24 * 60 * 60 * 1000);
  var response = apiRequest(ctx, "/graphql", "POST", {
    query: range.daily ? HTTP_ANALYTICS_DAILY_QUERY : HTTP_ANALYTICS_QUERY,
    variables: {
      zoneTag: zoneID,
      since: range.daily ? dateValue(since) : since.toISOString(),
      until: range.daily ? dateValue(until) : until.toISOString()
    }
  });
  if (response.errors && response.errors.length > 0) {
    throw new Error(firstErrorMessage(response, "Cloudflare Analytics 查询失败"));
  }

  var zones = response.data && response.data.viewer && response.data.viewer.zones;
  if (!zones || zones.length === 0) throw new Error("Analytics 没有返回当前 Zone 的数据");
  var requestGroups = zones[0].requests || [];
  var cacheGroups = zones[0].cache || [];
  var result = {
    requests: 0,
    bytes: 0,
    visits: 0,
    cachedBytes: 0,
    cacheHitRatio: 0,
    rangeKey: range.key,
    rangeLabel: range.label,
    points: []
  };
  var index;
  for (index = 0; index < requestGroups.length; index += 1) {
    var requestGroup = requestGroups[index] || {};
    var requestSum = requestGroup.sum || {};
    var count = range.daily ? safeNumber(requestSum.requests) : safeNumber(requestGroup.count);
    result.requests += count;
    result.bytes += safeNumber(range.daily ? requestSum.bytes : requestSum.edgeResponseBytes);
    result.visits += safeNumber(range.daily ? requestGroup.uniq && requestGroup.uniq.uniques : requestSum.visits);
    if (range.daily) result.cachedBytes += safeNumber(requestSum.cachedBytes);
    result.points.push({
      label: range.daily
        ? dayLabel(requestGroup.dimensions && requestGroup.dimensions.date)
        : hourLabel(requestGroup.dimensions && requestGroup.dimensions.datetimeHour),
      value: count
    });
  }
  for (index = 0; index < cacheGroups.length; index += 1) {
    var cacheGroup = cacheGroups[index] || {};
    if (cacheStatusIsHit(cacheGroup.dimensions && cacheGroup.dimensions.cacheStatus)) {
      result.cachedBytes += safeNumber(cacheGroup.sum && cacheGroup.sum.edgeResponseBytes);
    }
  }
  if (result.bytes > 0) result.cacheHitRatio = Math.max(0, Math.min(1, result.cachedBytes / result.bytes));
  return result;
}

function queryHostnameSummaries(ctx, zoneID, rangeKey) {
  var windowConfig = adaptiveQueryWindows(rangeKey);
  var cacheKey = HOSTNAME_CACHE_PREFIX + "summary-" + String(zoneID || "") + "-" + windowConfig.range.key;
  var cached = cachedSnapshot(ctx, cacheKey);
  if (cached && safeNumber(cached.fetchedAt) > Date.now() - SNAPSHOT_FRESH_MS) return cached;
  var merged = {};
  var successfulWindows = 0;
  for (var windowIndex = 0; windowIndex < windowConfig.windows.length; windowIndex += 1) {
    var window = windowConfig.windows[windowIndex];
    var response;
    try {
      response = apiRequest(ctx, "/graphql", "POST", {
        query: HOSTNAME_SUMMARY_QUERY,
        variables: {
          zoneTag: zoneID,
          since: window.since.toISOString(),
          until: window.until.toISOString()
        }
      });
      if (response.errors && response.errors.length > 0) {
        throw new Error(firstErrorMessage(response, "子域名 Analytics 查询失败"));
      }
    } catch (error) {
      if (successfulWindows > 0) break;
      throw error;
    }
    var zones = response.data && response.data.viewer && response.data.viewer.zones;
    if (!zones || zones.length === 0) {
      if (successfulWindows > 0) break;
      throw new Error("Analytics 没有返回当前 Zone 的子域名数据");
    }
    var groups = zones[0].hostnames || [];
    for (var groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      var group = groups[groupIndex] || {};
      var hostname = String(group.dimensions && group.dimensions.clientRequestHTTPHost || "").trim();
      if (!hostname) continue;
      if (!merged[hostname]) merged[hostname] = { hostname: hostname, requests: 0, bytes: 0, visits: 0 };
      merged[hostname].requests += safeNumber(group.count);
      merged[hostname].bytes += safeNumber(group.sum && group.sum.edgeResponseBytes);
      merged[hostname].visits += safeNumber(group.sum && group.sum.visits);
    }
    successfulWindows += 1;
  }
  var items = [];
  var hostnames = Object.keys(merged);
  for (var index = 0; index < hostnames.length; index += 1) {
    items.push(merged[hostnames[index]]);
  }
  items.sort(function(left, right) { return right.requests - left.requests; });
  var rangeLabel = windowConfig.range.label;
  if (successfulWindows < windowConfig.windows.length) rangeLabel += " · 可用 " + successfulWindows + " 天";
  var result = { fetchedAt: Date.now(), rangeKey: windowConfig.range.key, rangeLabel: rangeLabel, availableDays: successfulWindows, items: items };
  if (ctx.cache) ctx.cache.set(cacheKey, result, { ttlMs: 15 * 60 * 1000 });
  return result;
}

function queryHostnameAnalytics(ctx, zoneID, hostname, rangeKey) {
  var windowConfig = adaptiveQueryWindows(rangeKey);
  var cacheKey = HOSTNAME_CACHE_PREFIX + "detail-" + String(zoneID || "") + "-" + windowConfig.range.key + "-" + String(hostname || "");
  var cached = cachedSnapshot(ctx, cacheKey);
  if (cached && safeNumber(cached.fetchedAt) > Date.now() - SNAPSHOT_FRESH_MS) return cached;
  var result = {
    fetchedAt: Date.now(),
    hostname: hostname,
    rangeKey: windowConfig.range.key,
    rangeLabel: windowConfig.range.label,
    requests: 0,
    bytes: 0,
    visits: 0,
    cachedBytes: 0,
    cacheHitRatio: 0,
    points: []
  };
  var dailyPoints = {};
  var successfulWindows = 0;
  for (var windowIndex = 0; windowIndex < windowConfig.windows.length; windowIndex += 1) {
    var window = windowConfig.windows[windowIndex];
    var response;
    try {
      response = apiRequest(ctx, "/graphql", "POST", {
        query: HOSTNAME_ANALYTICS_QUERY,
        variables: {
          zoneTag: zoneID,
          hostname: hostname,
          since: window.since.toISOString(),
          until: window.until.toISOString()
        }
      });
      if (response.errors && response.errors.length > 0) {
        throw new Error(firstErrorMessage(response, "子域名流量趋势查询失败"));
      }
    } catch (error) {
      if (successfulWindows > 0) break;
      throw error;
    }
    var zones = response.data && response.data.viewer && response.data.viewer.zones;
    if (!zones || zones.length === 0) {
      if (successfulWindows > 0) break;
      throw new Error("Analytics 没有返回当前子域名的数据");
    }
    var requestGroups = zones[0].requests || [];
    var cacheGroups = zones[0].cache || [];
    for (var requestIndex = 0; requestIndex < requestGroups.length; requestIndex += 1) {
      var group = requestGroups[requestIndex] || {};
      var count = safeNumber(group.count);
      var datetime = group.dimensions && group.dimensions.datetimeHour;
      result.requests += count;
      result.bytes += safeNumber(group.sum && group.sum.edgeResponseBytes);
      result.visits += safeNumber(group.sum && group.sum.visits);
      if (windowConfig.range.daily) {
        var date = String(datetime || "").slice(0, 10);
        dailyPoints[date] = safeNumber(dailyPoints[date]) + count;
      } else {
        result.points.push({ label: hourLabel(datetime), value: count });
      }
    }
    for (var cacheIndex = 0; cacheIndex < cacheGroups.length; cacheIndex += 1) {
      var cacheGroup = cacheGroups[cacheIndex] || {};
      if (cacheStatusIsHit(cacheGroup.dimensions && cacheGroup.dimensions.cacheStatus)) {
        result.cachedBytes += safeNumber(cacheGroup.sum && cacheGroup.sum.edgeResponseBytes);
      }
    }
    successfulWindows += 1;
  }
  if (windowConfig.range.daily) {
    var days = Object.keys(dailyPoints).sort();
    for (var index = 0; index < days.length; index += 1) {
      result.points.push({ label: dayLabel(days[index]), value: dailyPoints[days[index]] });
    }
  }
  result.availableDays = successfulWindows;
  if (successfulWindows < windowConfig.windows.length) result.rangeLabel += " · 可用 " + successfulWindows + " 天";
  if (result.bytes > 0) result.cacheHitRatio = Math.max(0, Math.min(1, result.cachedBytes / result.bytes));
  if (ctx.cache) ctx.cache.set(cacheKey, result, { ttlMs: 15 * 60 * 1000 });
  return result;
}

function summarizeDNS(records) {
  var result = { total: records.length, proxied: 0, dnsOnly: 0, typeCounts: {}, records: [] };
  for (var index = 0; index < records.length; index += 1) {
    var record = records[index] || {};
    if (record.proxied) result.proxied += 1;
    else result.dnsOnly += 1;
    var type = String(record.type || "其他");
    result.typeCounts[type] = safeNumber(result.typeCounts[type]) + 1;
    result.records.push({
      id: String(record.id || index),
      type: type,
      name: String(record.name || "—"),
      content: String(record.content || "—"),
      proxied: !!record.proxied,
      proxiable: !!record.proxiable,
      ttl: safeNumber(record.ttl),
      comment: String(record.comment || ""),
      priority: record.priority === undefined || record.priority === null ? "" : String(record.priority)
    });
  }
  return result;
}

function summarizeTunnels(tunnels) {
  var result = { total: tunnels.length, healthy: 0, degraded: 0, down: 0, inactive: 0, items: [] };
  for (var index = 0; index < tunnels.length; index += 1) {
    var tunnel = tunnels[index] || {};
    var status = String(tunnel.status || "inactive").toLowerCase();
    if (status === "healthy") result.healthy += 1;
    else if (status === "degraded") result.degraded += 1;
    else if (status === "down") result.down += 1;
    else result.inactive += 1;
    result.items.push({
      id: String(tunnel.id || index),
      name: String(tunnel.name || "未命名 Tunnel"),
      status: status,
      configSource: String(tunnel.config_src || "—"),
      type: String(tunnel.tun_type || "cfd_tunnel")
    });
  }
  return result;
}

function queryZoneSummaries(ctx, zones) {
  var summaries = {};
  var until = new Date();
  var since = new Date(until.getTime() - 24 * 60 * 60 * 1000);
  for (var start = 0; start < zones.length; start += 10) {
    var zoneIDs = [];
    for (var index = start; index < zones.length && index < start + 10; index += 1) {
      if (zones[index] && zones[index].id) zoneIDs.push(String(zones[index].id));
    }
    if (zoneIDs.length === 0) continue;
    var response = apiRequest(ctx, "/graphql", "POST", {
      query: ZONE_SUMMARY_QUERY,
      variables: { zoneTags: zoneIDs, since: since.toISOString(), until: until.toISOString() }
    });
    if (response.errors && response.errors.length > 0) throw new Error(firstErrorMessage(response, "Cloudflare Analytics 查询失败"));
    var resultZones = response.data && response.data.viewer && response.data.viewer.zones;
    resultZones = resultZones || [];
    for (var zoneIndex = 0; zoneIndex < resultZones.length; zoneIndex += 1) {
      var resultZone = resultZones[zoneIndex] || {};
      var groups = resultZone.summary || [];
      var requests = 0;
      var bytes = 0;
      for (var groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
        requests += safeNumber(groups[groupIndex] && groups[groupIndex].count);
        bytes += safeNumber(groups[groupIndex] && groups[groupIndex].sum && groups[groupIndex].sum.edgeResponseBytes);
      }
      if (resultZone.zoneTag) summaries[String(resultZone.zoneTag)] = { requests: requests, bytes: bytes };
    }
  }
  return summaries;
}

function loadAccountSnapshot(ctx) {
  var zones = listZones(ctx);
  if (zones.length === 0) throw new Error("当前 Token 没有可读取的 Cloudflare Zone");
  var snapshot = {
    fetchedAt: Date.now(),
    zoneCount: zones.length,
    zones: zones,
    activeCount: 0,
    pausedCount: 0,
    accounts: {},
    zoneSummaries: {},
    warnings: []
  };
  for (var index = 0; index < zones.length; index += 1) {
    var zone = zones[index] || {};
    if (zone.status === "active" && !zone.paused) snapshot.activeCount += 1;
    if (zone.paused) snapshot.pausedCount += 1;
    if (zone.account && zone.account.id) snapshot.accounts[zone.account.id] = zone.account.name || "Cloudflare";
  }
  try {
    snapshot.zoneSummaries = queryZoneSummaries(ctx, zones);
  } catch (analyticsError) {
    snapshot.warnings.push("Analytics：" + String(analyticsError.message || analyticsError));
  }
  if (ctx.cache) ctx.cache.set(ACCOUNT_CACHE_KEY, snapshot, { ttlMs: 15 * 60 * 1000 });
  return snapshot;
}

function loadZoneSnapshot(ctx, zone, rangeKey) {
  var range = analyticsRangeConfig(rangeKey);
  var snapshot = {
    fetchedAt: Date.now(),
    zone: zone,
    dns: { total: 0, proxied: 0, dnsOnly: 0, typeCounts: {}, records: [] },
    analytics: { requests: 0, bytes: 0, visits: 0, cachedBytes: 0, cacheHitRatio: 0, rangeKey: range.key, rangeLabel: range.label, points: [] },
    tunnels: { total: 0, healthy: 0, degraded: 0, down: 0, inactive: 0, items: [] },
    warnings: []
  };

  try {
    var dnsPayload = apiRequest(ctx, "/zones/" + encodeURIComponent(zone.id) + "/dns_records?per_page=100", "GET");
    snapshot.dns = summarizeDNS(dnsPayload.result || []);
  } catch (dnsError) {
    snapshot.warnings.push("DNS：" + String(dnsError.message || dnsError));
  }

  try {
    snapshot.analytics = queryAnalytics(ctx, zone.id, range.key);
  } catch (analyticsError) {
    snapshot.warnings.push("Analytics：" + String(analyticsError.message || analyticsError));
  }

  var accountID = configValue(ctx, "account_id") || (zone.account && zone.account.id) || "";
  if (isEnabled(ctx, "show_tunnels", true) && accountID) {
    try {
      var tunnelPayload = apiRequest(ctx, "/accounts/" + encodeURIComponent(accountID) + "/cfd_tunnel?is_deleted=false&per_page=100", "GET");
      snapshot.tunnels = summarizeTunnels(tunnelPayload.result || []);
    } catch (tunnelError) {
      snapshot.warnings.push("Tunnel：" + String(tunnelError.message || tunnelError));
    }
  }

  if (ctx.cache) ctx.cache.set(ZONE_CACHE_PREFIX + zone.id + "-" + range.key, snapshot, { ttlMs: 15 * 60 * 1000 });
  return snapshot;
}

function cachedSnapshot(ctx, key) {
  if (!ctx.cache) return null;
  return ctx.cache.get(key);
}

function getAccountSnapshot(ctx, force) {
  var cached = cachedSnapshot(ctx, ACCOUNT_CACHE_KEY);
  if (!force && cached && safeNumber(cached.fetchedAt) > Date.now() - SNAPSHOT_FRESH_MS) return cached;
  try {
    return loadAccountSnapshot(ctx);
  } catch (error) {
    if (cached) {
      cached.warnings = (cached.warnings || []).concat(["刷新失败，正在展示缓存：" + String(error.message || error)]);
      return cached;
    }
    return { error: String(error.message || error), warnings: [] };
  }
}

function getZoneSnapshot(ctx, accountSnapshot, zoneID, force, rangeKey) {
  var zone = findZone(accountSnapshot.zones || [], zoneID);
  if (!zone) return { error: "没有找到所选域名，请返回域名列表后重试", warnings: [] };
  var range = analyticsRangeConfig(rangeKey || selectedAnalyticsRange(ctx, zone.id));
  var cacheKey = ZONE_CACHE_PREFIX + zone.id + "-" + range.key;
  var cached = cachedSnapshot(ctx, cacheKey);
  if (!force && cached && safeNumber(cached.fetchedAt) > Date.now() - SNAPSHOT_FRESH_MS) return cached;
  try {
    return loadZoneSnapshot(ctx, zone, range.key);
  } catch (error) {
    if (cached) {
      cached.warnings = (cached.warnings || []).concat(["刷新失败，正在展示缓存：" + String(error.message || error)]);
      return cached;
    }
    return { error: String(error.message || error), warnings: [] };
  }
}

function stateStatus(status) {
  if (status === "active" || status === "healthy") return "PLUGIN_STATUS_HEALTHY";
  if (status === "degraded" || status === "pending" || status === "initializing") return "PLUGIN_STATUS_WARNING";
  if (status === "down" || status === "moved") return "PLUGIN_STATUS_ERROR";
  return "PLUGIN_STATUS_STOPPED";
}

function stateAccent(status) {
  if (status === "active" || status === "healthy") return "PLUGIN_ACCENT_GREEN";
  if (status === "degraded" || status === "pending" || status === "initializing") return "PLUGIN_ACCENT_ORANGE";
  if (status === "down" || status === "moved") return "PLUGIN_ACCENT_RED";
  return "PLUGIN_ACCENT_GRAY";
}

function statusText(status) {
  var values = {
    active: "正常",
    healthy: "健康",
    degraded: "降级",
    down: "离线",
    inactive: "未连接",
    pending: "等待接入",
    initializing: "初始化中",
    moved: "已迁移"
  };
  return values[status] || String(status || "未知");
}

function errorState(message) {
  return {
    id: "cloudflare-error",
    stateBlock: {
      kind: "PLUGIN_STATE_KIND_ERROR",
      title: "无法读取 Cloudflare",
      message: message,
      actionTitle: "重试",
      action: { plugin: { actionId: "refresh" } },
      appearance: { accent: "PLUGIN_ACCENT_ORANGE", iconSource: iconSource("cloud.fill") }
    }
  };
}

function headerComponents(snapshot, prefix) {
  var zone = snapshot.zone || {};
  var rangeLabel = (snapshot.analytics && snapshot.analytics.rangeLabel) || "最近 24 小时";
  return [
    {
      id: prefix + "-header",
      stack: {
        axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL",
        spacing: 10,
        children: [
          { id: prefix + "-icon", icon: { appearance: { accent: "PLUGIN_ACCENT_ORANGE", size: "PLUGIN_COMPONENT_SIZE_LARGE", iconSource: iconSource("cloud.fill") } } },
          { id: prefix + "-title", text: { text: zone.name || "Cloudflare", style: "PLUGIN_TEXT_STYLE_TITLE" } },
          { id: prefix + "-status", badge: { text: zone.paused ? "暂停" : statusText(zone.status), appearance: { accent: zone.paused ? "PLUGIN_ACCENT_ORANGE" : stateAccent(zone.status) } } }
        ]
      }
    },
    { id: prefix + "-subtitle", text: { text: rangeLabel, style: "PLUGIN_TEXT_STYLE_CAPTION", appearance: { accent: "PLUGIN_ACCENT_GRAY" } } }
  ];
}

function overviewGrid(snapshot, prefix) {
  var tunnels = snapshot.tunnels || {};
  return {
    id: prefix + "-overview-grid",
    grid: {
      columns: 2,
      spacing: 10,
      appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
      children: [
        {
          id: prefix + "-requests",
          value: {
            title: "请求",
            value: { number: safeNumber(snapshot.analytics && snapshot.analytics.requests), format: "PLUGIN_VALUE_FORMAT_NUMBER", status: "PLUGIN_STATUS_RUNNING" },
            appearance: { accent: "PLUGIN_ACCENT_ORANGE", iconSource: { systemName: "arrow.up.arrow.down.circle.fill" }, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
          }
        },
        {
          id: prefix + "-bandwidth",
          value: {
            title: "流量",
            value: { number: safeNumber(snapshot.analytics && snapshot.analytics.bytes), format: "PLUGIN_VALUE_FORMAT_BYTES" },
            appearance: { accent: "PLUGIN_ACCENT_BLUE", iconSource: { systemName: "network" }, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
          }
        },
        {
          id: prefix + "-dns",
          value: {
            title: "DNS",
            value: { number: safeNumber(snapshot.dns && snapshot.dns.total), format: "PLUGIN_VALUE_FORMAT_NUMBER" },
            appearance: { accent: "PLUGIN_ACCENT_INDIGO", iconSource: { systemName: "globe" }, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
          }
        },
        {
          id: prefix + "-tunnels",
          value: {
            title: "Tunnel",
            value: { number: safeNumber(tunnels.total), format: "PLUGIN_VALUE_FORMAT_NUMBER", status: safeNumber(tunnels.down) > 0 ? "PLUGIN_STATUS_ERROR" : "PLUGIN_STATUS_HEALTHY" },
            appearance: { accent: safeNumber(tunnels.down) > 0 ? "PLUGIN_ACCENT_RED" : "PLUGIN_ACCENT_TEAL", iconSource: { systemName: "point.3.connected.trianglepath.dotted" }, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
          }
        }
      ]
    }
  };
}

function accountSummaryGrid(snapshot, prefix) {
  var accountCount = Object.keys(snapshot.accounts || {}).length;
  return {
    id: prefix + "-summary-grid",
    grid: {
      columns: 2,
      spacing: 10,
      appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
      children: [
        {
          id: prefix + "-summary-zones",
          value: {
            title: "域名",
            value: { number: safeNumber(snapshot.zoneCount), format: "PLUGIN_VALUE_FORMAT_NUMBER", status: "PLUGIN_STATUS_RUNNING" },
            appearance: { accent: "PLUGIN_ACCENT_ORANGE", iconSource: { systemName: "globe" }, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
            onTap: { navigate: { surface: "detail", route: "zones" } }
          }
        },
        {
          id: prefix + "-summary-active",
          value: {
            title: "正常",
            value: { number: safeNumber(snapshot.activeCount), format: "PLUGIN_VALUE_FORMAT_NUMBER", status: "PLUGIN_STATUS_HEALTHY" },
            appearance: { accent: "PLUGIN_ACCENT_GREEN", iconSource: { systemName: "checkmark.circle.fill" }, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
            onTap: { navigate: { surface: "detail", route: "zones" } }
          }
        },
        {
          id: prefix + "-summary-accounts",
          value: {
            title: "账户",
            value: { number: accountCount, format: "PLUGIN_VALUE_FORMAT_NUMBER" },
            appearance: { accent: "PLUGIN_ACCENT_BLUE", iconSource: { systemName: "person.crop.circle" }, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
            onTap: { navigate: { surface: "detail", route: "zones" } }
          }
        },
        {
          id: prefix + "-summary-paused",
          value: {
            title: "已暂停",
            value: { number: safeNumber(snapshot.pausedCount), format: "PLUGIN_VALUE_FORMAT_NUMBER", status: safeNumber(snapshot.pausedCount) > 0 ? "PLUGIN_STATUS_WARNING" : "PLUGIN_STATUS_NEUTRAL" },
            appearance: { accent: safeNumber(snapshot.pausedCount) > 0 ? "PLUGIN_ACCENT_ORANGE" : "PLUGIN_ACCENT_GRAY", iconSource: { systemName: "pause.circle.fill" }, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
            onTap: { navigate: { surface: "detail", route: "zones" } }
          }
        }
      ]
    }
  };
}

function analyticsRangeMenu(snapshot, prefix) {
  var zone = snapshot.zone || {};
  var current = analyticsRangeConfig(snapshot.analytics && snapshot.analytics.rangeKey);
  var choices = [analyticsRangeConfig("24h"), analyticsRangeConfig("7d"), analyticsRangeConfig("30d")];
  var items = [];
  for (var index = 0; index < choices.length; index += 1) {
    var choice = choices[index];
    items.push({
      title: choice.label,
      appearance: { iconSource: { systemName: choice.key === current.key ? "checkmark" : "calendar" } },
      onTap: { plugin: { actionId: "selectAnalyticsRange", params: { zone_id: String(zone.id || ""), range: choice.key } } }
    });
  }
  return {
    id: prefix + "-analytics-range",
    actionMenu: {
      title: current.label,
      items: items,
      appearance: {
        accent: "PLUGIN_ACCENT_ORANGE",
        size: "PLUGIN_COMPONENT_SIZE_COMPACT",
        iconSource: { systemName: "calendar.badge.clock" },
        variant: "PLUGIN_COMPONENT_VARIANT_TINTED",
        hideBackground: true
      }
    }
  };
}

function analyticsComponents(snapshot, prefix) {
  var analytics = snapshot.analytics || {};
  var points = analytics.points || [];
  var chartChildren = [{
    id: prefix + "-request-chart-header",
    stack: {
      axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL",
      spacing: 8,
      appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
      children: [
        { id: prefix + "-request-chart-title", text: { text: "请求趋势", style: "PLUGIN_TEXT_STYLE_SUBTITLE" } },
        analyticsRangeMenu(snapshot, prefix)
      ]
    }
  }];
  if (points.length > 0) {
    chartChildren.push({
      id: prefix + "-request-chart",
      chart: {
        title: "",
        kind: "PLUGIN_CHART_KIND_AREA",
        points: points,
        options: { min: 0, showLabels: true, hideRange: true, emptyText: "暂无 Analytics 数据" },
        appearance: { accent: "PLUGIN_ACCENT_ORANGE", hideBackground: true }
      }
    });
  } else {
    chartChildren.push({
      id: prefix + "-analytics-empty",
      stateBlock: {
        kind: "PLUGIN_STATE_KIND_EMPTY",
        title: "暂无流量数据",
        message: "请确认 Token 包含 Analytics Read 权限，且当前域名已有代理流量。",
        appearance: { accent: "PLUGIN_ACCENT_ORANGE", iconSource: { systemName: "chart.xyaxis.line" }, hideBackground: true }
      }
    });
  }
  var result = [{
    id: prefix + "-request-chart-card",
    card: {
      appearance: { accent: "PLUGIN_ACCENT_ORANGE", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
      children: chartChildren
    }
  }];
  var cacheRatio = Math.max(0, Math.min(1, safeNumber(analytics.cacheHitRatio)));
  result.push({
    id: prefix + "-cache-gauge",
    segmentedGauge: {
      title: "缓存流量占比",
      segments: [
        { label: "缓存命中", value: cacheRatio * 100, appearance: { accent: "PLUGIN_ACCENT_ORANGE" } },
        { label: "回源流量", value: (1 - cacheRatio) * 100, appearance: { accent: "PLUGIN_ACCENT_GRAY" } }
      ],
      centerValue: { number: cacheRatio, format: "PLUGIN_VALUE_FORMAT_PERCENT" },
      showLegend: true,
      appearance: { accent: "PLUGIN_ACCENT_ORANGE" }
    }
  });
  return result;
}

function dnsList(snapshot, limit, prefix) {
  var records = (snapshot.dns && snapshot.dns.records) || [];
  var zoneID = snapshot.zone && snapshot.zone.id;
  var items = [];
  for (var index = 0; index < records.length && index < limit; index += 1) {
    var record = records[index];
    items.push({
      title: record.name,
      subtitle: record.type + " · " + record.content,
      value: { text: record.proxied ? "已代理" : "仅 DNS", status: record.proxied ? "PLUGIN_STATUS_RUNNING" : "PLUGIN_STATUS_NEUTRAL" },
      appearance: { accent: record.proxied ? "PLUGIN_ACCENT_ORANGE" : "PLUGIN_ACCENT_GRAY", iconSource: { systemName: record.proxied ? "cloud.fill" : "network" } },
      onTap: { navigate: { surface: "detail", route: zoneRoute(zoneID, "dns-record") + ":" + record.id } }
    });
  }
  if (items.length === 0) {
    return { id: prefix + "-dns-empty", stateBlock: { kind: "PLUGIN_STATE_KIND_EMPTY", title: "暂无 DNS 记录", message: "当前 Zone 没有可展示的记录，或 Token 未授权 DNS Read。", appearance: { accent: "PLUGIN_ACCENT_INDIGO", iconSource: { systemName: "globe" } } } };
  }
  return { id: prefix + "-dns-list", list: { title: "DNS 记录", items: items, appearance: { accent: "PLUGIN_ACCENT_INDIGO", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" } } };
}

function findDNSRecord(snapshot, recordID) {
  var records = (snapshot.dns && snapshot.dns.records) || [];
  for (var index = 0; index < records.length; index += 1) {
    if (String(records[index].id || "") === String(recordID || "")) return records[index];
  }
  return null;
}

function editableDNSRecordType(type) {
  return type === "A" || type === "AAAA" || type === "CNAME" || type === "TXT";
}

function dnsRecordDetailComponents(ctx, snapshot, record) {
  var zoneID = snapshot.zone && snapshot.zone.id;
  var components = [
    {
      id: "dns-record-details",
      descriptionList: {
        title: "DNS 记录详情",
        columns: 2,
        items: [
          { title: "类型", value: { text: record.type } },
          { title: "代理", value: { text: record.proxied ? "已代理" : "仅 DNS", status: record.proxied ? "PLUGIN_STATUS_RUNNING" : "PLUGIN_STATUS_NEUTRAL" } },
          { title: "名称", value: { text: record.name } },
          { title: "TTL", value: { text: record.ttl === 1 ? "自动" : String(record.ttl) + " 秒" } },
          { title: "内容", value: { text: record.content } },
          { title: "备注", value: { text: record.comment || "—" } }
        ],
        appearance: { accent: "PLUGIN_ACCENT_INDIGO" }
      }
    }
  ];
  if (!isEnabled(ctx, "enable_dns_write", false)) {
    components.push({
      id: "dns-record-read-only",
      stateBlock: {
        kind: "PLUGIN_STATE_KIND_EMPTY",
        title: "当前为只读模式",
        message: "在插件配置中开启 DNS 写操作，并使用具备 DNS Write 权限的 API Token 后可编辑。",
        appearance: { accent: "PLUGIN_ACCENT_GRAY", iconSource: { systemName: "lock.fill" } }
      }
    });
    return components;
  }
  if (editableDNSRecordType(record.type)) {
    var fields = [
      { key: "name", label: "名称", input: "PLUGIN_CONFIG_INPUT_TEXT", value: record.name, required: true },
      { key: "content", label: "内容", input: "PLUGIN_CONFIG_INPUT_TEXTAREA", value: record.content, required: true },
      { key: "ttl", label: "TTL", description: "1 表示自动", input: "PLUGIN_CONFIG_INPUT_NUMBER", value: String(record.ttl || 1), required: true },
      { key: "comment", label: "备注", input: "PLUGIN_CONFIG_INPUT_TEXT", value: record.comment || "" }
    ];
    if (record.proxiable) fields.push({ key: "proxied", label: "启用 Cloudflare 代理", input: "PLUGIN_CONFIG_INPUT_SWITCH", value: record.proxied ? "true" : "false" });
    components.push({
      id: "dns-record-edit",
      form: {
        title: "编辑记录",
        submitTitle: "保存修改",
        fields: fields,
        onSubmit: { plugin: { actionId: "updateDnsRecord", params: { zone_id: zoneID, record_id: record.id, type: record.type, proxiable: record.proxiable ? "true" : "false" } } },
        appearance: { accent: "PLUGIN_ACCENT_ORANGE" }
      }
    });
  } else {
    components.push({ id: "dns-record-edit-unsupported", text: { text: record.type + " 记录暂不支持在 App 内编辑，可查看或删除。", style: "PLUGIN_TEXT_STYLE_CAPTION", appearance: { accent: "PLUGIN_ACCENT_GRAY" } } });
  }
  components.push({
    id: "dns-record-delete",
    confirm: {
      title: "删除 DNS 记录",
      message: "确定删除 " + record.name + " 的 " + record.type + " 记录吗？此操作无法撤销。",
      confirmTitle: "删除",
      cancelTitle: "取消",
      destructive: true,
      onConfirm: { plugin: { actionId: "deleteDnsRecord", params: { zone_id: zoneID, record_id: record.id } } },
      appearance: { accent: "PLUGIN_ACCENT_RED", iconSource: { systemName: "trash.fill" } }
    }
  });
  return components;
}

function tunnelList(snapshot, limit, prefix) {
  var tunnels = (snapshot.tunnels && snapshot.tunnels.items) || [];
  var items = [];
  for (var index = 0; index < tunnels.length && index < limit; index += 1) {
    var tunnel = tunnels[index];
    var accent = stateAccent(tunnel.status);
    items.push({
      id: prefix + "-tunnel-" + String(tunnel.id || index),
      card: {
        appearance: { accent: accent, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
        children: [{
          id: prefix + "-tunnel-row-" + String(tunnel.id || index),
          stack: {
            axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL",
            spacing: 10,
            appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
            children: [
              { id: prefix + "-tunnel-icon-" + String(tunnel.id || index), icon: { appearance: { accent: accent, iconSource: { systemName: "point.3.connected.trianglepath.dotted" } } } },
              { id: prefix + "-tunnel-copy-" + String(tunnel.id || index), stack: { spacing: 2, appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" }, children: [
                { id: prefix + "-tunnel-name-" + String(tunnel.id || index), text: { text: tunnel.name, style: "PLUGIN_TEXT_STYLE_SUBTITLE" } },
                { id: prefix + "-tunnel-subtitle-" + String(tunnel.id || index), text: { text: tunnel.type + " · " + tunnel.configSource, style: "PLUGIN_TEXT_STYLE_CAPTION", appearance: { accent: "PLUGIN_ACCENT_GRAY" } } }
              ] } },
              { id: prefix + "-tunnel-spacer-" + String(tunnel.id || index), spacer: {} },
              { id: prefix + "-tunnel-status-" + String(tunnel.id || index), badge: { text: statusText(tunnel.status), appearance: { accent: accent } } }
            ]
          }
        }]
      }
    });
  }
  if (items.length === 0) {
    return { id: prefix + "-tunnel-empty", stateBlock: { kind: "PLUGIN_STATE_KIND_EMPTY", title: "暂无 Tunnel", message: "没有发现 Cloudflare Tunnel，或 Token 未授权 Tunnel Read。", appearance: { accent: "PLUGIN_ACCENT_TEAL", iconSource: { systemName: "point.3.connected.trianglepath.dotted" } } } };
  }
  return { id: prefix + "-tunnel-list", stack: { spacing: 10, appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" }, children: [
    { id: prefix + "-tunnel-title", text: { text: "Cloudflare Tunnel", style: "PLUGIN_TEXT_STYLE_SUBTITLE" } },
    { id: prefix + "-tunnel-items", stack: { spacing: 8, appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" }, children: items } }
  ] } };
}

function warningComponent(snapshot, prefix) {
  var warnings = snapshot.warnings || [];
  if (warnings.length === 0) return null;
  var children = [];
  for (var index = 0; index < warnings.length; index += 1) {
    children.push({ id: prefix + "-warning-" + index, text: { text: warnings[index], style: "PLUGIN_TEXT_STYLE_CAPTION", appearance: { accent: "PLUGIN_ACCENT_ORANGE" } } });
  }
  return {
    id: prefix + "-warnings",
    disclosure: {
      title: "部分数据不可用",
      subtitle: "插件会继续展示已获授权的数据",
      expanded: false,
      children: children,
      appearance: { accent: "PLUGIN_ACCENT_ORANGE", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }
    }
  };
}

function dashboardComponents(ctx, snapshot, prefix) {
  var accountCount = Object.keys(snapshot.accounts || {}).length;
  return [{
    id: prefix + "-summary",
    value: {
      title: "Cloudflare",
      subtitle: accountCount + " 个账户 · " + safeNumber(snapshot.zoneCount) + " 个域名",
      value: {
        text: safeNumber(snapshot.activeCount) + " 个正常",
        status: safeNumber(snapshot.activeCount) === safeNumber(snapshot.zoneCount) ? "PLUGIN_STATUS_HEALTHY" : "PLUGIN_STATUS_WARNING"
      },
      appearance: {
        accent: "PLUGIN_ACCENT_ORANGE",
        iconSource: iconSource("cloud.fill"),
        hideBackground: true
      },
      onTap: { navigate: { surface: "detail", route: "zones" } }
    }
  }];
}

function hostnameEntry(snapshot) {
  var zone = snapshot.zone || {};
  return {
    id: "detail-hostnames-entry",
    value: {
      title: "子域名流量",
      subtitle: "按 Hostname 查看请求、访问和流量",
      value: { text: "查看", status: "PLUGIN_STATUS_RUNNING" },
      appearance: {
        accent: "PLUGIN_ACCENT_BLUE",
        iconSource: { systemName: "network" },
        variant: "PLUGIN_COMPONENT_VARIANT_TINTED"
      },
      onTap: { navigate: { surface: "detail", route: zoneRoute(zone.id, "hostnames") } }
    }
  };
}

function hostnameListComponents(ctx, snapshot) {
  var zone = snapshot.zone || {};
  var rangeKey = selectedAnalyticsRange(ctx, zone.id);
  var summaries;
  try {
    summaries = queryHostnameSummaries(ctx, zone.id, rangeKey);
  } catch (error) {
    return [errorState(String(error.message || error))];
  }
  var rangeSnapshot = { zone: zone, analytics: { rangeKey: summaries.rangeKey, rangeLabel: summaries.rangeLabel } };
  var components = [{
    id: "hostnames-toolbar",
    stack: {
      axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL",
      spacing: 8,
      appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
      children: [
        { id: "hostnames-title", text: { text: "子域名流量", style: "PLUGIN_TEXT_STYLE_SUBTITLE" } },
        { id: "hostnames-toolbar-spacer", spacer: {} },
        analyticsRangeMenu(rangeSnapshot, "hostnames")
      ]
    }
  }];
  var cards = [];
  for (var index = 0; index < summaries.items.length; index += 1) {
    var item = summaries.items[index];
    var isApex = String(item.hostname).toLowerCase() === String(zone.name || "").toLowerCase();
    cards.push({
      id: "hostname-" + index,
      card: {
        appearance: { accent: "PLUGIN_ACCENT_BLUE", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
        onTap: { navigate: { surface: "detail", route: hostnameRoute(zone.id, item.hostname) } },
        children: [{
          id: "hostname-value-" + index,
          value: {
            title: item.hostname,
            subtitle: (isApex ? "根域名 · " : "子域名 · ") + compactNumber(item.requests) + " 请求 · " + compactBytes(item.bytes),
            value: { number: item.bytes, format: "PLUGIN_VALUE_FORMAT_BYTES" },
            appearance: { accent: "PLUGIN_ACCENT_BLUE", iconSource: { systemName: isApex ? "globe" : "network" }, hideBackground: true }
          }
        }]
      }
    });
  }
  if (cards.length === 0) {
    components.push({
      id: "hostnames-empty",
      stateBlock: {
        kind: "PLUGIN_STATE_KIND_EMPTY",
        title: "暂无子域名流量",
        message: "只有经过 Cloudflare 代理的 HTTP 请求才会出现在这里。",
        appearance: { accent: "PLUGIN_ACCENT_BLUE", iconSource: { systemName: "network" } }
      }
    });
  } else {
    components.push({ id: "hostnames-list", stack: { spacing: 10, appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" }, children: cards } });
  }
  return components;
}

function hostnameDetailComponents(ctx, snapshot, hostname) {
  var zone = snapshot.zone || {};
  var rangeKey = selectedAnalyticsRange(ctx, zone.id);
  var analytics;
  try {
    analytics = queryHostnameAnalytics(ctx, zone.id, hostname, rangeKey);
  } catch (error) {
    return [errorState(String(error.message || error))];
  }
  var analyticsSnapshot = { zone: zone, analytics: analytics };
  var components = [{
    id: "hostname-detail-summary",
    value: {
      title: hostname,
      subtitle: zone.name || "Cloudflare",
      value: { text: analytics.rangeLabel, status: "PLUGIN_STATUS_RUNNING" },
      appearance: { accent: "PLUGIN_ACCENT_BLUE", iconSource: { systemName: "network" }, hideBackground: true }
    }
  }];
  var analyticsBlocks = analyticsComponents(analyticsSnapshot, "hostname-detail");
  for (var index = 0; index < analyticsBlocks.length; index += 1) components.push(analyticsBlocks[index]);
  components.push({
    id: "hostname-detail-values",
    descriptionList: {
      title: "流量摘要",
      columns: 2,
      items: [
        { title: "请求", value: { number: safeNumber(analytics.requests), format: "PLUGIN_VALUE_FORMAT_NUMBER" } },
        { title: "访问", value: { number: safeNumber(analytics.visits), format: "PLUGIN_VALUE_FORMAT_NUMBER" } },
        { title: "总流量", value: { number: safeNumber(analytics.bytes), format: "PLUGIN_VALUE_FORMAT_BYTES" } },
        { title: "缓存流量", value: { number: safeNumber(analytics.cachedBytes), format: "PLUGIN_VALUE_FORMAT_BYTES" } }
      ],
      appearance: { accent: "PLUGIN_ACCENT_BLUE" }
    }
  });
  return components;
}

function detailOverviewComponents(ctx, snapshot) {
  var components = headerComponents(snapshot, "detail");
  components.push(overviewGrid(snapshot, "detail"));
  components.push(hostnameEntry(snapshot));
  var analytics = analyticsComponents(snapshot, "detail");
  for (var index = 0; index < analytics.length; index += 1) components.push(analytics[index]);
  components.push(dnsList(snapshot, 20, "detail"));
  if (isEnabled(ctx, "show_tunnels", true)) components.push(tunnelList(snapshot, 20, "detail"));
  var warning = warningComponent(snapshot, "detail");
  if (warning) components.push(warning);
  return components;
}

function zoneSummaryText(snapshot, zoneID) {
  var summary = snapshot.zoneSummaries && snapshot.zoneSummaries[String(zoneID || "")];
  if (!summary) return "24 小时 · 暂无流量数据";
  return "24 小时 · " + compactNumber(summary.requests) + " 请求 · " + compactBytes(summary.bytes);
}

function zoneList(snapshot) {
  var zones = snapshot.zones || [];
  var cards = [];
  for (var index = 0; index < zones.length; index += 1) {
    var zone = zones[index] || {};
    var status = zone.paused ? "PLUGIN_STATUS_WARNING" : stateStatus(zone.status);
    var accent = zone.paused ? "PLUGIN_ACCENT_ORANGE" : stateAccent(zone.status);
    var label = zone.paused ? "已暂停" : statusText(zone.status);
    cards.push({
      id: "detail-zone-" + String(zone.id || index),
      card: {
        appearance: { accent: accent, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" },
        onTap: { navigate: { surface: "detail", route: zoneRoute(zone.id, "overview") } },
        children: [{
          id: "detail-zone-row-" + String(zone.id || index),
          stack: {
            axis: "PLUGIN_LAYOUT_AXIS_HORIZONTAL",
            spacing: 10,
            appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" },
            children: [
              { id: "detail-zone-icon-" + String(zone.id || index), icon: { appearance: { accent: accent, iconSource: { systemName: "globe.asia.australia.fill" } } } },
              { id: "detail-zone-copy-" + String(zone.id || index), stack: { spacing: 2, appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" }, children: [
                { id: "detail-zone-name-" + String(zone.id || index), text: { text: zone.name || "未命名 Zone", style: "PLUGIN_TEXT_STYLE_SUBTITLE" } },
                { id: "detail-zone-summary-" + String(zone.id || index), text: { text: zoneSummaryText(snapshot, zone.id), style: "PLUGIN_TEXT_STYLE_CAPTION", appearance: { accent: "PLUGIN_ACCENT_GRAY" } } }
              ] } },
              { id: "detail-zone-spacer-" + String(zone.id || index), spacer: {} },
              { id: "detail-zone-status-" + String(zone.id || index), badge: { text: label, appearance: { accent: accent } } }
            ]
          }
        }]
      }
    });
  }
  return { id: "detail-zone-list", stack: { spacing: 10, children: cards, appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" } } };
}

function zoneSelectionComponents(snapshot) {
  var accountCount = Object.keys(snapshot.accounts || {}).length;
  var components = [
    {
      id: "zones-summary",
      grid: {
        columns: 2,
        spacing: 10,
        children: [
          { id: "zones-summary-domains", value: { title: "域名", value: { number: safeNumber(snapshot.zoneCount), format: "PLUGIN_VALUE_FORMAT_NUMBER" }, appearance: { accent: "PLUGIN_ACCENT_ORANGE", iconSource: { systemName: "globe" }, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" } } },
          { id: "zones-summary-active", value: { title: "正常", value: { number: safeNumber(snapshot.activeCount), format: "PLUGIN_VALUE_FORMAT_NUMBER", status: "PLUGIN_STATUS_HEALTHY" }, appearance: { accent: "PLUGIN_ACCENT_GREEN", iconSource: { systemName: "checkmark.circle.fill" }, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" } } },
          { id: "zones-summary-accounts", value: { title: "账户", value: { number: accountCount, format: "PLUGIN_VALUE_FORMAT_NUMBER" }, appearance: { accent: "PLUGIN_ACCENT_BLUE", iconSource: { systemName: "person.crop.circle.fill" }, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" } } },
          { id: "zones-summary-paused", value: { title: "已暂停", value: { number: safeNumber(snapshot.pausedCount), format: "PLUGIN_VALUE_FORMAT_NUMBER", status: safeNumber(snapshot.pausedCount) > 0 ? "PLUGIN_STATUS_WARNING" : "PLUGIN_STATUS_NEUTRAL" }, appearance: { accent: safeNumber(snapshot.pausedCount) > 0 ? "PLUGIN_ACCENT_ORANGE" : "PLUGIN_ACCENT_GRAY", iconSource: { systemName: "pause.circle.fill" }, variant: "PLUGIN_COMPONENT_VARIANT_TINTED" } } }
        ],
        appearance: { container: "PLUGIN_CONTAINER_STYLE_NONE" }
      }
    },
    zoneList(snapshot)
  ];
  var warning = warningComponent(snapshot, "zones");
  if (warning) components.push(warning);
  return components;
}

globalThis.dashboard = function(ctx) {
  var snapshot = getAccountSnapshot(ctx, false);
  if (snapshot.error) return { title: "", components: [errorState(snapshot.error)] };
  return { title: "", components: dashboardComponents(ctx, snapshot, "dashboard") };
};

globalThis.detail = function(ctx) {
  var accountSnapshot = getAccountSnapshot(ctx, false);
  if (accountSnapshot.error) return { title: "Cloudflare", components: [errorState(accountSnapshot.error)] };
  var route = parseRoute(ctx.route);
  if (route.kind === "zones") {
    return { title: "选择域名", components: zoneSelectionComponents(accountSnapshot) };
  }
  var snapshot = getZoneSnapshot(ctx, accountSnapshot, route.zoneID, false);
  if (snapshot.error) return { title: "Cloudflare", components: [errorState(snapshot.error)] };
  var components = headerComponents(snapshot, "detail");
  if (route.section === "dns-record") {
    var record = findDNSRecord(snapshot, route.recordID);
    if (!record) return { title: "DNS 记录", components: [errorState("没有找到所选 DNS 记录，它可能已被删除或更新")] };
    return { title: "DNS 记录", components: components.concat(dnsRecordDetailComponents(ctx, snapshot, record)) };
  }
  if (route.section === "hostnames") {
    return { title: "子域名流量", components: hostnameListComponents(ctx, snapshot) };
  }
  if (route.section === "hostname") {
    if (!route.recordID) return { title: "子域名流量", components: [errorState("缺少子域名参数，请返回列表后重试")] };
    return { title: route.recordID, components: hostnameDetailComponents(ctx, snapshot, route.recordID) };
  }
  if (route.section === "analytics") {
    components = components.concat(analyticsComponents(snapshot, "detail"));
    components.push({ id: "detail-analytics-values", descriptionList: { title: "流量摘要", columns: 2, items: [
      { title: "请求", value: { number: safeNumber(snapshot.analytics.requests), format: "PLUGIN_VALUE_FORMAT_NUMBER" } },
      { title: "访客", value: { number: safeNumber(snapshot.analytics.visits), format: "PLUGIN_VALUE_FORMAT_NUMBER" } },
      { title: "总流量", value: { number: safeNumber(snapshot.analytics.bytes), format: "PLUGIN_VALUE_FORMAT_BYTES" } },
      { title: "缓存流量", value: { number: safeNumber(snapshot.analytics.cachedBytes), format: "PLUGIN_VALUE_FORMAT_BYTES" } }
    ], appearance: { accent: "PLUGIN_ACCENT_ORANGE" } } });
    return { title: "流量分析", components: components };
  }
  if (route.section === "dns") {
    components.push(dnsList(snapshot, 30, "detail"));
    return { title: "DNS 记录", components: components };
  }
  if (route.section === "tunnels") {
    components.push(tunnelList(snapshot, 30, "detail"));
    return { title: "Cloudflare Tunnel", components: components };
  }
  return { title: snapshot.zone.name || "Cloudflare", components: detailOverviewComponents(ctx, snapshot) };
};

globalThis.widget = function(ctx) {
  var snapshot = getAccountSnapshot(ctx, false);
  if (snapshot.error) return { title: "Cloudflare", components: [errorState(snapshot.error)] };
  var children = [
    { id: "widget-title", text: { text: "Cloudflare", style: "PLUGIN_TEXT_STYLE_TITLE" } },
    { id: "widget-zones", value: { title: "域名", subtitle: safeNumber(snapshot.activeCount) + " 个正常", value: { number: safeNumber(snapshot.zoneCount), format: "PLUGIN_VALUE_FORMAT_NUMBER", status: "PLUGIN_STATUS_RUNNING" }, appearance: { accent: "PLUGIN_ACCENT_ORANGE", iconSource: iconSource("globe"), hideBackground: true } } }
  ];
  return {
    title: "Cloudflare 概览",
    components: [{ id: "widget-card", card: { appearance: { accent: "PLUGIN_ACCENT_ORANGE", variant: "PLUGIN_COMPONENT_VARIANT_TINTED" }, onTap: { navigate: { surface: "detail", route: "zones" } }, children: children } }]
  };
};

globalThis.background = function(ctx) {
  if (ctx.taskId === "refresh-cloudflare") {
    try {
      loadAccountSnapshot(ctx);
    } catch (error) {
      if (ctx.log && ctx.log.error) ctx.log.error("Cloudflare refresh failed: " + String(error.message || error));
    }
  }
  return {};
};

globalThis.actions = {
  selectAnalyticsRange: function(ctx) {
    try {
      var zoneID = actionParam(ctx, "zone_id");
      var range = analyticsRangeConfig(actionParam(ctx, "range"));
      if (!zoneID) throw new Error("缺少域名参数，请返回域名列表后重试");
      var accountSnapshot = getAccountSnapshot(ctx, false);
      var zone = findZone(accountSnapshot.zones || [], zoneID);
      if (!zone) throw new Error("没有找到所选域名，请返回域名列表后重试");
      if (ctx.cache) ctx.cache.set(ZONE_RANGE_PREFIX + zoneID, range.key, { ttlMs: 30 * 24 * 60 * 60 * 1000 });
      loadZoneSnapshot(ctx, zone, range.key);
      return { effects: [
        { toast: { text: "已切换至" + range.label, level: "success", durationMs: 1200 } },
        { refresh: { surface: "current" } }
      ] };
    } catch (error) {
      return { effects: [{ toast: { text: String(error.message || error), level: "error", durationMs: 2600 } }] };
    }
  },
  updateDnsRecord: function(ctx) {
    try {
      if (!isEnabled(ctx, "enable_dns_write", false)) throw new Error("请先在插件配置中开启 DNS 写操作");
      var zoneID = actionParam(ctx, "zone_id");
      var recordID = actionParam(ctx, "record_id");
      var name = actionParam(ctx, "name");
      var content = actionParam(ctx, "content");
      var type = actionParam(ctx, "type");
      var ttl = parseInt(actionParam(ctx, "ttl"), 10);
      if (!zoneID || !recordID || !name || !content || !type) throw new Error("DNS 记录参数不完整");
      if (!isFinite(ttl) || (ttl !== 1 && (ttl < 30 || ttl > 86400))) throw new Error("TTL 应为 1（自动）或 30 到 86400 秒");
      var payload = { type: type, name: name, content: content, ttl: ttl, comment: actionParam(ctx, "comment") };
      if (actionParam(ctx, "proxiable") === "true") payload.proxied = actionParam(ctx, "proxied") === "true";
      apiRequest(ctx, "/zones/" + encodeURIComponent(zoneID) + "/dns_records/" + encodeURIComponent(recordID), "PATCH", payload);
      var accountSnapshot = getAccountSnapshot(ctx, false);
      var zone = findZone(accountSnapshot.zones || [], zoneID);
      if (zone) loadZoneSnapshot(ctx, zone, selectedAnalyticsRange(ctx, zone.id));
      return { effects: [
        { toast: { text: "DNS 记录已更新", level: "success", durationMs: 1600 } },
        { refresh: { surface: "current" } }
      ] };
    } catch (error) {
      return { effects: [{ toast: { text: String(error.message || error), level: "error", durationMs: 2600 } }] };
    }
  },
  deleteDnsRecord: function(ctx) {
    try {
      if (!isEnabled(ctx, "enable_dns_write", false)) throw new Error("请先在插件配置中开启 DNS 写操作");
      var zoneID = actionParam(ctx, "zone_id");
      var recordID = actionParam(ctx, "record_id");
      if (!zoneID || !recordID) throw new Error("DNS 记录参数不完整");
      apiRequest(ctx, "/zones/" + encodeURIComponent(zoneID) + "/dns_records/" + encodeURIComponent(recordID), "DELETE");
      var accountSnapshot = getAccountSnapshot(ctx, false);
      var zone = findZone(accountSnapshot.zones || [], zoneID);
      if (zone) loadZoneSnapshot(ctx, zone, selectedAnalyticsRange(ctx, zone.id));
      return { effects: [
        { toast: { text: "DNS 记录已删除", level: "success", durationMs: 1600 } },
        { navigate: { surface: "detail", route: zoneRoute(zoneID, "dns") } }
      ] };
    } catch (error) {
      return { effects: [{ toast: { text: String(error.message || error), level: "error", durationMs: 2600 } }] };
    }
  },
  refresh: function(ctx) {
    try {
      var accountSnapshot = loadAccountSnapshot(ctx);
      var route = parseRoute(ctx.route);
      if (route.kind === "zone") {
        var zone = findZone(accountSnapshot.zones || [], route.zoneID);
        if (zone) loadZoneSnapshot(ctx, zone, selectedAnalyticsRange(ctx, zone.id));
      }
      return { effects: [
        { toast: { text: "Cloudflare 数据已刷新", level: "success", durationMs: 1600 } },
        { refresh: { surface: "current" } }
      ] };
    } catch (error) {
      return { effects: [{ toast: { text: String(error.message || error), level: "error", durationMs: 2600 } }] };
    }
  }
};
