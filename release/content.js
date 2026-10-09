(() => {
  // src/lib/form-unlock.js
  var WAS_DISABLED_ATTR = "data-lcs-was-disabled";
  var COPYABLE_INPUT_TYPES = /* @__PURE__ */ new Set([
    "",
    "text",
    "search",
    "number",
    "email",
    "url",
    "tel",
    "password"
  ]);
  var observer = null;
  var active = false;
  function isCopyableTextControl(el) {
    if (el instanceof HTMLTextAreaElement) return true;
    if (!(el instanceof HTMLInputElement)) return false;
    const t = String(el.getAttribute("type") ?? el.type ?? "text").toLowerCase();
    return COPYABLE_INPUT_TYPES.has(t);
  }
  function unlockDisabledTextControl(el) {
    if (!isCopyableTextControl(el)) return;
    const control = (
      /** @type {HTMLInputElement | HTMLTextAreaElement} */
      el
    );
    if (!(control.disabled || control.hasAttribute("disabled"))) return;
    control.removeAttribute("disabled");
    control.disabled = false;
    control.setAttribute("readonly", "");
    control.readOnly = true;
    control.setAttribute(WAS_DISABLED_ATTR, "1");
  }
  function unlockDisabledTextControlsIn(root) {
    if (root instanceof Element && isCopyableTextControl(root)) {
      unlockDisabledTextControl(root);
    }
    const scope = (
      /** @type {ParentNode} */
      root
    );
    if (typeof scope.querySelectorAll !== "function") return;
    for (const el of scope.querySelectorAll("input, textarea")) {
      unlockDisabledTextControl(el);
    }
  }
  function startObserver() {
    if (observer || typeof document === "undefined" || !document.documentElement) {
      return;
    }
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.target instanceof Element) {
          if (m.attributeName === "disabled") {
            unlockDisabledTextControl(m.target);
          }
          continue;
        }
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          unlockDisabledTextControlsIn(node);
        }
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["disabled"]
    });
  }
  function startFormFieldUnlock() {
    if (typeof document === "undefined") return;
    if (active) {
      unlockDisabledTextControlsIn(document);
      return;
    }
    active = true;
    unlockDisabledTextControlsIn(document);
    startObserver();
  }

  // src/lib/allow-copy.js
  var STYLE_ID = "lcs-allow-copy-style";
  var HANDLER_EVENTS = (
    /** @type {const} */
    [
      "selectstart",
      "contextmenu",
      "dragstart"
    ]
  );
  var CLIPBOARD_EVENTS = (
    /** @type {const} */
    ["copy", "cut"]
  );
  var INLINE_PROPS = ["oncontextmenu", "onselectstart", "oncopy", "oncut", "ondragstart"];
  var STYLE_CSS = `
html, body, *, *::before, *::after {
  -webkit-user-select: text !important;
  user-select: text !important;
}
[unselectable] {
  -webkit-user-select: text !important;
  user-select: text !important;
}
`.trim();
  var active2 = false;
  var unlockClipboard = false;
  var observer2 = null;
  function unlockHandler(e) {
    e.stopPropagation();
  }
  function clearInlineHandlers(node) {
    for (const prop of INLINE_PROPS) {
      if (node instanceof Element && node.hasAttribute(prop)) {
        node.removeAttribute(prop);
      }
      try {
        node[prop] = null;
      } catch {
      }
    }
  }
  function clearRootHandlers() {
    clearInlineHandlers(document);
    if (document.documentElement) clearInlineHandlers(document.documentElement);
    if (document.body) clearInlineHandlers(document.body);
  }
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLE_CSS;
    const parent = document.documentElement || document.head || document.body;
    if (parent) parent.appendChild(style);
  }
  function removeStyle() {
    document.getElementById(STYLE_ID)?.remove();
  }
  function addSelectionListeners() {
    for (const type of HANDLER_EVENTS) {
      document.addEventListener(type, unlockHandler, true);
      window.addEventListener(type, unlockHandler, true);
    }
  }
  function removeSelectionListeners() {
    for (const type of HANDLER_EVENTS) {
      document.removeEventListener(type, unlockHandler, true);
      window.removeEventListener(type, unlockHandler, true);
    }
  }
  function addClipboardListeners() {
    for (const type of CLIPBOARD_EVENTS) {
      document.addEventListener(type, unlockHandler, true);
      window.addEventListener(type, unlockHandler, true);
    }
  }
  function removeClipboardListeners() {
    for (const type of CLIPBOARD_EVENTS) {
      document.removeEventListener(type, unlockHandler, true);
      window.removeEventListener(type, unlockHandler, true);
    }
  }
  function syncClipboardUnlock(want) {
    if (want === unlockClipboard) return;
    if (unlockClipboard) removeClipboardListeners();
    unlockClipboard = want;
    if (unlockClipboard) addClipboardListeners();
  }
  function startObserver2() {
    if (observer2 || !document.documentElement) return;
    observer2 = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.target instanceof Element) {
          clearInlineHandlers(m.target);
          continue;
        }
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          clearInlineHandlers(node);
          for (const el of node.querySelectorAll("*")) {
            for (const prop of INLINE_PROPS) {
              if (el.hasAttribute(prop)) {
                clearInlineHandlers(el);
                break;
              }
            }
          }
        }
      }
    });
    observer2.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [...INLINE_PROPS]
    });
  }
  function stopObserver() {
    observer2?.disconnect();
    observer2 = null;
  }
  function setAllowCopyActive(on, { unlockClipboard: wantClip = false } = {}) {
    if (on) {
      if (active2) {
        clearRootHandlers();
        syncClipboardUnlock(wantClip);
        return;
      }
      active2 = true;
      injectStyle();
      clearRootHandlers();
      addSelectionListeners();
      syncClipboardUnlock(wantClip);
      startObserver2();
      return;
    }
    if (!active2) return;
    active2 = false;
    removeSelectionListeners();
    syncClipboardUnlock(false);
    stopObserver();
    removeStyle();
  }

  // src/lib/cleanup.js
  function cleanupText(text) {
    let t = cleanupSoftLockAndZwsp(String(text ?? ""));
    t = t.replace(/\u00a0/g, " ");
    t = t.replace(/\n+/g, " ");
    t = t.replace(/[ \t]{2,}/g, " ");
    return t.trim();
  }
  function plainTextToClipboardHtml(plain) {
    const esc = String(plain ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return esc.replace(/\n+/g, "<br>");
  }
  function cleanupSoftLockAndZwsp(text) {
    let t = String(text ?? "");
    t = t.replace(/[\u200b\u200c\u200d\ufeff]/g, "");
    t = t.replace(
      /откройте[\s\u00a0]*https?:\/\/(?:www\.)?stepik\.org\/lesson\S*/gi,
      ""
    );
    t = t.replace(
      /откройтеhttps?:\/\/(?:www\.)?stepik\.org\/lesson\S*/gi,
      ""
    );
    t = t.replace(/https?:\/\/(?:www\.)?stepik\.org\/lesson\S*/gi, (url, offset, whole) => {
      const before = whole.slice(Math.max(0, offset - 20), offset);
      if (/откройте\s*$/i.test(before)) return "";
      return url;
    });
    return t;
  }
  function cleanupTextNodesInPlace(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n = walker.nextNode();
    while (n) {
      nodes.push(
        /** @type {Text} */
        n
      );
      n = walker.nextNode();
    }
    for (const textNode of nodes) {
      const parent = textNode.parentElement;
      if (parent?.closest?.(
        ".katex, .katex-display, mjx-container, .MathJax, .MathJax_Display, math, annotation"
      )) {
        continue;
      }
      const next = cleanupSoftLockAndZwsp(textNode.nodeValue || "");
      if (next !== textNode.nodeValue) {
        textNode.nodeValue = next;
      }
    }
  }
  function removeEmptyNbspWrappers(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    const doomed = [];
    let node = (
      /** @type {Element | null} */
      walker.nextNode()
    );
    while (node) {
      const text = (node.textContent || "").replace(/[\u00a0\s]/g, "");
      if (!text && !node.querySelector("img, svg, video, iframe, canvas, math")) {
        if (!node.matches?.("br, hr, img, svg, wbr")) {
          doomed.push(node);
        }
      }
      node = /** @type {Element | null} */
      walker.nextNode();
    }
    doomed.sort((a, b) => a.contains(b) ? 1 : b.contains(a) ? -1 : 0);
    for (const el of doomed) {
      if (el.isConnected || root.contains(el)) {
        el.remove();
      }
    }
  }

  // src/lib/delimiters.js
  function stripEquationTags(tex) {
    let t = String(tex ?? "");
    t = t.replace(/\\tag\*?\{[^{}]*\}/g, "");
    return t.replace(/\s{2,}/g, " ").trim();
  }
  function wrapLatex(tex, display, style = "dollar") {
    const t = stripEquationTags(tex);
    if (!t) return "";
    if (style === "parens") {
      return display ? `\\[${t}\\]` : `\\(${t}\\)`;
    }
    return display ? `$$${t}$$` : `$${t}$`;
  }

  // src/lib/sources/katex.js
  function normalizeAnnotationTex(raw) {
    let t = String(raw ?? "");
    t = t.replace(/\\\u2009/g, "\\,");
    t = t.replace(/\\\u200a/gi, "\\:");
    t = t.replace(/\\\u205f/g, "\\;");
    t = t.replace(/\(\u2009(?=[\^\\])/g, "(\\,");
    t = t.replace(/[\t\r\n]+/g, " ");
    t = t.replace(/ {2,}/g, " ");
    return t.trim();
  }
  function texFromAnnotation(root) {
    const annotations = root.querySelectorAll?.("annotation") ?? [];
    for (const ann of annotations) {
      const enc = (ann.getAttribute("encoding") || "").trim().toLowerCase();
      if (enc === "application/x-tex" || enc === "application/x-latex" || enc === "text/x-tex") {
        const tex = normalizeAnnotationTex(ann.textContent || "");
        if (tex) return tex;
      }
    }
    return null;
  }
  function isOutermostMatch(el, selector) {
    const parent = el.parentElement?.closest(selector);
    return !parent || parent === el;
  }
  function katexReplaceRoot(katexEl) {
    const mathTex = katexEl.closest(".math-tex");
    if (mathTex) return mathTex;
    const display = katexEl.closest(".katex-display");
    return display || katexEl;
  }
  function findKatexHits(scope) {
    const hits = [];
    const nodes = scope.querySelectorAll?.(".katex") ?? [];
    for (const el of nodes) {
      if (!(el instanceof Element)) continue;
      if (!isOutermostMatch(el, ".katex")) continue;
      const tex = texFromAnnotation(el);
      if (!tex) continue;
      const root = katexReplaceRoot(el);
      const display = !!(root.classList?.contains("katex-display") || el.closest(".katex-display"));
      hits.push({ tex, display, root });
    }
    return hits;
  }

  // src/lib/sources/mathjax.js
  function texFromDataAttrs(el) {
    for (const name of ["data-latex", "data-tex", "data-math"]) {
      const v = el.getAttribute?.(name);
      if (v && v.trim()) return v.trim();
    }
    return null;
  }
  function isDisplayMathJax(el) {
    if (el.getAttribute("display") === "true") return true;
    if (el.classList?.contains("MathJax_Display")) return true;
    if (el.tagName?.toLowerCase() === "mjx-container" && el.getAttribute("display") === "true") {
      return true;
    }
    const type = el.getAttribute("type") || "";
    if (/mode\s*=\s*display/i.test(type)) return true;
    return false;
  }
  function isMathJaxChrome(el) {
    if (!(el instanceof Element)) return false;
    if (el.matches?.("mjx-container, .MathJax_Preview, .MathJax_Display, .MathJax_SVG, .MathJax_CHTML")) {
      return true;
    }
    return !!el.classList?.contains("MathJax");
  }
  function groupMathJaxV2Root(script) {
    const nodes = [];
    let el = script.previousElementSibling;
    while (el && isMathJaxChrome(el)) {
      nodes.unshift(el);
      if (el.classList.contains("MathJax_Display")) break;
      el = el.previousElementSibling;
    }
    nodes.push(script);
    if (nodes.length === 1) return script;
    const wrap = document.createElement("span");
    wrap.setAttribute("data-lcs-mjax-group", "1");
    nodes[0].before(wrap);
    for (const n of nodes) wrap.appendChild(n);
    return wrap;
  }
  function findMathJaxHits(scope) {
    const hits = [];
    const seen = /* @__PURE__ */ new Set();
    const claimedScripts = /* @__PURE__ */ new Set();
    const scripts = scope.querySelectorAll?.('script[type^="math/tex"]') ?? [];
    for (const script of scripts) {
      if (!(script instanceof Element)) continue;
      const tex = (script.textContent || "").trim();
      if (!tex) continue;
      const root = groupMathJaxV2Root(script);
      claimedScripts.add(script);
      seen.add(root);
      hits.push({
        tex,
        display: isDisplayMathJax(script),
        root
      });
    }
    const containers = scope.querySelectorAll?.(
      "mjx-container, .MathJax, .MathJax_Display, .MathJax_SVG, .MathJax_CHTML"
    ) ?? [];
    for (const el of containers) {
      if (!(el instanceof Element)) continue;
      if (el.classList.contains("MathJax_Preview")) continue;
      if (seen.has(el)) continue;
      if (el.closest('[data-lcs-mjax-group="1"]')) continue;
      if (el.closest("mjx-container") && el.tagName.toLowerCase() !== "mjx-container") {
        continue;
      }
      const outerMj = el.parentElement?.closest(
        "mjx-container, .MathJax, .MathJax_Display, .MathJax_SVG, .MathJax_CHTML"
      );
      if (outerMj && outerMj !== el) continue;
      let tex = texFromDataAttrs(el) || texFromAnnotation(el);
      if (!tex) {
        const script = el.previousElementSibling?.matches?.('script[type^="math/tex"]') ? el.previousElementSibling : null;
        if (script && !claimedScripts.has(script)) {
          tex = (script.textContent || "").trim();
        }
      }
      if (!tex) continue;
      seen.add(el);
      hits.push({
        tex,
        display: isDisplayMathJax(el),
        root: el
      });
    }
    return hits;
  }

  // src/lib/sources/mathml.js
  function findMathmlHits(scope) {
    const hits = [];
    const nodes = scope.querySelectorAll?.("math") ?? [];
    for (const math of nodes) {
      if (!(math instanceof Element)) continue;
      if (math.closest(
        '.katex, .katex-display, mjx-container, .MathJax, .MathJax_Display, [data-lcs-mjax-group="1"], [data-xpm-copy-root]'
      )) {
        continue;
      }
      if (!isOutermostMatch(math, "math")) continue;
      const tex = texFromAnnotation(math) || (math.getAttribute("alttext") || "").trim() || null;
      if (!tex) continue;
      const wikiWrap = math.closest(".mwe-math-element, .mwe-math-mathml-inline, .mwe-math-mathml-display");
      const root = wikiWrap || math;
      const display = math.getAttribute("display") === "block" || !!wikiWrap?.classList?.contains("mwe-math-mathml-display") || !!math.closest(".mwe-math-mathml-display");
      hits.push({ tex, display, root });
    }
    return hits;
  }

  // src/lib/sources/data-attrs.js
  var ATTRS = [
    "data-math",
    "data-latex",
    "data-tex",
    "data-xpm-latex",
    "data-formula",
    "data-equation"
  ];
  function isDisplayHint(el) {
    const d = (el.getAttribute("data-display") || "").toLowerCase();
    if (d === "true" || d === "block" || d === "display") return true;
    if (el.classList?.contains("display") || el.classList?.contains("math-display") || el.classList?.contains("math-block")) {
      return true;
    }
    if (el.getAttribute("display") === "block") return true;
    return false;
  }
  function ownTexAttr(el) {
    for (const name of ATTRS) {
      const v = (el.getAttribute(name) || "").trim();
      if (v) return v;
    }
    return null;
  }
  function findDataAttrHits(scope, claimed) {
    const hits = [];
    const selector = [...ATTRS.map((a) => `[${a}]`), ".ltx_Math[data-latex]", "math.ltx_Math"].join(
      ","
    );
    const nodes = scope.querySelectorAll?.(selector) ?? [];
    for (const el of nodes) {
      if (!(el instanceof Element)) continue;
      if (claimed.has(el)) continue;
      if (el.closest(
        '.katex, .katex-display, mjx-container, .MathJax, .MathJax_Display, [data-lcs-mjax-group="1"]'
      )) {
        if (el.classList.contains("katex") || el.closest(".katex") || el.tagName.toLowerCase() === "mjx-container" || el.classList.contains("MathJax")) {
          continue;
        }
      }
      let tex = ownTexAttr(el);
      if (!tex && el.classList.contains("ltx_Math")) {
        tex = (el.getAttribute("alttext") || "").trim() || null;
      }
      if (!tex) continue;
      if (/^https?:\/\//i.test(tex)) continue;
      const xpmRoot = el.closest?.("[data-xpm-copy-root]");
      const root = xpmRoot instanceof Element ? xpmRoot : el;
      if (claimed.has(root)) continue;
      const display = isDisplayHint(root) || isDisplayHint(el);
      hits.push({ tex, display, root });
    }
    return hits;
  }

  // src/lib/extract.js
  function collectMathHits(scope) {
    const katex = findKatexHits(scope);
    const mathjax = findMathJaxHits(scope);
    const mathml = findMathmlHits(scope);
    const claimed = /* @__PURE__ */ new Set();
    const hits = [];
    const consider = (hit) => {
      if (!(hit.root instanceof Element)) return;
      for (const c of claimed) {
        if (c === hit.root || c.contains(hit.root) || hit.root.contains(c)) {
          if (c.contains(hit.root)) return;
        }
      }
      for (const c of [...claimed]) {
        if (hit.root.contains(c) && c !== hit.root) {
          claimed.delete(c);
          const idx = hits.findIndex((h) => h.root === c);
          if (idx >= 0) hits.splice(idx, 1);
        }
      }
      claimed.add(hit.root);
      hits.push(hit);
    };
    for (const h of katex) consider(h);
    for (const h of mathjax) consider(h);
    for (const h of mathml) consider(h);
    for (const h of findDataAttrHits(scope, claimed)) consider(h);
    return hits;
  }
  function rewriteMathInPlace(scope, style = "dollar") {
    const hits = collectMathHits(scope);
    for (const hit of hits) {
      const wrapped = wrapLatex(hit.tex, hit.display, style);
      if (!wrapped) continue;
      const textNode = document.createTextNode(wrapped);
      hit.root.replaceWith(textNode);
    }
    return hits.length;
  }
  function selectionHasMath(scope) {
    return collectMathHits(scope).length > 0;
  }

  // src/lib/selection.js
  function cloneSelectionFragment(selection = window.getSelection()) {
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return null;
    }
    const frag = document.createDocumentFragment();
    for (let i = 0; i < selection.rangeCount; i++) {
      frag.appendChild(selection.getRangeAt(i).cloneContents());
    }
    return frag;
  }
  function collapseWhitespaceInTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n = walker.nextNode();
    while (n) {
      nodes.push(
        /** @type {Text} */
        n
      );
      n = walker.nextNode();
    }
    for (const textNode of nodes) {
      const next = (textNode.nodeValue || "").replace(/\s+/g, " ");
      if (next !== textNode.nodeValue) {
        textNode.nodeValue = next;
      }
    }
  }
  function serializePlain(frag) {
    removeEmptyNbspWrappers(frag);
    const container = document.createElement("div");
    container.appendChild(frag.cloneNode(true));
    return cleanupText(container.innerText || container.textContent || "");
  }
  function serializeRichHtml(frag) {
    cleanupTextNodesInPlace(frag);
    const container = document.createElement("div");
    container.appendChild(frag.cloneNode(true));
    return container.innerHTML;
  }
  function serializeLatexHtml(frag) {
    collapseWhitespaceInTextNodes(frag);
    cleanupTextNodesInPlace(frag);
    const container = document.createElement("div");
    container.appendChild(frag.cloneNode(true));
    return container.innerHTML;
  }
  function buildClipboardFromSelection({
    style = "dollar",
    selection = typeof window !== "undefined" ? window.getSelection() : null,
    root = null
  } = {}) {
    let frag = null;
    if (root) {
      frag = document.createDocumentFragment();
      const clone = (
        /** @type {ParentNode} */
        root.cloneNode(true)
      );
      while (clone.firstChild) frag.appendChild(clone.firstChild);
    } else {
      frag = cloneSelectionFragment(selection);
    }
    if (!frag) return null;
    if (!selectionHasMath(frag)) return null;
    rewriteMathInPlace(frag, style);
    const plain = serializePlain(
      /** @type {DocumentFragment} */
      frag.cloneNode(true)
    );
    if (!plain) return null;
    const html = serializeLatexHtml(
      /** @type {DocumentFragment} */
      frag.cloneNode(true)
    );
    return { plain, html };
  }

  // src/lib/copy-payload.js
  function resolveProsePlain(selection, hasLive, cachedPlain, liveFrag = null) {
    if (hasLive) {
      const fromSel = cleanupText(selection?.toString() || "");
      if (fromSel) return fromSel;
    }
    const fromCache = cleanupText(cachedPlain || "");
    if (fromCache) return fromCache;
    if (liveFrag) {
      const fromFrag = serializePlain(
        /** @type {DocumentFragment} */
        liveFrag.cloneNode(true)
      );
      if (fromFrag) return fromFrag;
    }
    if (hasLive) {
      const frag = cloneSelectionFragment(selection);
      if (frag) {
        const fromFrag = serializePlain(frag);
        if (fromFrag) return fromFrag;
      }
    }
    return "";
  }
  function latexHtmlFromFragOrPlain(frag, plain) {
    if (frag) {
      try {
        return serializeLatexHtml(
          /** @type {DocumentFragment} */
          frag.cloneNode(true)
        );
      } catch {
      }
    }
    return plainTextToClipboardHtml(plain);
  }
  function payloadFromMathFrag(frag, style) {
    rewriteMathInPlace(frag, style);
    const plain = serializePlain(
      /** @type {DocumentFragment} */
      frag.cloneNode(true)
    );
    if (!plain) return null;
    let html;
    try {
      html = serializeLatexHtml(
        /** @type {DocumentFragment} */
        frag.cloneNode(true)
      );
    } catch {
      html = plainTextToClipboardHtml(plain);
    }
    return { plain, html };
  }
  function buildLatexPayload({
    style = "dollar",
    cachedFrag = null,
    cachedPlain = ""
  } = {}) {
    const selection = typeof window !== "undefined" ? window.getSelection() : null;
    const hasLive = Boolean(
      selection && selection.rangeCount > 0 && !selection.isCollapsed
    );
    if (hasLive) {
      try {
        const live = buildClipboardFromSelection({ style, selection });
        if (live) return live;
      } catch {
      }
      let frag = null;
      try {
        frag = cloneSelectionFragment(selection);
      } catch {
        frag = null;
      }
      const plain2 = resolveProsePlain(selection, true, cachedPlain, frag);
      if (!plain2) return null;
      return { plain: plain2, html: latexHtmlFromFragOrPlain(frag, plain2) };
    }
    if (cachedFrag && selectionHasMath(cachedFrag)) {
      try {
        const frag = (
          /** @type {DocumentFragment} */
          cachedFrag.cloneNode(true)
        );
        const fromMath = payloadFromMathFrag(frag, style);
        if (fromMath) return fromMath;
      } catch {
      }
    }
    const plain = resolveProsePlain(null, false, cachedPlain, cachedFrag);
    if (!plain) return null;
    return {
      plain,
      html: latexHtmlFromFragOrPlain(cachedFrag, plain)
    };
  }
  function buildRichPayload({ cachedFrag = null, cachedPlain = "" } = {}) {
    const selection = typeof window !== "undefined" ? window.getSelection() : null;
    const hasLive = Boolean(
      selection && selection.rangeCount > 0 && !selection.isCollapsed
    );
    const frag = hasLive ? cloneSelectionFragment(selection) : cachedFrag ? (
      /** @type {DocumentFragment} */
      cachedFrag.cloneNode(true)
    ) : null;
    const plain = resolveProsePlain(selection, hasLive, cachedPlain, frag);
    if (!plain && !frag) return null;
    if (!plain) return null;
    const html = (() => {
      if (!frag) return plainTextToClipboardHtml(plain);
      try {
        return serializeRichHtml(
          /** @type {DocumentFragment} */
          frag.cloneNode(true)
        );
      } catch {
        return plainTextToClipboardHtml(plain);
      }
    })();
    return {
      plain,
      html: html || plainTextToClipboardHtml(plain)
    };
  }
  function buildCopyPayload(settings2, cache = {}) {
    if (settings2.clipboardMode === "rich") {
      return buildRichPayload(cache);
    }
    return buildLatexPayload({
      style: settings2.delimiterStyle,
      cachedFrag: cache.cachedFrag ?? null,
      cachedPlain: cache.cachedPlain ?? ""
    });
  }

  // src/lib/form-copy.js
  function isTextField(el) {
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  }
  function fieldFromEventTarget(t) {
    if (isTextField(t)) return t;
    if (t instanceof Element) {
      const el = t.closest("input, textarea");
      if (isTextField(el)) return el;
    }
    return null;
  }
  function fieldHasValue(el) {
    try {
      return Boolean(el.value);
    } catch {
      return false;
    }
  }
  function rectContains(rect, x, y, pad = 2) {
    return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
  }
  function pickTextField(candidates) {
    let fallback = null;
    for (const el of candidates) {
      if (!isTextField(el)) continue;
      if (fieldHasValue(el)) return el;
      if (!fallback) fallback = el;
    }
    return fallback;
  }
  function findTextFieldAtPoint(doc = typeof document !== "undefined" ? document : null, x, y) {
    if (!doc) return null;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    try {
      if (typeof doc.elementsFromPoint === "function") {
        const fromStack = pickTextField(doc.elementsFromPoint(x, y));
        if (fromStack) return fromStack;
      }
    } catch {
    }
    try {
      const hits = [];
      for (const el of doc.querySelectorAll("input, textarea")) {
        if (!isTextField(el)) continue;
        let rect;
        try {
          rect = el.getBoundingClientRect();
        } catch {
          continue;
        }
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (rectContains(rect, x, y)) hits.push(el);
      }
      return pickTextField(hits);
    } catch {
      return null;
    }
  }
  function textFromField(el) {
    try {
      const { value, selectionStart: a, selectionEnd: b } = el;
      if (typeof a === "number" && typeof b === "number" && b > a) {
        return value.slice(a, b);
      }
      return "";
    } catch {
      return "";
    }
  }
  function getFormControlCopyText(doc = typeof document !== "undefined" ? document : null, eventTarget = null) {
    if (!doc) return "";
    const direct = isTextField(eventTarget) ? eventTarget : isTextField(doc.activeElement) ? doc.activeElement : null;
    if (direct) {
      const t = textFromField(direct);
      if (t) return t;
    }
    return "";
  }
  function focusFieldForSelection(field) {
    try {
      if (typeof field.focus === "function") {
        field.focus({ preventScroll: true });
      }
    } catch {
      try {
        field.focus();
      } catch {
      }
    }
  }

  // src/lib/copy-session.js
  var memorySnapshot = null;
  function makeSnapshot(plain, html, source) {
    const cleaned = cleanupText(plain);
    if (!cleaned) return null;
    return {
      source,
      plain: cleaned,
      html: html || plainTextToClipboardHtml(cleaned),
      updatedAt: Date.now()
    };
  }
  function store(snap) {
    memorySnapshot = snap;
    return memorySnapshot;
  }
  function readLiveFieldPayload(eventTarget = null) {
    const raw = getFormControlCopyText(
      typeof document !== "undefined" ? document : null,
      eventTarget
    );
    if (!raw) return null;
    return makeSnapshot(raw, plainTextToClipboardHtml(cleanupText(raw)), "field");
  }
  function readLiveDomPayload(settings2) {
    const sel = typeof window !== "undefined" ? window.getSelection?.() ?? null : null;
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    if (!String(sel).trim()) return null;
    try {
      const payload = buildCopyPayload(settings2, {
        cachedFrag: null,
        cachedPlain: ""
      });
      if (!payload?.plain) return null;
      return makeSnapshot(payload.plain, payload.html, "dom");
    } catch {
      return null;
    }
  }
  function readLiveSelection(settings2, eventTarget = null) {
    const field = readLiveFieldPayload(eventTarget) || (eventTarget == null && isTextField(
      typeof document !== "undefined" ? document.activeElement : null
    ) ? readLiveFieldPayload(document.activeElement) : null);
    if (field) return field;
    if (isTextField(eventTarget) || eventTarget == null && isTextField(
      typeof document !== "undefined" ? document.activeElement : null
    )) {
      return null;
    }
    return readLiveDomPayload(settings2);
  }
  function commitSelection(settings2, eventTarget = null) {
    const snap = readLiveSelection(settings2, eventTarget);
    if (!snap) return null;
    return store(snap);
  }
  function getLiveCopyPayload(settings2, eventTarget = null) {
    const live = readLiveSelection(settings2, eventTarget);
    if (live) store(live);
    return live;
  }
  function getCopyPayload(settings2, eventTarget = null) {
    const live = readLiveSelection(settings2, eventTarget);
    if (live) {
      store(live);
      return live;
    }
    return memorySnapshot;
  }
  function shouldPublishSnapshot(win = typeof window !== "undefined" ? window : null) {
    if (!win) return false;
    try {
      return win === win.top;
    } catch {
      return false;
    }
  }

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
  function watchSettings(cb) {
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      if (!changes.enabled && !changes.delimiterStyle && !changes.clipboardMode && !changes.allowCopyHosts) {
        return;
      }
      loadSettings().then(cb);
    });
  }

  // src/content/content.js
  var settings = { ...DEFAULT_SETTINGS, allowCopyHosts: [] };
  var SELECTIONCHANGE_DEBOUNCE_MS = 120;
  var selectionChangeTimer = null;
  function focusFieldUnderPointer(e) {
    const fromTarget = fieldFromEventTarget(e.target);
    if (fromTarget) {
      focusFieldForSelection(fromTarget);
      return;
    }
    const fromPoint = findTextFieldAtPoint(document, e.clientX, e.clientY);
    if (fromPoint) focusFieldForSelection(fromPoint);
  }
  function applyAllowCopy(s) {
    const host = typeof location !== "undefined" ? location.hostname : "";
    const on = isAllowCopyHost(s.allowCopyHosts, host);
    setAllowCopyActive(on, { unlockClipboard: on && !s.enabled });
  }
  function publishSnapshot(snap) {
    if (!snap?.plain) return;
    if (!shouldPublishSnapshot()) return;
    try {
      chrome.runtime.sendMessage({
        type: "PUBLISH_COPY_SNAPSHOT",
        snapshot: {
          source: snap.source,
          plain: snap.plain,
          html: snap.html,
          updatedAt: snap.updatedAt
        }
      });
    } catch {
    }
  }
  function writeSelection(eventTarget = null) {
    const snap = commitSelection(settings, eventTarget);
    if (snap) publishSnapshot(snap);
    return snap;
  }
  function flushSelectionChange() {
    selectionChangeTimer = null;
    writeSelection();
  }
  function scheduleSelectionChange() {
    if (selectionChangeTimer != null) clearTimeout(selectionChangeTimer);
    selectionChangeTimer = setTimeout(
      flushSelectionChange,
      SELECTIONCHANGE_DEBOUNCE_MS
    );
  }
  startFormFieldUnlock();
  loadSettings().then((s) => {
    settings = s;
    applyAllowCopy(s);
  });
  watchSettings((s) => {
    settings = s;
    applyAllowCopy(s);
  });
  function writeClipboard(e, plain, html) {
    try {
      e.clipboardData.setData("text/plain", plain);
    } catch {
      return false;
    }
    try {
      e.clipboardData.setData("text/html", html || plain);
    } catch {
    }
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return true;
  }
  function onCopy(e) {
    if (!settings.enabled) return;
    if (!e.clipboardData) return;
    const payload = getLiveCopyPayload(settings, e.target);
    if (!payload?.plain) return;
    publishSnapshot(payload);
    writeClipboard(e, payload.plain, payload.html || payload.plain);
  }
  function onFocusOut(e) {
    if (!isTextField(e.target)) return;
    if (!textFromField(e.target)) return;
    if (selectionChangeTimer != null) {
      clearTimeout(selectionChangeTimer);
      selectionChangeTimer = null;
    }
    writeSelection(e.target);
  }
  function onMouseDown(e) {
    focusFieldUnderPointer(e);
  }
  function onMouseUp(e) {
    if (selectionChangeTimer != null) {
      clearTimeout(selectionChangeTimer);
      selectionChangeTimer = null;
    }
    writeSelection(e.target);
  }
  function onKeyUp(e) {
    if (selectionChangeTimer != null) {
      clearTimeout(selectionChangeTimer);
      selectionChangeTimer = null;
    }
    writeSelection(e.target);
  }
  function onSelectionChange() {
    scheduleSelectionChange();
  }
  window.addEventListener("copy", onCopy, true);
  document.addEventListener("focusout", onFocusOut, true);
  document.addEventListener("mousedown", onMouseDown, true);
  document.addEventListener("mouseup", onMouseUp, true);
  document.addEventListener("keyup", onKeyUp, true);
  document.addEventListener("selectionchange", onSelectionChange);
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== "COPY_SELECTION") return void 0;
    try {
      const payload = getCopyPayload(settings);
      if (!payload?.plain) {
        sendResponse({ ok: false, error: "Nothing selected" });
        return false;
      }
      sendResponse({
        ok: true,
        plain: payload.plain,
        html: payload.html,
        source: payload.source,
        updatedAt: payload.updatedAt
      });
    } catch (err) {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : "Copy failed"
      });
    }
    return false;
  });
})();
