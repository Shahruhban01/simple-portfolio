/**
 * Ruhban Abdullah Portfolio - Minimal Design, Developer-First Functionality
 * Pure Vanilla JavaScript (Zero external dependencies)
 */

const API_BASE_URL = (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:" ||
  window.location.port !== ""
)
  ? "http://localhost:4000"
  : "https://api.developerruhban.online";
const GITHUB_USERNAME = "shahruhban01";
const GITHUB_CACHE_KEY = "portfolio_github_repos";
const GITHUB_CACHE_TIME_KEY = "portfolio_github_timestamp";
const GITHUB_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache
const RESUME_URL = "https://drive.google.com/file/d/1G7nWg2vVoF8bwFJ-woYvTk1OGQL6r1G4/view?usp=sharing";

document.addEventListener("DOMContentLoaded", () => {
  // =========================================================================
  // 1. Toast Notification System
  // =========================================================================
  const toastContainer = document.getElementById("toast-container");

  function showToast(message, type = "info", duration = 3000) {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "status");

    const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
    toast.innerHTML = `<span style="font-weight: bold;">${icon}</span> <span>${escapeHtml(message)}</span>`;

    toastContainer.appendChild(toast);

    const removeToast = () => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(20px)";
      toast.style.transition = "all 0.2s ease";
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    };

    const timer = setTimeout(removeToast, duration);
    toast.addEventListener("click", () => {
      clearTimeout(timer);
      removeToast();
    });
  }

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =========================================================================
  // 2. Clipboard Helper
  // =========================================================================
  async function copyToClipboard(text, successMsg = "Copied to clipboard!") {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-999999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      showToast(successMsg, "success");
      return true;
    } catch (_err) {
      showToast("Unable to copy to clipboard", "error");
      return false;
    }
  }

  // Copy Email Button
  const copyEmailBtn = document.getElementById("copy-email-btn");
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener("click", () => {
      copyToClipboard("shahruhban01@gmail.com", "Email copied: shahruhban01@gmail.com");
    });
  }

  // =========================================================================
  // 3. Theme Manager (Light / Dark)
  // =========================================================================
  const themeBtn = document.getElementById("theme-btn");
  const themeIcon = document.getElementById("theme-icon");
  const themeLabel = document.getElementById("theme-label");
  const metaThemeColor = document.getElementById("meta-theme-color");

  function getPreferredTheme() {
    const saved = localStorage.getItem("portfolio_theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme, save = true) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      if (themeIcon) themeIcon.textContent = "☼";
      if (themeLabel) themeLabel.textContent = "Light";
      if (metaThemeColor) metaThemeColor.setAttribute("content", "#121417");
    } else {
      document.documentElement.removeAttribute("data-theme");
      if (themeIcon) themeIcon.textContent = "◐";
      if (themeLabel) themeLabel.textContent = "Dark";
      if (metaThemeColor) metaThemeColor.setAttribute("content", "#ffffff");
    }
    if (save) {
      localStorage.setItem("portfolio_theme", theme);
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    showToast(`Switched to ${next} theme`);
    return next;
  }

  // Initialize Theme
  applyTheme(getPreferredTheme(), false);
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
  }

  // Listen to OS theme changes if user hasn't set explicit preference
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem("portfolio_theme")) {
      applyTheme(e.matches ? "dark" : "light", false);
    }
  });

  // =========================================================================
  // 4. Smart Project Explorer (Search, Tech Filters & Copy Links)
  // =========================================================================
  const projectSearchInput = document.getElementById("project-search");
  const projectSearchClear = document.getElementById("project-search-clear");
  const projectFilterTags = document.querySelectorAll("#project-filter-tags .filter-tag");
  const projectItems = document.querySelectorAll(".project-item");
  const projectCountText = document.getElementById("project-count-text");
  const projectResetBtn = document.getElementById("project-reset-btn");
  const noProjectsMsg = document.getElementById("no-projects-msg");

  let currentTechFilter = "all";
  let searchQuery = "";

  function filterProjects() {
    let visibleCount = 0;
    const query = searchQuery.trim().toLowerCase();

    projectItems.forEach((item) => {
      const title = (item.getAttribute("data-title") || "").toLowerCase();
      const tags = (item.getAttribute("data-tags") || "").toLowerCase();
      const desc = (item.getAttribute("data-desc") || "").toLowerCase();

      const matchesSearch = !query || title.includes(query) || tags.includes(query) || desc.includes(query);
      const matchesTech = currentTechFilter === "all" || tags.includes(currentTechFilter);

      if (matchesSearch && matchesTech) {
        item.style.display = "";
        visibleCount++;
      } else {
        item.style.display = "none";
      }
    });

    // Update count text
    if (projectCountText) {
      projectCountText.textContent = `Showing ${visibleCount} of ${projectItems.length} featured projects`;
    }

    // Toggle no matches message
    if (noProjectsMsg) {
      noProjectsMsg.style.display = visibleCount === 0 ? "block" : "none";
    }

    // Toggle reset button
    const hasActiveFilters = currentTechFilter !== "all" || query.length > 0;
    if (projectResetBtn) {
      projectResetBtn.style.display = hasActiveFilters ? "inline-block" : "none";
    }

    // Toggle clear search button
    if (projectSearchClear) {
      projectSearchClear.style.display = query.length > 0 ? "block" : "none";
    }
  }

  if (projectSearchInput) {
    projectSearchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      filterProjects();
    });
  }

  if (projectSearchClear) {
    projectSearchClear.addEventListener("click", () => {
      searchQuery = "";
      if (projectSearchInput) {
        projectSearchInput.value = "";
        projectSearchInput.focus();
      }
      filterProjects();
    });
  }

  projectFilterTags.forEach((tagBtn) => {
    tagBtn.addEventListener("click", () => {
      projectFilterTags.forEach((b) => b.classList.remove("active"));
      tagBtn.classList.add("active");
      currentTechFilter = tagBtn.getAttribute("data-filter") || "all";
      filterProjects();
    });
  });

  if (projectResetBtn) {
    projectResetBtn.addEventListener("click", () => {
      searchQuery = "";
      currentTechFilter = "all";
      if (projectSearchInput) projectSearchInput.value = "";
      projectFilterTags.forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-filter") === "all");
      });
      filterProjects();
    });
  }

  // Copy Project Link Action
  document.querySelectorAll(".copy-project-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const url = `${window.location.origin}${window.location.pathname}#${id}`;
      copyToClipboard(url, "Project link copied to clipboard");
    });
  });

  // =========================================================================
  // 5. Dynamic GitHub Repo Explorer & Stats
  // =========================================================================
  const repoCountSpan = document.getElementById("github-repo-count");
  const githubRepoList = document.getElementById("github-repo-list");
  const githubRefreshBtn = document.getElementById("github-refresh-btn");
  const githubStatusNotice = document.getElementById("github-status-notice");

  // Language color map for clean minimal dots
  const langColors = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    HTML: "#e34c26",
    CSS: "#563d7c",
    PHP: "#4F5D95",
    Shell: "#89e051",
    C: "#555555",
    Python: "#3572A5",
  };

  async function fetchGitHubUserStats() {
    if (!repoCountSpan) return;
    try {
      const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (typeof data.public_repos === "number") {
        repoCountSpan.textContent = ` (${data.public_repos} public repositories)`;
        repoCountSpan.style.color = "var(--text-muted)";
        repoCountSpan.style.fontSize = "0.9rem";
      }
    } catch (_err) {
      // Fail silently for rate limit or network offline
    }
  }

  async function loadGitHubRepositories(forceRefresh = false) {
    if (!githubRepoList) return;

    // Check sessionStorage cache first unless force refresh requested
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(GITHUB_CACHE_KEY);
      const cachedTime = sessionStorage.getItem(GITHUB_CACHE_TIME_KEY);
      if (cached && cachedTime && Date.now() - parseInt(cachedTime, 10) < GITHUB_CACHE_TTL) {
        try {
          const repos = JSON.parse(cached);
          renderGitHubRepos(repos, true);
          return;
        } catch (_e) {
          // Cache parse error, proceed with fetch
        }
      }
    }

    githubRepoList.innerHTML = `<p class="meta" style="margin: 0; font-size: 0.82rem;">Fetching latest repositories from GitHub...</p>`;
    if (githubStatusNotice) githubStatusNotice.textContent = "";

    try {
      const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=6`);
      
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          throw new Error("GitHub API rate limit reached. Please view repositories directly on GitHub.");
        }
        throw new Error(`GitHub API request failed (HTTP ${response.status})`);
      }

      const repos = await response.json();
      if (!Array.isArray(repos)) {
        throw new Error("Unexpected GitHub API response structure");
      }

      // Save to cache
      sessionStorage.setItem(GITHUB_CACHE_KEY, JSON.stringify(repos));
      sessionStorage.setItem(GITHUB_CACHE_TIME_KEY, Date.now().toString());

      renderGitHubRepos(repos, false);
      if (forceRefresh) {
        showToast("GitHub repositories updated", "success");
      }
    } catch (err) {
      // Attempt to fallback to cached repos if available
      const cached = sessionStorage.getItem(GITHUB_CACHE_KEY);
      if (cached) {
        try {
          renderGitHubRepos(JSON.parse(cached), true);
          if (githubStatusNotice) {
            githubStatusNotice.textContent = `Offline or rate limited. Showing cached repository data.`;
          }
          return;
        } catch (_e) {}
      }

      githubRepoList.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--text-muted); padding: 8px 0;">
          <p style="margin-bottom: 6px;">${escapeHtml(err.message)}</p>
          <a href="https://github.com/${GITHUB_USERNAME}" target="_blank" rel="noopener noreferrer">
            Open github.com/${GITHUB_USERNAME} &rarr;
          </a>
        </div>
      `;
    }
  }

  function renderGitHubRepos(repos, isFromCache) {
    if (!githubRepoList) return;
    if (!repos || repos.length === 0) {
      githubRepoList.innerHTML = `<p class="meta" style="margin: 0;">No public repositories found.</p>`;
      return;
    }

    let html = "";
    repos.forEach((repo) => {
      const description = repo.description ? escapeHtml(repo.description) : "No description provided.";
      const lang = repo.language || "Plain Text";
      const dotColor = langColors[repo.language] || "#888888";
      const stars = repo.stargazers_count || 0;
      const updatedDate = new Date(repo.updated_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      html += `
        <article class="repo-card">
          <div class="repo-name-row">
            <a href="${escapeHtml(repo.html_url)}" class="repo-name" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(repo.name)}
            </a>
            <span class="repo-meta">★ ${stars}</span>
          </div>
          <p class="repo-desc">${description}</p>
          <div class="repo-meta">
            <span class="lang-badge">
              <span class="lang-dot" style="background-color: ${dotColor};"></span>
              ${escapeHtml(lang)}
            </span>
            <span>Updated ${updatedDate}</span>
          </div>
        </article>
      `;
    });

    githubRepoList.innerHTML = html;

    if (githubStatusNotice) {
      const cacheNote = isFromCache ? " (Cached to respect rate limits)" : " (Live)";
      githubStatusNotice.textContent = `Showing 6 most recently updated repositories${cacheNote}.`;
    }
  }

  if (githubRefreshBtn) {
    githubRefreshBtn.addEventListener("click", () => {
      loadGitHubRepositories(true);
    });
  }

  // Initial fetch for GitHub
  fetchGitHubUserStats();
  loadGitHubRepositories(false);

  // =========================================================================
  // 6. Interactive Command Palette (Ctrl+K or /)
  // =========================================================================
  const paletteOverlay = document.getElementById("palette-overlay");
  const paletteInput = document.getElementById("palette-input");
  const paletteResults = document.getElementById("palette-results");
  const paletteBtn = document.getElementById("palette-btn");

  let paletteSelectedIndex = 0;
  let filteredCommands = [];

  const commandCatalog = [
    {
      id: "about",
      title: "Jump to About",
      desc: "Background, location, and specialization",
      category: "Navigation",
      action: () => navigateToSection("about"),
    },
    {
      id: "skills",
      title: "Jump to Skills",
      desc: "Languages, backend, databases, cloud, and tools",
      category: "Navigation",
      action: () => navigateToSection("skills"),
    },
    {
      id: "projects",
      title: "Jump to Projects",
      desc: "Explore featured backend and distributed systems",
      category: "Navigation",
      action: () => navigateToSection("projects"),
    },
    {
      id: "experience",
      title: "Jump to Experience",
      desc: "Work history at FoodHung and World Social Integration",
      category: "Navigation",
      action: () => navigateToSection("experience"),
    },
    {
      id: "education",
      title: "Jump to Education",
      desc: "BCA degree and coursework",
      category: "Navigation",
      action: () => navigateToSection("education"),
    },
    {
      id: "contact",
      title: "Jump to Contact",
      desc: "Direct message form and communication channels",
      category: "Navigation",
      action: () => navigateToSection("contact"),
    },
    {
      id: "game",
      title: "Play 'Hire Me' Arcade Game",
      desc: "Shoot down job rejections and reach the job offer 🎮",
      category: "Arcade",
      action: () => {
        if (window.HireMeGame) window.HireMeGame.open();
      },
    },
    {
      id: "apocalypse",
      title: "ATS Apocalypse 🎯",
      desc: "Portfolio Destruction & Rebuild game: Battle the ATS filter!",
      category: "Arcade",
      action: () => {
        if (window.ATSApocalypse) window.ATSApocalypse.start();
      },
    },
    {
      id: "customize",
      title: "Interactive Customization Playground",
      desc: "Drag, resize, reorder sections, and customize live styling",
      category: "Playground",
      action: () => {
        if (window.PortfolioEditor && window.PortfolioEditor.Controller) {
          window.PortfolioEditor.Controller.enterCustomization();
        }
      },
    },
    {
      id: "terminal",
      title: "Open Developer Terminal",
      desc: "Interactive CLI interface with custom commands (` key)",
      category: "Tools",
      action: () => openTerminal(),
    },
    {
      id: "theme",
      title: "Toggle Theme",
      desc: "Switch between light and dark mode",
      category: "Appearance",
      action: () => toggleTheme(),
    },
    {
      id: "copy-email",
      title: "Copy Email Address",
      desc: "Copy shahruhban01@gmail.com to clipboard",
      category: "Actions",
      action: () => copyToClipboard("shahruhban01@gmail.com", "Email copied to clipboard"),
    },
    {
      id: "resume",
      title: "Open Resume (PDF)",
      desc: "View official engineering resume in new tab",
      category: "Actions",
      action: () => window.open(RESUME_URL, "_blank", "noopener,noreferrer"),
    },
    {
      id: "github",
      title: "Open GitHub Profile",
      desc: "View github.com/shahruhban01",
      category: "External",
      action: () => window.open(`https://github.com/${GITHUB_USERNAME}`, "_blank", "noopener,noreferrer"),
    },
    {
      id: "shortcuts",
      title: "Keyboard Shortcuts",
      desc: "View all site keyboard bindings (? key)",
      category: "Help",
      action: () => openShortcutsModal(),
    },
    {
      id: "filter-all",
      title: "Reset Project Filters",
      desc: "Show all featured projects in Projects section",
      category: "Projects",
      action: () => {
        navigateToSection("projects");
        if (projectResetBtn) projectResetBtn.click();
      },
    },
  ];

  function openCommandPalette() {
    closeTerminal();
    closeShortcutsModal();
    if (!paletteOverlay || !paletteInput) return;
    paletteOverlay.removeAttribute("hidden");
    paletteInput.value = "";
    filterPaletteCommands("");
    paletteInput.focus();
  }

  function closeCommandPalette() {
    if (paletteOverlay) {
      paletteOverlay.setAttribute("hidden", "");
    }
  }

  function filterPaletteCommands(query) {
    const q = query.trim().toLowerCase();
    filteredCommands = commandCatalog.filter((cmd) => {
      if (!q) return true;
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.desc.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        cmd.id.includes(q)
      );
    });

    paletteSelectedIndex = 0;
    renderPaletteResults();
  }

  function renderPaletteResults() {
    if (!paletteResults) return;
    if (filteredCommands.length === 0) {
      paletteResults.innerHTML = `
        <li style="padding: 12px 14px; color: var(--text-muted); font-size: 0.85rem; text-align: center;">
          No matching commands found. Try "projects", "theme", "contact", or "email".
        </li>
      `;
      return;
    }

    let html = "";
    filteredCommands.forEach((cmd, idx) => {
      const isSelected = idx === paletteSelectedIndex;
      html += `
        <li class="palette-item ${isSelected ? "active" : ""}" data-idx="${idx}" role="option" aria-selected="${isSelected}">
          <div>
            <div style="font-weight: 500;">${escapeHtml(cmd.title)}</div>
            <div class="palette-item-desc">${escapeHtml(cmd.desc)}</div>
          </div>
          <span class="kbd-hint">${escapeHtml(cmd.category)}</span>
        </li>
      `;
    });

    paletteResults.innerHTML = html;

    // Scroll active item into view
    const activeEl = paletteResults.querySelector(".palette-item.active");
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }

    // Click handler for items
    paletteResults.querySelectorAll(".palette-item").forEach((item) => {
      item.addEventListener("click", () => {
        const idx = parseInt(item.getAttribute("data-idx"), 10);
        executePaletteCommand(idx);
      });
    });
  }

  function executePaletteCommand(idx) {
    const cmd = filteredCommands[idx];
    if (cmd && typeof cmd.action === "function") {
      closeCommandPalette();
      cmd.action();
    }
  }

  function navigateToSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      history.pushState(null, "", `#${sectionId}`);
    }
  }

  if (paletteBtn) {
    paletteBtn.addEventListener("click", openCommandPalette);
  }

  if (paletteInput) {
    paletteInput.addEventListener("input", (e) => {
      filterPaletteCommands(e.target.value);
    });

    paletteInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filteredCommands.length > 0) {
          paletteSelectedIndex = (paletteSelectedIndex + 1) % filteredCommands.length;
          renderPaletteResults();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filteredCommands.length > 0) {
          paletteSelectedIndex = (paletteSelectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
          renderPaletteResults();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands.length > 0) {
          executePaletteCommand(paletteSelectedIndex);
        }
      } else if (e.key === "Escape") {
        closeCommandPalette();
      }
    });
  }

  if (paletteOverlay) {
    paletteOverlay.addEventListener("click", (e) => {
      if (e.target === paletteOverlay) {
        closeCommandPalette();
      }
    });
  }

  // =========================================================================
  // 7. Hidden Developer Terminal (Interactive Shell Emulator)
  // =========================================================================
  const terminalDrawer = document.getElementById("terminal-drawer");
  const terminalBody = document.getElementById("terminal-body");
  const terminalOutput = document.getElementById("terminal-output");
  const terminalInput = document.getElementById("terminal-input");
  const terminalBtn = document.getElementById("terminal-btn");
  const terminalCloseBtn = document.getElementById("terminal-close-btn");
  const terminalClearBtn = document.getElementById("terminal-clear-btn");

  let terminalHistory = [];
  let historyIndex = -1;
  let terminalInitialized = false;

  function openTerminal() {
    closeCommandPalette();
    closeShortcutsModal();
    if (!terminalDrawer || !terminalInput) return;
    terminalDrawer.removeAttribute("hidden");
    if (!terminalInitialized) {
      printWelcomeMessage();
      terminalInitialized = true;
    }
    terminalInput.focus();
    scrollTerminalToBottom();
  }

  function closeTerminal() {
    if (terminalDrawer) {
      terminalDrawer.setAttribute("hidden", "");
    }
  }

  function toggleTerminal() {
    if (!terminalDrawer) return;
    if (terminalDrawer.hasAttribute("hidden")) {
      openTerminal();
    } else {
      closeTerminal();
    }
  }

  function printWelcomeMessage() {
    appendTerminalOutput(`
<span class="cmd-echo">Ruhban Abdullah — Interactive Portfolio Shell v2.4</span>
Type <span class="cmd-success">'help'</span> to see available commands or <span class="cmd-success">'exit'</span> to close.
Available shortcuts: press <span class="cmd-meta">[Esc]</span> or <span class="cmd-meta">[\`]</span> to toggle terminal.
`);
  }

  function scrollTerminalToBottom() {
    if (terminalBody) {
      terminalBody.scrollTop = terminalBody.scrollHeight;
    }
  }

  function appendTerminalOutput(htmlContent) {
    if (!terminalOutput) return;
    const div = document.createElement("div");
    div.innerHTML = htmlContent;
    terminalOutput.appendChild(div);
    scrollTerminalToBottom();
  }

  function clearTerminal() {
    if (terminalOutput) {
      terminalOutput.innerHTML = "";
    }
  }

  // Terminal commands dictionary
  const terminalCommands = {
    help: () => {
      return `
Available commands:
  <span class="cmd-success">about</span>          Print engineer bio, focus areas, and location
  <span class="cmd-success">skills</span>         List technical competencies across backend, DB, cloud
  <span class="cmd-success">projects</span>       Show featured projects and technologies
  <span class="cmd-success">experience</span>     Display professional roles and accomplishments
  <span class="cmd-success">education</span>      Display university degrees and coursework
  <span class="cmd-success">contact</span>        Show contact channels and email
  <span class="cmd-success">github</span>         Display GitHub profile and live repository metrics
  <span class="cmd-success">resume</span>         Open official resume PDF in a new tab
  <span class="cmd-success">customize</span>      Launch interactive drag &amp; drop layout playground
  <span class="cmd-success">game</span>           Play the "Hire Me" retro arcade mini-game 🎮
  <span class="cmd-success">apocalypse</span>     Launch "ATS Apocalypse 🎯" portfolio destruction game
  <span class="cmd-success">theme</span>          Change theme (<span class="cmd-meta">theme light</span>, <span class="cmd-meta">theme dark</span>, <span class="cmd-meta">theme toggle</span>)
  <span class="cmd-success">whoami</span>         Print current session identity
  <span class="cmd-success">date</span>           Print current date and time
  <span class="cmd-success">echo</span>           Print arguments to console (<span class="cmd-meta">echo &lt;text&gt;</span>)
  <span class="cmd-success">clear</span>          Clear the terminal display
  <span class="cmd-success">exit</span>           Close the terminal interface
`;
    },

    about: () => {
      return `
<span class="cmd-echo">Ruhban Abdullah</span> — Backend Developer / Software Engineer
Location: Sopore, Jammu & Kashmir, India
Experience: 2+ years professional backend engineering

Specializing in scalable distributed systems, high-concurrency WebSocket services,
query tuning (MySQL/MongoDB), and cloud infrastructure deployment on AWS.
`;
    },

    skills: () => {
      return `
<span class="cmd-echo">Core Competencies:</span>
• <span class="cmd-success">Languages:</span> JavaScript (ES6+), C, Bash, SQL, PHP
• <span class="cmd-success">Backend:</span> Node.js, Express.js, RESTful APIs, WebSockets, Real-Time Architecture
• <span class="cmd-success">Databases:</span> MongoDB, MySQL, Indexing, Query Optimization, Schema Design
• <span class="cmd-success">Cloud/DevOps:</span> AWS (EC2, S3), Cloudflare R2, Render, CI/CD Pipelines
• <span class="cmd-success">Security:</span> JWT, RBAC, Rate Limiting, Authentication Architecture
• <span class="cmd-success">Tools:</span> Git, GitHub, Postman, Linux (Ubuntu), VS Code
`;
    },

    projects: (args) => {
      if (args && args.length > 0) {
        const query = args.join(" ").toLowerCase();
        navigateToSection("projects");
        if (projectSearchInput) {
          projectSearchInput.value = query;
          searchQuery = query;
          filterProjects();
        }
        return `Filtered projects section by: <span class="cmd-success">"${escapeHtml(query)}"</span>`;
      }

      return `
<span class="cmd-echo">Featured Projects:</span>
1. <span class="cmd-success">VaultX</span> — Digital Vault Platform (Flutter, React, Node.js, MongoDB Atlas, R2)
   Live: https://vault.developerruhban.online
2. <span class="cmd-success">WOW'S</span> — Live Streaming Platform (Flutter, PHP, MySQL, AWS S3, WebSockets)
3. <span class="cmd-success">piCloud</span> — Distributed Cloud Storage & File System (Node.js, Express, MongoDB, S3)
4. <span class="cmd-success">Private Queue</span> — Operations Management System (Node.js, MongoDB, MySQL, WebSockets)

Tip: Run <span class="cmd-meta">projects &lt;keyword&gt;</span> (e.g. <span class="cmd-meta">projects aws</span>) to filter on page.
`;
    },

    experience: () => {
      return `
<span class="cmd-echo">Work Experience:</span>
• <span class="cmd-success">Backend Developer / Engineer</span> @ FoodHung (Aug 2025 – Feb 2026)
  - RESTful APIs supporting 10,000+ users and 200–400 req/sec
  - Reduced database latency by 25–35% through indexing and query tuning
  - Managed AWS EC2 deployments with monitoring and auto-restart

• <span class="cmd-success">Software Developer</span> @ World Social Integration (Jun 2024 – Jul 2025)
  - Backend services supporting 15,000+ concurrent users with WebSockets
  - Scaled high-concurrency data streaming architecture

• <span class="cmd-success">Backend Engineering Intern</span> @ FoodHung (Jan 2025 – Jul 2025)
  - Auth flows, request validation, and production cloud infrastructure
`;
    },

    education: () => {
      return `
<span class="cmd-echo">Education:</span>
• <span class="cmd-success">Bachelor of Computer Applications (BCA)</span> (2023 – 2026)
  Govt. Degree College Baramulla (Autonomous)
  Focus: Backend engineering, DBMS, data structures, computer networks
`;
    },

    contact: (args) => {
      if (args[0] === "--copy" || args[0] === "copy") {
        copyToClipboard("shahruhban01@gmail.com", "Email copied to clipboard");
        return `<span class="cmd-success">Copied shahruhban01@gmail.com to clipboard.</span>`;
      }
      return `
<span class="cmd-echo">Contact Channels:</span>
• Email: <span class="cmd-success">shahruhban01@gmail.com</span> (Run <span class="cmd-meta">contact copy</span> to copy)
• WhatsApp / Phone: +91 **********
• LinkedIn: https://linkedin.com/in/shahruhban
• GitHub: https://github.com/shahruhban01
`;
    },

    github: () => {
      const cached = sessionStorage.getItem(GITHUB_CACHE_KEY);
      let repoSnippet = "";
      if (cached) {
        try {
          const list = JSON.parse(cached);
          repoSnippet = `<br>Latest active repos: ` + list.slice(0, 3).map((r) => r.name).join(", ");
        } catch (_e) {}
      }
      return `
<span class="cmd-echo">GitHub Profile:</span> https://github.com/${GITHUB_USERNAME}${repoSnippet}
Tip: Use <span class="cmd-meta">resume</span> to view PDF resume.
`;
    },

    resume: () => {
      window.open(RESUME_URL, "_blank", "noopener,noreferrer");
      return `<span class="cmd-success">Opening resume PDF in new tab...</span>`;
    },

    customize: () => {
      closeTerminal();
      if (window.PortfolioEditor && window.PortfolioEditor.Controller) {
        window.PortfolioEditor.Controller.enterCustomization();
      }
      return `<span class="cmd-success">Interactive playground activated.</span>`;
    },

    game: () => {
      closeTerminal();
      if (window.HireMeGame) window.HireMeGame.open();
      return `<span class="cmd-success">Launching "Hire Me" Arcade Game...</span>`;
    },

    hireme: () => {
      closeTerminal();
      if (window.HireMeGame) window.HireMeGame.open();
      return `<span class="cmd-success">Launching "Hire Me" Arcade Game...</span>`;
    },

    apocalypse: () => {
      closeTerminal();
      if (window.ATSApocalypse) window.ATSApocalypse.start();
      return `<span class="cmd-success">Launching ATS Apocalypse 🎯...</span>`;
    },

    ats: () => {
      closeTerminal();
      if (window.ATSApocalypse) window.ATSApocalypse.start();
      return `<span class="cmd-success">Launching ATS Apocalypse 🎯...</span>`;
    },

    theme: (args) => {
      const mode = args[0] ? args[0].toLowerCase() : "toggle";
      if (mode === "light") {
        applyTheme("light");
        return `Theme set to <span class="cmd-success">light</span>.`;
      } else if (mode === "dark") {
        applyTheme("dark");
        return `Theme set to <span class="cmd-success">dark</span>.`;
      } else if (mode === "toggle") {
        const next = toggleTheme();
        return `Toggled theme to <span class="cmd-success">${next}</span>.`;
      }
      return `<span class="cmd-error">Invalid theme argument.</span> Usage: <span class="cmd-meta">theme [light|dark|toggle]</span>`;
    },

    whoami: () => {
      return `visitor@developerruhban (guest role, read/execute permissions)`;
    },

    date: () => {
      return new Date().toString();
    },

    echo: (args) => {
      return escapeHtml(args.join(" "));
    },

    clear: () => {
      clearTerminal();
      return null;
    },

    exit: () => {
      closeTerminal();
      return `<span class="cmd-meta">Session closed.</span>`;
    },

    // Easter eggs
    sudo: () => {
      return `<span class="cmd-error">Permission denied: Ruhban is the only root user here. This incident has been recorded.</span>`;
    },

    matrix: () => {
      return `<span class="cmd-success">Wake up, Neo... The Matrix has you. Follow the white rabbit. 🐇</span>`;
    },

    quote: () => {
      const quotes = [
        `"Simplicity is prerequisite for reliability." — Edsger W. Dijkstra`,
        `"Premature optimization is the root of all evil." — Donald Knuth`,
        `"Make it work, make it right, make it fast." — Kent Beck`,
        `"Any fool can write code that a computer can understand. Good programmers write code that humans can understand." — Martin Fowler`,
      ];
      return `<span class="cmd-echo">${quotes[Math.floor(Math.random() * quotes.length)]}</span>`;
    },
  };

  function processTerminalInput(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Save to history
    terminalHistory.push(trimmed);
    historyIndex = terminalHistory.length;

    // Print command prompt echo
    appendTerminalOutput(`<div><span class="terminal-prompt">visitor@developerruhban:~$</span> <span class="cmd-echo">${escapeHtml(trimmed)}</span></div>`);

    // Parse command and arguments
    const parts = trimmed.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (Object.prototype.hasOwnProperty.call(terminalCommands, commandName)) {
      try {
        const result = terminalCommands[commandName](args);
        if (result !== null && result !== undefined) {
          appendTerminalOutput(result);
        }
      } catch (err) {
        appendTerminalOutput(`<span class="cmd-error">Execution error: ${escapeHtml(err.message)}</span>`);
      }
    } else {
      appendTerminalOutput(`
<span class="cmd-error">Command not found: "${escapeHtml(commandName)}"</span>.
Type <span class="cmd-success">'help'</span> for a list of valid commands.
`);
    }
  }

  if (terminalBtn) {
    terminalBtn.addEventListener("click", toggleTerminal);
  }

  if (terminalCloseBtn) {
    terminalCloseBtn.addEventListener("click", closeTerminal);
  }

  if (terminalClearBtn) {
    terminalClearBtn.addEventListener("click", clearTerminal);
  }

  if (terminalInput) {
    terminalInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = terminalInput.value;
        terminalInput.value = "";
        processTerminalInput(value);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (terminalHistory.length > 0 && historyIndex > 0) {
          historyIndex--;
          terminalInput.value = terminalHistory[historyIndex];
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (terminalHistory.length > 0 && historyIndex < terminalHistory.length - 1) {
          historyIndex++;
          terminalInput.value = terminalHistory[historyIndex];
        } else {
          historyIndex = terminalHistory.length;
          terminalInput.value = "";
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        // Tab autocompletion
        const current = terminalInput.value.trim().toLowerCase();
        if (current) {
          const match = Object.keys(terminalCommands).find((k) => k.startsWith(current));
          if (match) {
            terminalInput.value = match;
          }
        }
      } else if (e.key === "Escape") {
        closeTerminal();
      }
    });
  }

  // Focus terminal input when clicking anywhere inside terminal drawer
  if (terminalDrawer) {
    terminalDrawer.addEventListener("click", (e) => {
      if (e.target !== terminalCloseBtn && e.target !== terminalClearBtn && terminalInput) {
        terminalInput.focus();
      }
    });
  }

  // =========================================================================
  // 8. Keyboard Shortcuts Modal & Global Key Listener
  // =========================================================================
  const shortcutsOverlay = document.getElementById("shortcuts-overlay");
  const shortcutsBtn = document.getElementById("shortcuts-btn");
  const shortcutsCloseBtn = document.getElementById("shortcuts-close-btn");

  function openShortcutsModal() {
    closeCommandPalette();
    closeTerminal();
    if (shortcutsOverlay) {
      shortcutsOverlay.removeAttribute("hidden");
    }
  }

  function closeShortcutsModal() {
    if (shortcutsOverlay) {
      shortcutsOverlay.setAttribute("hidden", "");
    }
  }

  if (shortcutsBtn) shortcutsBtn.addEventListener("click", openShortcutsModal);
  if (shortcutsCloseBtn) shortcutsCloseBtn.addEventListener("click", closeShortcutsModal);
  if (shortcutsOverlay) {
    shortcutsOverlay.addEventListener("click", (e) => {
      if (e.target === shortcutsOverlay) closeShortcutsModal();
    });
  }

  // Global keydown handler
  let pendingGKey = false;
  let gKeyTimeout = null;

  // Konami Code sequence
  const konamiCode = [
    "ArrowUp", "ArrowUp",
    "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight",
    "ArrowLeft", "ArrowRight",
    "b", "a"
  ];
  let konamiIndex = 0;

  document.addEventListener("keydown", (e) => {
    // Check if focused in an input/textarea
    const activeEl = document.activeElement;
    const isTyping =
      activeEl &&
      (activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.isContentEditable);

    // Escape closes any open modal/drawer regardless of focus
    if (e.key === "Escape") {
      closeCommandPalette();
      closeTerminal();
      closeShortcutsModal();
      return;
    }

    // Ctrl+K or Cmd+K always opens command palette
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openCommandPalette();
      return;
    }

    // Backtick opens/closes terminal unless user is typing in a different form field
    if (e.key === "`" && (!isTyping || activeEl === terminalInput)) {
      e.preventDefault();
      toggleTerminal();
      return;
    }

    // If typing in any input field (like search, form, terminal, or palette), ignore other single-key shortcuts
    if (isTyping) {
      return;
    }

    // Konami code detection
    if (e.key.toLowerCase() === konamiCode[konamiIndex].toLowerCase() || e.key === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        konamiIndex = 0;
        showToast("🎮 Konami Code unlocked! Developer easter egg activated.", "success", 5000);
        openTerminal();
        appendTerminalOutput(`<span class="cmd-success">[EASTER EGG] 30 Extra Lives Granted! Welcome, 1337 engineer.</span>`);
      }
    } else {
      konamiIndex = 0;
    }

    // Forward slash opens Command Palette (or Project Search)
    if (e.key === "/") {
      e.preventDefault();
      openCommandPalette();
      return;
    }

    // '?' opens shortcuts help
    if (e.key === "?") {
      e.preventDefault();
      openShortcutsModal();
      return;
    }

    // 't' or 'T' toggles theme
    if (e.key === "t" || e.key === "T") {
      e.preventDefault();
      toggleTheme();
      return;
    }

    // G + Key navigation sequences (e.g. G then P for projects)
    if (e.key === "g" || e.key === "G") {
      pendingGKey = true;
      clearTimeout(gKeyTimeout);
      gKeyTimeout = setTimeout(() => {
        pendingGKey = false;
      }, 1200);
      return;
    }

    if (pendingGKey) {
      pendingGKey = false;
      clearTimeout(gKeyTimeout);
      const k = e.key.toLowerCase();
      if (k === "p") {
        navigateToSection("projects");
      } else if (k === "a") {
        navigateToSection("about");
      } else if (k === "s") {
        navigateToSection("skills");
      } else if (k === "e") {
        navigateToSection("experience");
      } else if (k === "c") {
        navigateToSection("contact");
      }
    }
  });

  // =========================================================================
  // 9. Contact Form Submission (Preserved API Integration)
  // =========================================================================
  const contactForm = document.getElementById("contact-form");
  const contactStatus = document.getElementById("contact-status");
  const submitBtn = document.getElementById("contact-submit-btn");

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("contact-name");
      const emailInput = document.getElementById("contact-email");
      const subjectInput = document.getElementById("contact-subject");
      const messageInput = document.getElementById("contact-message");

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const subject = subjectInput.value.trim() || "Portfolio Inquiry";
      const message = messageInput.value.trim();

      if (!name || !email || !message) {
        showStatus(contactStatus, "Please complete all required fields.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending message...";
      hideStatus(contactStatus);

      try {
        const response = await fetch(`${API_BASE_URL}/api/contact`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, subject, message }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Failed to send (Status ${response.status})`);
        }

        showStatus(contactStatus, "Thank you! Your message has been sent successfully.", "success");
        showToast("Message sent successfully!", "success");
        contactForm.reset();
      } catch (err) {
        showStatus(
          contactStatus,
          err.message || "Failed to reach server. Please try emailing directly at shahruhban01@gmail.com",
          "error"
        );
        showToast("Message send failed. Please email directly.", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Message";
      }
    });
  }

  function showStatus(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = `status-box ${type}`;
    element.style.display = "block";
  }

  function hideStatus(element) {
    if (!element) return;
    element.textContent = "";
    element.style.display = "none";
  }

  // =========================================================================
  // 10. Unique Visitor Tracking & Public Counter
  // =========================================================================
  /**
   * Browser-Based Pseudonymous Visitor Tracking:
   * 
   * PRIVACY & ACCURACY DOCUMENTATION:
   * - In accordance with privacy best practices, this portfolio strictly avoids invasive fingerprinting.
   * - A random pseudonymous identifier is created on first visit and stored in localStorage and a first-party cookie.
   * - As documented, browser-based identifiers cannot reliably identify the same human across different devices,
   *   distinct browsers, private browsing windows, or when storage/cookies are cleared.
   * - Sessions expire after 30 minutes of inactivity.
   * - Tracking calls are debounced and deduplicated to prevent artificial inflation.
   */
  const VISITOR_ID_KEY = "portfolio_visitor_id";
  const SESSION_ID_KEY = "portfolio_session_id";
  const SESSION_TS_KEY = "portfolio_session_ts";
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  function getCookie(name) {
    const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
    return match ? decodeURIComponent(match[3]) : null;
  }

  function setCookie(name, val, maxAgeDays = 365) {
    try {
      const maxAge = maxAgeDays * 24 * 60 * 60;
      document.cookie = `${name}=${encodeURIComponent(val)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } catch (_e) {}
  }

  function getOrCreateVisitorId() {
    let vid = null;
    try {
      vid = localStorage.getItem(VISITOR_ID_KEY);
    } catch (_e) {}

    if (!vid) {
      vid = getCookie("pv_id");
    }

    if (!vid) {
      vid = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "v_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
      try {
        localStorage.setItem(VISITOR_ID_KEY, vid);
      } catch (_e) {}
      setCookie("pv_id", vid);
    }

    return vid;
  }

  function getOrCreateSession() {
    const now = Date.now();
    let sid = null;
    let isNewSession = false;

    try {
      sid = sessionStorage.getItem(SESSION_ID_KEY);
      const lastTs = Number(sessionStorage.getItem(SESSION_TS_KEY) || 0);

      if (!sid || !lastTs || now - lastTs > SESSION_TIMEOUT_MS) {
        sid = typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "s_" + now.toString(36) + "_" + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem(SESSION_ID_KEY, sid);
        isNewSession = true;
      }
      sessionStorage.setItem(SESSION_TS_KEY, String(now));
    } catch (_e) {
      sid = "s_fallback_" + now;
      isNewSession = true;
    }

    return { sid, isNewSession };
  }

  function detectClientDevice() {
    const ua = navigator.userAgent || "";
    let category = "desktop";
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      category = "tablet";
    } else if (/mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop|windows phone/i.test(ua)) {
      category = "mobile";
    }

    let browser = "Other";
    if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
    else if (ua.includes("Chrome") && !ua.includes("Chromium")) browser = "Chrome";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Firefox")) browser = "Firefox";

    let os = "Other";
    if (ua.includes("Win")) os = "Windows";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";

    return { category, browser, os };
  }

  // Public visitor counter element
  const visitorCountNum = document.getElementById("visitor-count-number");

  async function updateVisitorCounterUI() {
    if (!visitorCountNum) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/tracking/visitor-count`);
      if (!res.ok) throw new Error("Count endpoint returned " + res.status);
      const data = await res.json();
      if (typeof data.count === "number") {
        visitorCountNum.textContent = data.count.toLocaleString();
      } else {
        visitorCountNum.textContent = "--";
      }
    } catch (_err) {
      // Never show fabricated numbers if API is unreachable
      visitorCountNum.textContent = "Unavailable";
    }
  }

  let lastTrackedSection = "";
  let lastTrackedTime = 0;

  async function trackVisit(sectionName = "home") {
    const now = Date.now();
    // Deduplicate rapid repeat pings for same section within 10 seconds
    if (sectionName === lastTrackedSection && now - lastTrackedTime < 10000) {
      return;
    }
    lastTrackedSection = sectionName;
    lastTrackedTime = now;

    const visitorId = getOrCreateVisitorId();
    const { sid, isNewSession } = getOrCreateSession();
    const device = detectClientDevice();

    try {
      const res = await fetch(`${API_BASE_URL}/api/tracking/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId,
          sessionId: sid,
          page: window.location.pathname || "/",
          section: sectionName,
          referrer: document.referrer || "",
          device,
          isNewSession,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.totalUniqueVisitors && visitorCountNum) {
          visitorCountNum.textContent = data.totalUniqueVisitors.toLocaleString();
        }
      }
    } catch (_err) {
      // Silently proceed if analytics endpoint is temporarily offline
    }
  }

  // Initial visit tracking on load
  trackVisit("home");
  updateVisitorCounterUI();

  // Track section transitions when user scrolls or clicks nav
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target.id) {
          trackVisit(entry.target.id);
        }
      });
    },
    { threshold: 0.4 }
  );

  document.querySelectorAll("section[id]").forEach((sec) => {
    sectionObserver.observe(sec);
  });

  // =========================================================================
  // 11. Transparent Location Permission Prompt
  // =========================================================================
  const locationPrompt = document.getElementById("location-prompt");
  const locationAllowBtn = document.getElementById("location-allow-btn");
  const locationDeclineBtn = document.getElementById("location-decline-btn");
  const locationCloseBtn = document.getElementById("location-prompt-close-btn");
  const LOCATION_PREF_KEY = "portfolio_location_pref_choice";

  function shouldShowLocationPrompt() {
    try {
      return !localStorage.getItem(LOCATION_PREF_KEY);
    } catch (_e) {
      return false;
    }
  }

  function setLocationPref(choice) {
    try {
      localStorage.setItem(LOCATION_PREF_KEY, choice);
    } catch (_e) {}
  }

  function hideLocationPrompt() {
    if (locationPrompt) {
      locationPrompt.hidden = true;
      locationPrompt.style.display = "none";
    }
  }

  // Display location prompt smoothly after visitor engages
  if (shouldShowLocationPrompt() && locationPrompt) {
    setTimeout(() => {
      if (shouldShowLocationPrompt()) {
        locationPrompt.hidden = false;
        locationPrompt.style.display = "block";
      }
    }, 1800);
  }

  // Action: Allow location access
  if (locationAllowBtn) {
    locationAllowBtn.addEventListener("click", () => {
      hideLocationPrompt();
      setLocationPref("prompt_allowed");

      // The browser native permission dialog is triggered ONLY after visitor clicked allow
      if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser.", "info");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const visitorId = getOrCreateVisitorId();

          try {
            const res = await fetch(`${API_BASE_URL}/api/tracking/location`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                visitorId,
                latitude,
                longitude,
                accuracy,
                timestamp: position.timestamp || Date.now(),
              }),
            });

            if (res.ok) {
              setLocationPref("granted");
              showToast("Location updated for portfolio analytics. Thank you! 📍", "success");
            }
          } catch (_e) {
            // Graceful fallback
          }
        },
        async (err) => {
          setLocationPref("denied_in_browser");
          const visitorId = getOrCreateVisitorId();
          try {
            await fetch(`${API_BASE_URL}/api/tracking/consent`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                visitorId,
                promptDismissed: true,
                consented: false,
              }),
            });
          } catch (_e) {}

          if (err.code === err.PERMISSION_DENIED) {
            showToast("Location access declined. Using approximate IP location instead.", "info");
          }
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  // Action: Continue without sharing
  if (locationDeclineBtn) {
    locationDeclineBtn.addEventListener("click", async () => {
      hideLocationPrompt();
      setLocationPref("declined");
      const visitorId = getOrCreateVisitorId();
      try {
        await fetch(`${API_BASE_URL}/api/tracking/consent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId,
            promptDismissed: true,
            consented: false,
          }),
        });
      } catch (_e) {}
    });
  }

  // Action: Close 'X' button
  if (locationCloseBtn) {
    locationCloseBtn.addEventListener("click", () => {
      hideLocationPrompt();
      setLocationPref("dismissed");
    });
  }
});

