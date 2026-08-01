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
  search: "",
  focusMode: false,
  sidebarCollapsed: localStorage.getItem("sidebar-collapsed") === "true",
  topicsCollapsed: localStorage.getItem("topics-collapsed") === "true",
  tocCollapsed: localStorage.getItem("toc-collapsed") === "true",
  theme: localStorage.getItem("theme") || "light",
};
let mermaidRenderId = 0;

const el = {
  root: document.documentElement,
  progress: document.querySelector("#reading-progress"),
  search: document.querySelector("#global-search"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  themeToggle: document.querySelector("#theme-toggle"),
  menuToggle: document.querySelector("#menu-toggle"),
  sidebar: document.querySelector("#sidebar"),
  categoryNav: document.querySelector("#category-nav"),
  homeView: document.querySelector("#home-view"),
  docView: document.querySelector("#doc-view"),
  categoryGrid: document.querySelector("#category-grid"),
  topicsTitle: document.querySelector("#topics-title"),
  topicsToggle: document.querySelector("#topics-toggle"),
  docList: document.querySelector("#doc-list"),
  libraryTitle: document.querySelector("#library-title"),
  clearFilter: document.querySelector("#clear-filter"),
  tierFilter: document.querySelector("#tier-filter"),
  statDocs: document.querySelector("#stat-docs"),
  statCategories: document.querySelector("#stat-categories"),
  statHld: document.querySelector("#stat-hld"),
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

  el.sidebarToggle.addEventListener("click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    localStorage.setItem("sidebar-collapsed", state.sidebarCollapsed);
    applyLayoutState();
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
    state.search = "";
    el.search.value = "";
    renderCategoryGrid();
    renderDocList();
    updateActiveNav();
  });

  document.addEventListener("click", (event) => {
    const homeButton = event.target.closest("[data-home]");
    const categoryButton = event.target.closest("[data-category]");
    const tierButton = event.target.closest("[data-tier]");
    const docButton = event.target.closest("[data-doc]");
    const pageAnchor = event.target.closest(".article a[href^='#'], .toc a[href^='#']");

    if (pageAnchor && !pageAnchor.dataset.doc) {
      event.preventDefault();
      const target = document.querySelector(pageAnchor.getAttribute("href"));
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (homeButton) {
      event.preventDefault();
      state.activeCategory = "";
      state.activeTier = "";
      showHome();
      return;
    }

    if (categoryButton) {
      state.activeCategory = categoryButton.dataset.category;
      if (state.activeCategory !== "hld") {
        state.activeTier = "";
      }
      showHome({ updateHash: false });
      updateActiveNav();
      document.body.classList.remove("nav-open");
      return;
    }

    if (tierButton) {
      state.activeCategory = "hld";
      state.activeTier = tierButton.dataset.tier || "";
      showHome({ updateHash: false });
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
  const docsByCategory = groupDocsByCategory();
  el.statDocs.textContent = state.docs.length;
  el.statCategories.textContent = state.categories.length;
  el.statHld.textContent = docsByCategory.get("hld")?.length || 0;

  el.categoryNav.innerHTML = [
    `<p class="sidebar-section-title">Topics</p>`,
    ...state.categories.map((category) => {
      const meta = categoryMeta(category);
      const count = docsByCategory.get(category)?.length || 0;
      return `
        <button class="category-link" data-category="${escapeHtml(category)}">
          <i data-lucide="${meta.icon}"></i>
          <span>${escapeHtml(meta.label)}</span>
          <small>${count}</small>
        </button>
      `;
    }),
  ].join("");

  renderCategoryGrid();
  renderDocList();
}

function renderCategoryGrid() {
  const docsByCategory = groupDocsByCategory();
  const visibleCategories = state.activeCategory ? [state.activeCategory] : state.categories;
  el.topicsTitle.textContent = state.activeCategory ? categoryMeta(state.activeCategory).label : "Topics";

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

  if (!docs.length) {
    el.docList.innerHTML = `<div class="empty-state">No notes match this view.</div>`;
    refreshIcons();
    return;
  }

  el.docList.innerHTML = docs.map((doc) => `
    <button class="doc-item" data-doc="${escapeHtml(doc.id)}">
      <span>
        <h3>${escapeHtml(doc.title)}</h3>
        <p>${escapeHtml(doc.description || categoryMeta(doc.category).description)}</p>
      </span>
      <span class="path">${escapeHtml(doc.path)}</span>
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
  state.activeTier = "";
  el.homeView.classList.add("hidden");
  el.docView.classList.remove("hidden");
  el.docCategory.textContent = categoryMeta(doc.category).label;
  el.docTitle.textContent = doc.title;
  el.docDescription.textContent = doc.description || categoryMeta(doc.category).description;
  el.sourceLink.href = `https://github.com/vipi-n/swe-101/blob/main/${doc.path}`;
  el.article.innerHTML = `<div class="empty-state">Loading note...</div>`;
  el.tocLinks.innerHTML = "";
  document.body.classList.remove("nav-open");
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

  normalizeHeadings();
  rewriteLinks(doc);
  await renderMermaidBlocks();
  enhanceCodeBlocks();
  buildToc();
  refreshIcons();
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
    const query = `${doc.title} ${doc.description} ${doc.path} ${doc.category}`.toLowerCase();
    const searchMatch = !state.search || query.includes(state.search);
    return categoryMatch && tierMatch && searchMatch;
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
    return;
  }

  const total = document.documentElement.scrollHeight - window.innerHeight;
  const current = total > 0 ? (window.scrollY / total) * 100 : 0;
  el.progress.style.width = `${Math.min(100, Math.max(0, current))}%`;
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

  el.sidebarToggle.innerHTML = hideSidebar
    ? `<i data-lucide="panel-left-open"></i>`
    : `<i data-lucide="panel-left-close"></i>`;
  el.sidebarToggle.setAttribute("aria-label", hideSidebar ? "Show navigation" : "Hide navigation");

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
        primaryColor: "#2e343c",
        primaryTextColor: "#f2f4f6",
        primaryBorderColor: "#5b6572",
        lineColor: "#a8b3c2",
        secondaryColor: "#28374f",
        tertiaryColor: "#252a31",
        edgeLabelBackground: "#252a31",
        clusterBkg: "#252a31",
        clusterBorder: "#5b6572",
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
