(() => {
  // src/lib/settings.js
  var DEFAULT_SETTINGS = {
    enabled: true,
    delimiterStyle: "dollar",
    clipboardMode: "latex",
    allowCopyHosts: []
  };
  function normalizeClipboardMode(value) {
    return value === "rich" ? "rich" : "latex";
  }
  function normalizeAllowCopyHosts(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (const item of value) {
      if (typeof item !== "string") continue;
      const host = item.trim().toLowerCase();
      if (!host || seen.has(host)) continue;
      seen.add(host);
      out.push(host);
    }
    return out;
  }
  function normalizeHost(host) {
    if (!host || typeof host !== "string") return "";
    return host.trim().toLowerCase();
  }
  function isAllowCopyHost(hosts, host) {
    const h = normalizeHost(host);
    if (!h) return false;
    return normalizeAllowCopyHosts(hosts).includes(h);
  }
  async function loadSettings() {
    try {
      const raw = await chrome.storage.sync.get(DEFAULT_SETTINGS);
      return {
        enabled: raw.enabled !== false,
        delimiterStyle: raw.delimiterStyle === "parens" ? "parens" : "dollar",
        clipboardMode: normalizeClipboardMode(raw.clipboardMode),
        allowCopyHosts: normalizeAllowCopyHosts(raw.allowCopyHosts)
      };
    } catch {
      return { ...DEFAULT_SETTINGS, allowCopyHosts: [] };
    }
  }

  // src/background/sw.js
  function hostFromUrl(url) {
    if (!url) return "";
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") return "";
      return u.hostname.toLowerCase();
    } catch {
      return "";
    }
  }
  async function updateBadgeForTab(tabId, url) {
    try {
      const s = await loadSettings();
      const hosts = normalizeAllowCopyHosts(s.allowCopyHosts);
      let host = hostFromUrl(url);
      let id = tabId;
      if (!id || !host) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        id = tab?.id;
        host = host || hostFromUrl(tab?.url);
      }
      if (id == null) return;
      const on = isAllowCopyHost(hosts, host);
      if (on) {
        await chrome.action.setBadgeText({ tabId: id, text: "ON" });
        await chrome.action.setBadgeBackgroundColor({ tabId: id, color: "#0b7a3b" });
        await chrome.action.setTitle({
          tabId: id,
          title: `LaTeX Copy Selection \u2014 allow copy on ${host}`
        });
      } else {
        await chrome.action.setBadgeText({ tabId: id, text: "" });
        await chrome.action.setTitle({
          tabId: id,
          title: "LaTeX Copy Selection"
        });
      }
    } catch {
    }
  }
  async function refreshActiveBadge() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id != null) await updateBadgeForTab(tab.id, tab.url);
  }
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(DEFAULT_SETTINGS).then((current) => {
      chrome.storage.sync.set({
        enabled: current.enabled ?? DEFAULT_SETTINGS.enabled,
        delimiterStyle: current.delimiterStyle ?? DEFAULT_SETTINGS.delimiterStyle,
        clipboardMode: current.clipboardMode ?? DEFAULT_SETTINGS.clipboardMode,
        allowCopyHosts: normalizeAllowCopyHosts(
          current.allowCopyHosts ?? DEFAULT_SETTINGS.allowCopyHosts
        )
      });
    });
    refreshActiveBadge();
  });
  chrome.tabs.onActivated.addListener((info) => {
    chrome.tabs.get(info.tabId).then((tab) => {
      updateBadgeForTab(tab.id, tab.url);
    });
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === "complete") {
      updateBadgeForTab(tabId, tab.url || changeInfo.url);
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.allowCopyHosts) refreshActiveBadge();
  });
  function snapKey(tabId) {
    return `copySnap:${tabId}`;
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== "object") return void 0;
    if (message.type === "PUBLISH_COPY_SNAPSHOT") {
      const tabId = sender.tab?.id;
      const snap = message.snapshot;
      if (tabId == null || !snap?.plain) return false;
      const prevKey = snapKey(tabId);
      chrome.storage.session.get(prevKey).then((stored) => {
        const prev = stored[prevKey];
        const prevAt = typeof prev?.updatedAt === "number" ? prev.updatedAt : 0;
        const nextAt = typeof snap.updatedAt === "number" ? snap.updatedAt : 0;
        if (prev?.plain && prevAt > nextAt) {
          sendResponse({ ok: true, kept: "previous" });
          return;
        }
        chrome.storage.session.set({
          [prevKey]: {
            source: snap.source === "field" ? "field" : "dom",
            plain: String(snap.plain),
            html: String(snap.html || snap.plain),
            updatedAt: nextAt || Date.now()
          }
        }).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
      });
      return true;
    }
    if (message.type === "GET_COPY_SNAPSHOT") {
      const tabId = message.tabId;
      if (typeof tabId !== "number") {
        sendResponse({ ok: false, error: "No tabId" });
        return false;
      }
      chrome.storage.session.get(snapKey(tabId)).then((stored) => {
        const snap = stored[snapKey(tabId)];
        if (!snap?.plain) {
          sendResponse({ ok: false, error: "Nothing selected" });
          return;
        }
        sendResponse({
          ok: true,
          plain: snap.plain,
          html: snap.html,
          source: snap.source,
          updatedAt: snap.updatedAt
        });
      }).catch(() => sendResponse({ ok: false, error: "Storage error" }));
      return true;
    }
    return void 0;
  });
  refreshActiveBadge();
})();
