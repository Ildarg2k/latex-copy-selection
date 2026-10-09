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
  function withAllowCopyHost(hosts, host, on) {
    const h = normalizeHost(host);
    if (!h) return normalizeAllowCopyHosts(hosts);
    const set = new Set(normalizeAllowCopyHosts(hosts));
    if (on) set.add(h);
    else set.delete(h);
    return [...set].sort();
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
  async function saveSettings(patch) {
    const next = { ...patch };
    if (patch.allowCopyHosts !== void 0) {
      next.allowCopyHosts = normalizeAllowCopyHosts(patch.allowCopyHosts);
    }
    await chrome.storage.sync.set(next);
  }
  async function setAllowCopyHost(host, on) {
    const s = await loadSettings();
    const allowCopyHosts = withAllowCopyHost(s.allowCopyHosts, host, on);
    await saveSettings({ allowCopyHosts });
    return allowCopyHosts;
  }

  // src/options/options.js
  var enabledEl = (
    /** @type {HTMLInputElement} */
    document.getElementById("enabled")
  );
  var allowCopyEl = (
    /** @type {HTMLInputElement} */
    document.getElementById("allowCopy")
  );
  var allowCopyHostEl = (
    /** @type {HTMLElement} */
    document.getElementById("allowCopyHost")
  );
  var statusEl = (
    /** @type {HTMLElement} */
    document.getElementById("status")
  );
  var copyBtn = (
    /** @type {HTMLButtonElement} */
    document.getElementById("copyBtn")
  );
  var copyStatusEl = (
    /** @type {HTMLElement} */
    document.getElementById("copyStatus")
  );
  var extVersionEl = (
    /** @type {HTMLElement | null} */
    document.getElementById("extVersion")
  );
  var currentHost = "";
  function showSaved() {
    statusEl.hidden = false;
    clearTimeout(showSaved._t);
    showSaved._t = setTimeout(() => {
      statusEl.hidden = true;
    }, 1200);
  }
  function showCopyStatus(text, kind) {
    copyStatusEl.hidden = false;
    copyStatusEl.textContent = text;
    copyStatusEl.dataset.kind = kind;
    clearTimeout(showCopyStatus._t);
    showCopyStatus._t = setTimeout(() => {
      copyStatusEl.hidden = true;
    }, 2e3);
  }
  function checkRadio(name, value) {
    const radio = (
      /** @type {HTMLInputElement | null} */
      document.querySelector(`input[name="${name}"][value="${value}"]`)
    );
    if (radio) radio.checked = true;
  }
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
  async function writeClipboard(plain, html) {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([plain], { type: "text/plain" }),
            "text/html": new Blob([html || plain], { type: "text/html" })
          })
        ]);
        return;
      } catch {
      }
    }
    await navigator.clipboard.writeText(plain);
  }
  async function copySelection() {
    copyBtn.disabled = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        showCopyStatus("No active tab", "err");
        return;
      }
      let fromContent;
      let fromSession;
      const contentPromise = chrome.tabs.sendMessage(tab.id, { type: "COPY_SELECTION" }).catch(() => void 0);
      const sessionPromise = chrome.runtime.sendMessage({ type: "GET_COPY_SNAPSHOT", tabId: tab.id }).catch(() => void 0);
      [fromContent, fromSession] = await Promise.all([contentPromise, sessionPromise]);
      const candidates = [fromContent, fromSession].filter(
        (r) => r?.ok && r.plain
      );
      if (candidates.length === 0) {
        showCopyStatus(
          fromContent?.error || fromSession?.error || "Nothing selected",
          "err"
        );
        return;
      }
      candidates.sort((a, b) => {
        const dt = (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
        if (dt !== 0) return dt;
        if (a === fromContent) return -1;
        if (b === fromContent) return 1;
        return 0;
      });
      const best = candidates[0];
      if (!best?.plain) {
        showCopyStatus("Nothing selected", "err");
        return;
      }
      await writeClipboard(best.plain, best.html || best.plain);
      window.close();
    } catch (err) {
      showCopyStatus(err instanceof Error ? err.message : "Copy failed", "err");
    } finally {
      copyBtn.disabled = false;
    }
  }
  function syncAllowCopyUi(s) {
    if (!currentHost) {
      allowCopyEl.checked = false;
      allowCopyEl.disabled = true;
      allowCopyHostEl.textContent = "Open an http(s) page to enable";
      return;
    }
    allowCopyEl.disabled = false;
    allowCopyHostEl.textContent = currentHost;
    allowCopyEl.checked = isAllowCopyHost(s.allowCopyHosts, currentHost);
  }
  async function hydrate() {
    if (extVersionEl) {
      const v = chrome.runtime.getManifest()?.version;
      if (v) {
        extVersionEl.textContent = `v${v}`;
        extVersionEl.hidden = false;
      }
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentHost = hostFromUrl(tab?.url);
    const s = await loadSettings();
    enabledEl.checked = s.enabled;
    checkRadio("clipboardMode", s.clipboardMode);
    checkRadio("delimiterStyle", s.delimiterStyle);
    syncAllowCopyUi(s);
  }
  enabledEl.addEventListener("change", async () => {
    await saveSettings({ enabled: enabledEl.checked });
    showSaved();
  });
  allowCopyEl.addEventListener("change", async () => {
    if (!currentHost) {
      allowCopyEl.checked = false;
      return;
    }
    await setAllowCopyHost(currentHost, allowCopyEl.checked);
    showSaved();
  });
  for (const radio of document.querySelectorAll('input[name="clipboardMode"]')) {
    radio.addEventListener("change", async (e) => {
      const t = (
        /** @type {HTMLInputElement} */
        e.target
      );
      if (!t.checked) return;
      await saveSettings({
        clipboardMode: t.value === "rich" ? "rich" : "latex"
      });
      showSaved();
    });
  }
  for (const radio of document.querySelectorAll('input[name="delimiterStyle"]')) {
    radio.addEventListener("change", async (e) => {
      const t = (
        /** @type {HTMLInputElement} */
        e.target
      );
      if (!t.checked) return;
      await saveSettings({
        delimiterStyle: t.value === "parens" ? "parens" : "dollar"
      });
      showSaved();
    });
  }
  copyBtn.addEventListener("click", () => {
    copySelection().catch(() => {
      showCopyStatus("Copy failed", "err");
    });
  });
  hydrate().catch(() => {
    enabledEl.checked = DEFAULT_SETTINGS.enabled;
    checkRadio("clipboardMode", DEFAULT_SETTINGS.clipboardMode);
    checkRadio("delimiterStyle", DEFAULT_SETTINGS.delimiterStyle);
    syncAllowCopyUi({ ...DEFAULT_SETTINGS, allowCopyHosts: [] });
  });
})();
