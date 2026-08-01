const CATEGORY_META = {
  hld: {
    label: "High-level design",
    icon: "network",
    description: "End-to-end architectures, scale patterns, APIs, data flow, and tradeoffs.",
  },
  lld: {
    label: "Low-level design",
    icon: "blocks",
    description: "Class design, design patterns, APIs, concurrency, and implementation details.",
  },
  java: {
    label: "Java",
    icon: "braces",
    description: "Core language notes and interview reference material.",
  },
  springboot: {
    label: "Spring Boot",
    icon: "leaf",
    description: "Framework concepts for building production Java services.",
  },
  kafka: {
    label: "Kafka",
    icon: "radio-tower",
    description: "Messaging, brokers, partitions, delivery, and streaming fundamentals.",
  },
  networking: {
    label: "Networking",
    icon: "router",
    description: "Protocols, infrastructure, and internet fundamentals.",
  },
  "docker-k8s": {
    label: "Docker and Kubernetes",
    icon: "container",
    description: "Containers, orchestration, deployments, and platform basics.",
  },
  qna: {
    label: "Interview Q&A",
    icon: "message-circle-question",
    description: "Quick recall questions and interview-style answers.",
  },
};

const state = {
  docs: [],
  categories: [],
  activeCategory: "",
  activeTier: "",
  activeDoc: "",
  expandedCategory: localStorage.getItem("expanded-category") || "",
  expandedTiers: loadExpandedTiers(),
  progress: loadProgress(),
  search: "",
  focusMode: false,
  sidebarCollapsed: localStorage.getItem("sidebar-collapsed") === "true",
  topicsCollapsed: localStorage.getItem("topics-collapsed") === "true",
  tocCollapsed: localStorage.getItem("toc-collapsed") === "true",
  theme: localStorage.getItem("theme") || "light",
};
let mermaidRenderId = 0;

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem("doc-progress") || "{}");
  } catch {
    return {};
  }
}

function loadExpandedTiers() {
  try {
    return JSON.parse(localStorage.getItem("expanded-tiers") || "{}");
  } catch {
    return {};
  }
}

const el = {
  root: document.documentElement,
  progress: document.querySelector("#reading-progress"),
  search: document.querySelector("#global-search"),
  sidebarToggles: document.querySelectorAll("[data-sidebar-toggle]"),
  themeToggle: document.querySelector("#theme-toggle"),
  menuToggle: document.querySelector("#menu-toggle"),
  sidebar: document.querySelector("#sidebar"),
  categoryNav: document.querySelector("#category-nav"),
  homeView: document.querySelector("#home-view"),
  docView: document.querySelector("#doc-view"),
  categoryGrid: document.querySelector("#category-grid"),
  topicsToggle: document.querySelector("#topics-toggle"),
  docList: document.querySelector("#doc-list"),
  libraryTitle: document.querySelector("#library-title"),
  clearFilter: document.querySelector("#clear-filter"),
  tierFilter: document.querySelector("#tier-filter"),
  docCategory: document.querySelector("#doc-category"),
  docTitle: document.querySelector("#doc-title"),
  docDescription: document.querySelector("#doc-description"),
  article: document.querySelector("#article"),
  tocLinks: document.querySelector("#toc-links"),
  tocToggle: document.querySelector("#toc-toggle"),
  focusToggle: document.querySelector("#focus-toggle"),
  sourceLink: document.querySelector("#source-link"),
};

marked.setOptions({
  gfm: true,
  breaks: false,
});

async function boot() {
  applyTheme();
  applyLayoutState();
  initializeMermaid();

  try {
    const response = await fetch("content-manifest.json");
    if (!response.ok) throw new Error(`Manifest failed with ${response.status}`);
    const manifest = await response.json();
    state.docs = manifest.docs;
    state.categories = manifest.categories;
  } catch (error) {
    el.docList.innerHTML = `<div class="empty-state">Could not load the documentation index.</div>`;
    console.error(error);
    return;
  }

  renderShell();
  bindEvents();
  routeFromHash();
  refreshIcons();
}

function bindEvents() {
  el.search.addEventListener("input", () => {
    state.search = el.search.value.trim().toLowerCase();
    if (state.activeDoc) showHome({ updateHash: false });
    renderCategoryNav();
    renderDocList();
  });

  el.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", state.theme);
    applyTheme();
    initializeMermaid();
    if (state.activeDoc) {
      const scrollTop = window.scrollY;
      openDoc(state.activeDoc, { updateHash: false, scrollToTop: false }).then(() => {
        window.scrollTo(0, scrollTop);
      });
    }
  });

  el.menuToggle.addEventListener("click", () => {
    document.body.classList.toggle("nav-open");
  });

  el.sidebarToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem("sidebar-collapsed", state.sidebarCollapsed);
      applyLayoutState();
    });
  });

  el.tocToggle.addEventListener("click", () => {
    state.tocCollapsed = !state.tocCollapsed;
    localStorage.setItem("toc-collapsed", state.tocCollapsed);
    applyLayoutState();
  });

  el.topicsToggle.addEventListener("click", () => {
    state.topicsCollapsed = !state.topicsCollapsed;
    localStorage.setItem("topics-collapsed", state.topicsCollapsed);
    applyTopicsState();
  });

  el.focusToggle.addEventListener("click", () => {
    state.focusMode = !state.focusMode;
    applyLayoutState();
  });

  el.clearFilter.addEventListener("click", () => {
    state.activeCategory = "";
    state.activeTier = "";
    state.expandedCategory = "";
    localStorage.removeItem("expanded-category");
    state.search = "";
    el.search.value = "";
    renderCategoryNav();
    renderCategoryGrid();
    renderDocList();
    updateActiveNav();
  });

  document.addEventListener("click", (event) => {
    const homeButton = event.target.closest("[data-home]");
    const categoryButton = event.target.closest("[data-category]");
    const tierGroupButton = event.target.closest("[data-tier-group]");
    const tierButton = event.target.closest("[data-tier]");
    const docButton = event.target.closest("[data-doc]");
    const pageAnchor = event.target.closest(".article a[href^='#'], .toc a[href^='#']");

    if (pageAnchor && !pageAnchor.dataset.doc) {
      event.preventDefault();
      const target = findPageAnchorTarget(pageAnchor);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (homeButton) {
      event.preventDefault();
      state.activeCategory = "";
      state.activeTier = "";
      state.expandedCategory = "";
      localStorage.removeItem("expanded-category");
      showHome();
      return;
    }

    if (categoryButton) {
      const category = categoryButton.dataset.category;
      const alreadyOpen = state.expandedCategory === category && state.activeCategory === category;
      state.activeCategory = alreadyOpen ? "" : category;
      state.expandedCategory = alreadyOpen ? "" : category;
      if (state.expandedCategory) {
        localStorage.setItem("expanded-category", state.expandedCategory);
      } else {
        localStorage.removeItem("expanded-category");
      }
      if (state.activeCategory !== "hld") {
        state.activeTier = "";
      }
      showHome({ updateHash: false });
      renderCategoryNav();
      updateActiveNav();
      document.body.classList.remove("nav-open");
      return;
    }

    if (tierGroupButton) {
      const tierKey = tierGroupButton.dataset.tierGroup;
      state.activeCategory = "hld";
      state.expandedCategory = "hld";
      state.expandedTiers[tierKey] = !isTierExpanded(tierKey);
      localStorage.setItem("expanded-category", "hld");
      localStorage.setItem("expanded-tiers", JSON.stringify(state.expandedTiers));
      showHome({ updateHash: false });
      renderCategoryNav();
      updateActiveNav();
      return;
    }

    if (tierButton) {
      state.activeCategory = "hld";
      state.expandedCategory = "hld";
      state.activeTier = tierButton.dataset.tier || "";
      localStorage.setItem("expanded-category", "hld");
      showHome({ updateHash: false });
      renderCategoryNav();
      updateActiveNav();
      return;
    }

    if (docButton) {
      event.preventDefault();
      openDoc(docButton.dataset.doc);
    }
  });

  window.addEventListener("hashchange", routeFromHash);
  window.addEventListener("scroll", updateProgress, { passive: true });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      el.search.focus();
    }
  });
}

function renderShell() {
  if (state.expandedCategory && !state.categories.includes(state.expandedCategory)) {
    state.expandedCategory = "";
  }

  renderCategoryNav();
  renderCategoryGrid();
  renderDocList();
}

function renderCategoryNav() {
  const docsByCategory = groupDocsByCategory();

  el.categoryNav.innerHTML = [
    `<p class="sidebar-section-title">Topics</p>`,
    ...state.categories.map((category) => {
      const meta = categoryMeta(category);
      const count = docsByCategory.get(category)?.length || 0;
      const expanded = state.expandedCategory === category;
      const docs = sidebarDocsForCategory(category);
      return `
        <div class="category-group">
          <button class="category-link" data-category="${escapeHtml(category)}" aria-expanded="${expanded}">
            <i data-lucide="${meta.icon}"></i>
            <span>${escapeHtml(meta.label)}</span>
            <small>${count}</small>
            <i class="category-chevron" data-lucide="${expanded ? "chevron-down" : "chevron-right"}"></i>
          </button>
          ${expanded ? renderSidebarDocList(docs, category) : ""}
        </div>
      `;
    }),
  ].join("");

  refreshIcons();
}

function renderSidebarDocList(docs, category) {
  if (!docs.length) {
    return `<div class="nav-doc-empty">No notes</div>`;
  }

  if (category === "hld") {
    return renderHldTierDocList(docs);
  }

  return `
    <div class="nav-doc-list">
      ${renderSidebarDocItems(docs)}
    </div>
  `;
}

function renderHldTierDocList(docs) {
  const tiers = [
    { key: "overview", label: "Overview", value: "" },
    { key: "tier-1", label: "Tier 1", value: "tier-1" },
    { key: "tier-2", label: "Tier 2", value: "tier-2" },
    { key: "tier-3", label: "Tier 3", value: "tier-3" },
  ];

  return `
    <div class="tier-tree">
      ${tiers.map((tier) => {
        const tierDocs = docs.filter((doc) => (doc.tier || "") === tier.value);
        if (!tierDocs.length) return "";
        const expanded = isTierExpanded(tier.key);
        return `
          <div class="tier-tree-group">
            <button class="tier-tree-button" type="button" data-tier-group="${escapeHtml(tier.key)}" aria-expanded="${expanded}">
              <i data-lucide="${expanded ? "chevron-down" : "chevron-right"}"></i>
              <span>${escapeHtml(tier.label)}</span>
              <small>${tierDocs.length}</small>
            </button>
            ${expanded ? `<div class="nav-doc-list tier-doc-list">${renderSidebarDocItems(tierDocs)}</div>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderSidebarDocItems(docs) {
  return docs.map((doc) => {
    const progress = docProgress(doc.id);
    return `
      <button class="nav-doc-item" data-doc="${escapeHtml(doc.id)}">
        <span class="nav-doc-title">${escapeHtml(shortDocTitle(doc))}</span>
        <span class="doc-progress-row">
          <span>${escapeHtml(progress.status)}</span>
          <span>${progress.percent}%</span>
        </span>
        <span class="doc-progress-track" aria-hidden="true">
          <span style="width: ${progress.percent}%"></span>
        </span>
      </button>
    `;
  }).join("");
}

function isTierExpanded(tierKey) {
  return state.expandedTiers[tierKey] !== false;
}

function sidebarDocsForCategory(category) {
  return state.docs.filter((doc) => {
    if (doc.category !== category) return false;
    if (category === "hld" && state.activeTier && doc.tier !== state.activeTier) return false;
    if (!state.search) return true;
    return docSearchText(doc).includes(state.search);
  });
}

function renderCategoryGrid() {
  const docsByCategory = groupDocsByCategory();
  const visibleCategories = state.activeCategory ? [state.activeCategory] : state.categories;

  el.categoryGrid.innerHTML = visibleCategories.map((category) => {
    const meta = categoryMeta(category);
    const count = docsByCategory.get(category)?.length || 0;
    return `
      <button class="category-card" data-category="${escapeHtml(category)}">
        <header>
          <span class="card-icon"><i data-lucide="${meta.icon}"></i></span>
          <small>${count} notes</small>
        </header>
        <h3>${escapeHtml(meta.label)}</h3>
        <p>${escapeHtml(meta.description)}</p>
      </button>
    `;
  }).join("");

  applyTopicsState();
  refreshIcons();
}

function renderDocList() {
  const docs = filteredDocs();
  const activeLabel = state.activeCategory ? categoryMeta(state.activeCategory).label : "All notes";
  const tierLabel = state.activeTier ? ` / ${formatTierLabel(state.activeTier)}` : "";
  const searchSuffix = state.search ? ` matching "${state.search}"` : "";
  el.libraryTitle.textContent = `${activeLabel}${tierLabel}${searchSuffix}`;
  el.clearFilter.classList.toggle("hidden", !state.activeCategory && !state.activeTier && !state.search);
  el.tierFilter.classList.toggle("hidden", state.activeCategory !== "hld");
  updateTierFilter();
  el.homeView.classList.toggle("topic-mode", Boolean(state.activeCategory));
  document.body.classList.toggle("topic-selected", Boolean(state.activeCategory));

  if (state.activeCategory && !state.search) {
    el.docList.innerHTML = "";
    refreshIcons();
    return;
  }

  if (!docs.length) {
    el.docList.innerHTML = `<div class="empty-state">No notes match this view.</div>`;
    refreshIcons();
    return;
  }

  el.docList.innerHTML = docs.map((doc) => `
    <button class="doc-item" data-doc="${escapeHtml(doc.id)}">
      <span class="doc-title-only">
        <h3>${escapeHtml(shortDocTitle(doc))}</h3>
        <span class="doc-topic-label">${escapeHtml(categoryMeta(doc.category).label)}</span>
      </span>
      ${renderProgressBadge(doc)}
    </button>
  `).join("");

  refreshIcons();
}

async function openDoc(id, options = {}) {
  const doc = state.docs.find((item) => item.id === id);
  if (!doc) {
    showHome();
    return;
  }

  state.activeDoc = id;
  state.activeCategory = doc.category;
  state.expandedCategory = doc.category;
  localStorage.setItem("expanded-category", doc.category);
  el.homeView.classList.add("hidden");
  el.docView.classList.remove("hidden");
  el.docCategory.textContent = categoryMeta(doc.category).label;
  el.docTitle.textContent = doc.title;
  el.docDescription.textContent = "";
  el.sourceLink.href = `https://github.com/vipi-n/swe-101/blob/main/${doc.path}`;
  el.article.innerHTML = `<div class="empty-state">Loading note...</div>`;
  el.tocLinks.innerHTML = "";
  document.body.classList.remove("nav-open");
  saveDocProgress(id, Math.max(docProgress(id).percent, 1));
  renderCategoryNav();
  updateActiveNav();

  if (options.updateHash !== false) {
    history.pushState(null, "", `#doc=${encodeURIComponent(id)}`);
  }

  try {
    const response = await fetch(contentUrl(doc.path));
    if (!response.ok) throw new Error(`Content failed with ${response.status}`);
    const markdown = await response.text();
    await renderMarkdown(markdown, doc);
  } catch (error) {
    console.error(error);
    el.article.innerHTML = `<div class="empty-state">Could not load this note.</div>`;
  }

  if (options.scrollToTop !== false) {
    window.scrollTo(0, 0);
  }
}

function showHome(options = {}) {
  state.activeDoc = "";
  state.focusMode = false;
  el.docView.classList.add("hidden");
  el.homeView.classList.remove("hidden");
  document.body.classList.remove("nav-open");
  applyLayoutState();
  if (state.docs.length) {
    renderCategoryNav();
    renderCategoryGrid();
    renderDocList();
  }
  updateActiveNav();
  updateProgress();
  if (options.updateHash !== false) {
    history.pushState(null, "", location.pathname);
  }
}

async function renderMarkdown(markdown, doc) {
  const trimmed = markdown.trim();

  if (!trimmed) {
    el.article.innerHTML = `<div class="empty-state">This note is currently empty.</div>`;
    return;
  }

  const dirty = marked.parse(trimmed);
  el.article.innerHTML = DOMPurify.sanitize(dirty, {
    ADD_ATTR: ["target", "rel"],
  });

  removeArticleTitle();
  normalizeHeadings();
  rewriteLinks(doc);
  await renderMermaidBlocks();
  enhanceCodeBlocks();
  buildToc();
  refreshIcons();
}

function removeArticleTitle() {
  const firstHeading = el.article.querySelector("h1");
  firstHeading?.remove();
}

function normalizeHeadings() {
  const seen = new Map();
  el.article.querySelectorAll("h1, h2, h3, h4").forEach((heading) => {
    const base = slugify(heading.textContent || "section");
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    heading.id = count ? `${base}-${count + 1}` : base;
  });
}

function findPageAnchorTarget(anchor) {
  const href = anchor?.getAttribute("href") || "";
  if (!href || !href.startsWith("#")) return null;

  const rawAnchor = href.slice(1);
  const anchorText = anchor.textContent || "";
  let decodedAnchor = rawAnchor;
  try {
    decodedAnchor = decodeURIComponent(rawAnchor);
  } catch {
    decodedAnchor = rawAnchor;
  }

  const candidates = [
    rawAnchor,
    decodedAnchor,
    anchorText,
    slugify(decodedAnchor),
    slugify(anchorText),
    slugify(decodedAnchor.replace(/^\d+(?:\.\d+)*\s+/, "")),
    slugify(anchorText.replace(/^\d+(?:\.\d+)*\s+/, "")),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const directMatch = document.getElementById(candidate);
    if (directMatch) return directMatch;
  }

  const normalizedCandidates = new Set(candidates.map(slugify));
  return Array.from(el.article.querySelectorAll("h1, h2, h3, h4")).find((heading) => {
    return normalizedCandidates.has(slugify(heading.textContent || ""));
  }) || null;
}

function rewriteLinks(doc) {
  el.article.querySelectorAll("a[href]").forEach((link) => {
    const raw = link.getAttribute("href");
    if (!raw || raw.startsWith("#")) {
      return;
    }

    if (raw.startsWith("http") || raw.startsWith("mailto:")) {
      link.target = "_blank";
      link.rel = "noreferrer";
      return;
    }

    const cleanTarget = raw.split("#")[0];
    if (!cleanTarget.endsWith(".md")) {
      link.target = "_blank";
      link.rel = "noreferrer";
      return;
    }

    const resolved = resolveRelativePath(doc.path, cleanTarget);
    const match = state.docs.find((item) => item.path === resolved);
    if (match) {
      link.href = `#doc=${encodeURIComponent(match.id)}`;
      link.dataset.doc = match.id;
      link.removeAttribute("target");
      link.removeAttribute("rel");
    }
  });
}

function enhanceCodeBlocks() {
  el.article.querySelectorAll("pre code").forEach((block) => {
    if (isMermaidBlock(block)) return;

    const source = block.textContent || "";
    const language = getCodeLanguage(block) || detectCodeLanguage(source);

    try {
      if (language && hljs.getLanguage(language)) {
        block.className = `language-${language}`;
        block.innerHTML = hljs.highlight(source, {
          language,
          ignoreIllegals: true,
        }).value;
      } else {
        const detected = hljs.highlightAuto(source, [
          "java",
          "sql",
          "json",
          "bash",
          "xml",
          "yaml",
          "dockerfile",
          "properties",
        ]);
        block.innerHTML = detected.value;
        if (detected.language) {
          block.classList.add(`language-${detected.language}`);
        }
      }
      block.classList.add("hljs");
    } catch (error) {
      console.warn(error);
    }

    const pre = block.parentElement;
    pre.classList.add("has-code-tools");

    const label = document.createElement("span");
    label.className = "code-language-label";
    label.textContent = formatLanguageLabel(language || getCodeLanguage(block) || "code");

    const button = document.createElement("button");
    button.className = "copy-code";
    button.type = "button";
    button.textContent = "Copy";
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(source);
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = "Copy";
      }, 1200);
    });
    pre.appendChild(label);
    pre.appendChild(button);
  });
}

function getCodeLanguage(block) {
  const className = block.className || "";
  const match = className.match(/language-([a-z0-9_-]+)/i);
  return match?.[1]?.toLowerCase() || "";
}

function detectCodeLanguage(source) {
  const text = source.trim();
  if (!text) return "";

  if (
    /\b(public|private|protected|class|interface|enum|static|final|void|throws|new|return)\b/.test(text) &&
    /[{};]/.test(text)
  ) {
    return "java";
  }

  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|FROM|WHERE|JOIN|GROUP BY|ORDER BY)\b/i.test(text)) {
    return "sql";
  }

  if (/^\s*[{[]/.test(text) && /["'}\]]\s*$/.test(text)) {
    return "json";
  }

  if (/^(curl|kubectl|docker|git|npm|mvn|gradle|java)\b/m.test(text)) {
    return "bash";
  }

  return "";
}

function formatLanguageLabel(language) {
  const labels = {
    bash: "Shell",
    dockerfile: "Dockerfile",
    java: "Java",
    json: "JSON",
    properties: "Properties",
    sql: "SQL",
    xml: "XML",
    yaml: "YAML",
  };
  return labels[language] || "Code";
}

async function renderMermaidBlocks() {
  const blocks = Array.from(el.article.querySelectorAll("pre code")).filter(isMermaidBlock);
  if (!blocks.length) return;

  if (!window.mermaid) {
    blocks.forEach((block) => block.closest("pre")?.classList.add("mermaid-unavailable"));
    return;
  }

  initializeMermaid();

  for (const block of blocks) {
    const source = (block.textContent || "").trim();
    const pre = block.closest("pre");
    if (!source || !pre) continue;

    const panel = document.createElement("div");
    panel.className = "mermaid-panel";
    panel.innerHTML = `
      <div class="mermaid-header">
        <span>Diagram</span>
        <button class="copy-diagram" type="button">Copy source</button>
      </div>
      <div class="mermaid-canvas" aria-label="Rendered diagram"></div>
    `;

    const copyButton = panel.querySelector(".copy-diagram");
    const canvas = panel.querySelector(".mermaid-canvas");
    copyButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(source);
      copyButton.textContent = "Copied";
      setTimeout(() => {
        copyButton.textContent = "Copy source";
      }, 1200);
    });

    pre.replaceWith(panel);

    try {
      const result = await window.mermaid.render(`mermaid-${Date.now()}-${mermaidRenderId++}`, source);
      canvas.innerHTML = result.svg;
    } catch (error) {
      console.warn(error);
      panel.classList.add("mermaid-error");
      canvas.innerHTML = `<pre><code>${escapeHtml(source)}</code></pre>`;
      panel.querySelector(".mermaid-header span").textContent = "Diagram source";
    }
  }
}

function isMermaidBlock(block) {
  const className = block.className || "";
  const source = (block.textContent || "").trim();
  return (
    className.includes("language-mermaid") ||
    /^(sequenceDiagram|flowchart|graph|classDiagram|erDiagram|stateDiagram|journey|gantt|pie|mindmap|timeline)\b/.test(source)
  );
}

function buildToc() {
  const headings = Array.from(el.article.querySelectorAll("h2, h3"));
  if (!headings.length) {
    el.tocLinks.innerHTML = `<span class="empty-state">No sections</span>`;
    return;
  }

  el.tocLinks.innerHTML = headings.map((heading) => `
    <a class="depth-${heading.tagName === "H3" ? "3" : "2"}" href="#${heading.id}">
      ${escapeHtml(heading.textContent || "")}
    </a>
  `).join("");
}

function routeFromHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  const docId = params.get("doc");
  if (docId) {
    openDoc(docId, { updateHash: false });
  } else {
    showHome({ updateHash: false });
  }
}

function filteredDocs() {
  return state.docs.filter((doc) => {
    const categoryMatch = !state.activeCategory || doc.category === state.activeCategory;
    const tierMatch = !state.activeTier || doc.tier === state.activeTier;
    const searchMatch = !state.search || docSearchText(doc).includes(state.search);
    return categoryMatch && tierMatch && searchMatch;
  });
}

function docSearchText(doc) {
  return `${doc.title} ${doc.description} ${doc.path} ${doc.category}`.toLowerCase();
}

function shortDocTitle(doc) {
  const explicitNames = {
    "hld/hld.md": "System Design Basics",
    "hld/tier-1/fb-newsfeed.md": "Facebook News Feed",
    "hld/tier-1/rate_limitter.md": "Rate Limiter",
    "hld/tier-1/ratelimitter.md": "Rate Limiter",
    "hld/tier-1/url_shortener.md": "URL Shortener",
    "hld/tier-2/apigateway.md": "API Gateway",
    "hld/tier-2/localDeliveryService.md": "Local Delivery Service",
    "lld/base/design-patterns.md": "Design Patterns",
    "lld/base/microservices.md": "Microservices",
    "docker-k8s/docker-k8s-deployment.md": "Kubernetes Deployment",
    "networking/key-technologies.md": "Key Technologies",
  };

  if (explicitNames[doc.path]) {
    return explicitNames[doc.path];
  }

  return doc.title
    .replace(/\s+[—-]\s+System Design(?:\s+Deep Dive)?$/i, "")
    .replace(/\s+[—-]\s+Low Level Design(?:\s+\(Java\))?$/i, "")
    .replace(/\s+\(Low-Level Design\)$/i, "")
    .replace(/\s+\(Java\)$/i, "")
    .replace(/\s+-\s+Comprehensive Guide$/i, "")
    .replace(/\s+[—-]\s+Complete Guide$/i, "")
    .replace(/\s+[—-]\s+Complete Interview Guide$/i, "")
    .replace(/^System Design:\s*/i, "")
    .trim();
}

function renderProgressBadge(doc) {
  const progress = docProgress(doc.id);
  return `
    <span class="doc-progress-summary">
      <span class="doc-status">${escapeHtml(progress.status)}</span>
      <span class="doc-percent">${progress.percent}%</span>
      <span class="doc-progress-track" aria-hidden="true">
        <span style="width: ${progress.percent}%"></span>
      </span>
    </span>
  `;
}

function docProgress(id) {
  const percent = Math.min(100, Math.max(0, Number(state.progress[id] || 0)));
  if (percent >= 95) {
    return { percent: 100, status: "Complete" };
  }
  if (percent > 0) {
    return { percent, status: "In progress" };
  }
  return { percent: 0, status: "Not started" };
}

function saveDocProgress(id, percent) {
  const normalized = percent >= 95 ? 100 : Math.min(100, Math.max(0, Math.round(percent)));
  const current = Number(state.progress[id] || 0);
  if (normalized <= current) return;

  state.progress[id] = normalized;
  localStorage.setItem("doc-progress", JSON.stringify(state.progress));
  updateProgressDisplays(id);
}

function updateProgressDisplays(id) {
  const progress = docProgress(id);
  document.querySelectorAll(`[data-doc="${CSS.escape(id)}"]`).forEach((node) => {
    node.querySelectorAll(".doc-status").forEach((status) => {
      status.textContent = progress.status;
    });
    node.querySelectorAll(".doc-percent").forEach((percent) => {
      percent.textContent = `${progress.percent}%`;
    });
    node.querySelectorAll(".doc-progress-track span").forEach((bar) => {
      bar.style.width = `${progress.percent}%`;
    });
  });
}

function updateTierFilter() {
  el.tierFilter.querySelectorAll("[data-tier]").forEach((button) => {
    button.classList.toggle("active", (button.dataset.tier || "") === state.activeTier);
  });
}

function applyTopicsState() {
  el.categoryGrid.classList.toggle("hidden", state.topicsCollapsed);
  el.topicsToggle.innerHTML = state.topicsCollapsed
    ? `<i data-lucide="eye"></i> Show topics`
    : `<i data-lucide="eye-off"></i> Hide topics`;
  el.topicsToggle.setAttribute("aria-pressed", String(state.topicsCollapsed));
  refreshIcons();
}

function groupDocsByCategory() {
  return state.docs.reduce((map, doc) => {
    map.set(doc.category, [...(map.get(doc.category) || []), doc]);
    return map;
  }, new Map());
}

function updateActiveNav() {
  document.querySelectorAll(".active").forEach((node) => node.classList.remove("active"));

  if (state.activeDoc) {
    document.querySelectorAll(`[data-doc="${CSS.escape(state.activeDoc)}"]`).forEach((node) => {
      node.classList.add("active");
    });
    return;
  }

  if (state.activeCategory) {
    document.querySelectorAll(`[data-category="${CSS.escape(state.activeCategory)}"]`).forEach((node) => {
      node.classList.add("active");
    });
    return;
  }

  document.querySelectorAll("[data-home]").forEach((node) => node.classList.add("active"));
}

function updateProgress() {
  if (!state.activeDoc) {
    el.progress.style.width = "0";
    document.body.classList.toggle("topic-selected", Boolean(state.activeCategory));
    return;
  }

  const total = document.documentElement.scrollHeight - window.innerHeight;
  const current = total > 0 ? (window.scrollY / total) * 100 : 0;
  const percent = Math.min(100, Math.max(0, current));
  el.progress.style.width = `${percent}%`;
  saveDocProgress(state.activeDoc, percent);
}

function applyTheme() {
  el.root.dataset.theme = state.theme;
  const icon = state.theme === "dark" ? "moon" : "sun";
  el.themeToggle.innerHTML = `<i data-lucide="${icon}"></i>`;
  refreshIcons();
}

function applyLayoutState() {
  const hideSidebar = state.sidebarCollapsed || state.focusMode;
  const hideToc = state.tocCollapsed || state.focusMode;

  document.body.classList.toggle("sidebar-collapsed", hideSidebar);
  document.body.classList.toggle("toc-collapsed", hideToc);
  document.body.classList.toggle("reading-focus", state.focusMode);

  el.sidebarToggles.forEach((toggle) => {
    const icon = hideSidebar ? "panel-left-open" : "panel-left-close";
    toggle.innerHTML = `<i data-lucide="${icon}"></i>`;
    toggle.setAttribute("aria-label", hideSidebar ? "Show navigation" : "Hide navigation");
  });

  el.tocToggle.innerHTML = hideToc
    ? `<i data-lucide="panel-right-open"></i> Outline`
    : `<i data-lucide="panel-right-close"></i> Outline`;
  el.tocToggle.setAttribute("aria-pressed", String(hideToc));

  el.focusToggle.innerHTML = state.focusMode
    ? `<i data-lucide="minimize-2"></i> Exit focus`
    : `<i data-lucide="maximize-2"></i> Focus`;
  el.focusToggle.setAttribute("aria-pressed", String(state.focusMode));

  refreshIcons();
}

function initializeMermaid() {
  if (!window.mermaid) return;

  const mermaidColors = state.theme === "dark"
    ? {
        background: "#20262e",
        darkMode: true,
        mainBkg: "#17231e",
        nodeBkg: "#17231e",
        nodeBorder: "#80cda7",
        primaryColor: "#17231e",
        primaryTextColor: "#e8eee9",
        primaryBorderColor: "#80cda7",
        lineColor: "#9fb0a8",
        secondaryColor: "#19382c",
        secondaryTextColor: "#e8eee9",
        tertiaryColor: "#20262e",
        tertiaryTextColor: "#e8eee9",
        textColor: "#e8eee9",
        labelTextColor: "#e8eee9",
        edgeLabelBackground: "#17231e",
        clusterBkg: "#20262e",
        clusterBorder: "#5b6572",
        titleColor: "#e8eee9",
        actorBkg: "#17231e",
        actorBorder: "#80cda7",
        actorTextColor: "#e8eee9",
        actorLineColor: "#9fb0a8",
        signalColor: "#9fb0a8",
        signalTextColor: "#e8eee9",
        noteBkgColor: "#19382c",
        noteTextColor: "#e8eee9",
        noteBorderColor: "#80cda7",
      }
    : {
        background: "#f6f8fa",
        primaryColor: "#ffffff",
        primaryTextColor: "#24292f",
        primaryBorderColor: "#d0d7de",
        lineColor: "#57606a",
        secondaryColor: "#e8f0ff",
        tertiaryColor: "#f6f8fa",
        edgeLabelBackground: "#ffffff",
        clusterBkg: "#ffffff",
        clusterBorder: "#d0d7de",
      };

  window.mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    flowchart: {
      htmlLabels: true,
      useMaxWidth: false,
    },
    sequence: {
      useMaxWidth: false,
      wrap: true,
    },
    er: {
      useMaxWidth: false,
    },
    themeVariables: {
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      ...mermaidColors,
    },
  });
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function categoryMeta(category) {
  return CATEGORY_META[category] || {
    label: titleize(category),
    icon: "folder",
    description: "Reference notes and interview material.",
  };
}

function titleize(value) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTierLabel(tier) {
  return {
    "tier-1": "Tier 1",
    "tier-2": "Tier 2",
    "tier-3": "Tier 3",
  }[tier] || titleize(tier);
}

function contentUrl(path) {
  return `content/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function resolveRelativePath(fromPath, targetPath) {
  const parts = fromPath.split("/").slice(0, -1);
  targetPath.split("/").forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") parts.pop();
    else parts.push(part);
  });
  return parts.join("/");
}

function slugify(value) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

boot();
