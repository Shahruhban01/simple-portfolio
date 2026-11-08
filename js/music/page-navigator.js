// Seamless Public Page Navigator for Ruhban Abdullah Portfolio
// Preserves persistent audio playback across portfolio navigation without full-page reloads

export class PageNavigator {
  constructor() {
    this.isNavigating = false;
    this.handlers = new Map();
    this.cachedViews = new Map();

    // Cache initial view on load
    const initialMain = document.querySelector("main");
    if (initialMain) {
      if (initialMain.classList.contains("music-page-container")) {
        this.cachedViews.set("music", initialMain);
      } else {
        this.cachedViews.set("portfolio", initialMain);
      }
    }

    this._setupProgressBar();
    this._attachLinkInterceptor();
    this._attachPopstateListener();
  }

  _setupProgressBar() {
    let bar = document.getElementById("nav-progress-indicator");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "nav-progress-indicator";
      bar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        width: 0%;
        background-color: var(--accent, #60a5fa);
        z-index: 99999;
        transition: width 0.2s ease, opacity 0.3s ease;
        opacity: 0;
        pointer-events: none;
      `;
      document.body.appendChild(bar);
    }
    this.progressBar = bar;
  }

  _startProgress() {
    if (!this.progressBar) return;
    this.progressBar.style.opacity = "1";
    this.progressBar.style.width = "40%";
  }

  _finishProgress() {
    if (!this.progressBar) return;
    this.progressBar.style.width = "100%";
    setTimeout(() => {
      this.progressBar.style.opacity = "0";
      setTimeout(() => {
        this.progressBar.style.width = "0%";
      }, 300);
    }, 200);
  }

  _isMusicUrl(url) {
    const pathname = url.pathname.replace(/\/$/, "");
    return (
      pathname.endsWith("/music") ||
      pathname.includes("/music/index.html") ||
      pathname.endsWith("music")
    );
  }

  _isPortfolioUrl(url) {
    const pathname = url.pathname.replace(/\/$/, "");
    return (
      pathname === "" ||
      pathname.endsWith("/simple-portfolio") ||
      pathname.endsWith("index.html")
    );
  }

  _attachLinkInterceptor() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href) return;

      // Ignore external links, new tabs, downloads, javascript:, mailto:, tel:
      if (
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      // Check destination origin
      try {
        const dest = new URL(href, window.location.href);
        if (dest.origin !== window.location.origin) return;

        // Never intercept admin routes or upload
        if (dest.pathname.includes("/admin") || dest.pathname.includes("upload.html")) {
          return;
        }

        const isDestMusic = this._isMusicUrl(dest);
        const isDestPortfolio = this._isPortfolioUrl(dest);

        // If not navigating between music and portfolio, let normal browser handle
        if (!isDestMusic && !isDestPortfolio) {
          return;
        }

        const isCurrentMusic = this._isMusicUrl(window.location);
        const isCurrentPortfolio = this._isPortfolioUrl(window.location);

        // Same page with hash anchor (e.g. #projects on home page)
        if (
          (isCurrentPortfolio && isDestPortfolio && dest.hash) ||
          (isCurrentMusic && isDestMusic && dest.hash)
        ) {
          return;
        }

        // Intercept and navigate via SPA to keep music playing
        e.preventDefault();
        this.navigate(dest.href, true, dest.hash);
      } catch (_e) {
        // Fallback to normal navigation
      }
    });
  }

  _attachPopstateListener() {
    window.addEventListener("popstate", () => {
      this.navigate(window.location.href, false, window.location.hash);
    });
  }

  async navigate(urlStr, pushState = true, hash = "") {
    if (this.isNavigating) return;
    this.isNavigating = true;
    this._startProgress();

    try {
      const dest = new URL(urlStr, window.location.href);
      const isTargetMusic = this._isMusicUrl(dest);
      const targetType = isTargetMusic ? "music" : "portfolio";

      const currentMain = document.querySelector("main");

      // Check if we have the view cached
      if (this.cachedViews.has(targetType)) {
        const cachedMain = this.cachedViews.get(targetType);
        if (currentMain && currentMain !== cachedMain) {
          currentMain.replaceWith(cachedMain);
        }

        this._updateDocumentState(targetType, dest.href, pushState, hash);
        this._triggerPostNavigate(targetType, { fromCache: true });
        return;
      }

      // Not cached: Fetch the HTML
      const response = await fetch(dest.href, {
        headers: { "X-Requested-With": "SPA-Navigator" }
      });

      if (!response.ok) {
        window.location.href = dest.href;
        return;
      }

      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      const selector = isTargetMusic ? "main.music-page-container" : "main.container";
      let newMain = doc.querySelector(selector) || doc.querySelector("main");

      if (newMain && currentMain) {
        // Cache the newly fetched view
        this.cachedViews.set(targetType, newMain);

        // If navigating to portfolio from a page that was missing modals/overlays, inject them
        if (targetType === "portfolio") {
          this._ensurePortfolioShell(doc);
        }

        currentMain.replaceWith(newMain);
        this._updateDocumentState(targetType, dest.href, pushState, hash, doc.title);
        this._triggerPostNavigate(targetType, { fromCache: false, doc });
      } else {
        window.location.href = dest.href;
      }
    } catch (err) {
      console.warn("Navigation error, fallback:", err);
      window.location.href = urlStr;
    } finally {
      this._finishProgress();
      this.isNavigating = false;
    }
  }

  _updateDocumentState(targetType, url, pushState, hash = "", title = "") {
    const defaultTitle = targetType === "music"
      ? "Music Library & Web Player - Ruhban Abdullah"
      : "Ruhban Abdullah - Software Engineer & Full-Stack Developer";

    document.title = title || defaultTitle;

    if (pushState) {
      window.history.pushState({ targetType, url }, "", url);
    }

    if (hash) {
      const id = hash.replace("#", "");
      const elem = document.getElementById(id);
      if (elem) {
        setTimeout(() => elem.scrollIntoView({ behavior: "smooth" }), 50);
        return;
      }
    }

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  _ensurePortfolioShell(doc) {
    // If overlays like palette, terminal, game modals are missing, inject them
    const requiredIds = [
      "palette-overlay",
      "terminal-drawer",
      "shortcuts-overlay",
      "game-overlay",
      "apocalypse-overlay"
    ];

    requiredIds.forEach((id) => {
      if (!document.getElementById(id)) {
        const sourceElem = doc.getElementById(id);
        if (sourceElem) {
          document.body.appendChild(sourceElem.cloneNode(true));
        }
      }
    });

    // If script.js has not been loaded, load it
    if (!window.portfolioScriptLoaded && !document.querySelector('script[src*="script.js"]')) {
      window.portfolioScriptLoaded = true;
      const script = document.createElement("script");
      script.src = "/script.js";
      document.body.appendChild(script);
    }
  }

  async _triggerPostNavigate(targetType, data) {
    if (targetType === "music") {
      // Initialize music view
      if (window.initMusicApp) {
        window.initMusicApp();
      } else {
        try {
          const mod = await import("/music/music.js");
          if (mod && mod.initMusicApp) {
            mod.initMusicApp();
          }
        } catch (_e) {
          try {
            const mod2 = await import("./music/music.js");
            if (mod2 && mod2.initMusicApp) mod2.initMusicApp();
          } catch (_e2) {}
        }
      }
      this._emit("musicLoaded", data);
    } else {
      // Re-initialize portfolio features if needed
      if (window.initPortfolioApp) {
        window.initPortfolioApp();
      }
      this._emit("portfolioLoaded", data);
    }
  }

  on(event, callback) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(callback);
    return () => {
      const arr = this.handlers.get(event);
      if (arr) this.handlers.set(event, arr.filter((cb) => cb !== callback));
    };
  }

  _emit(event, data) {
    const arr = this.handlers.get(event);
    if (!arr) return;
    arr.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error(`PageNavigator error on ${event}:`, e);
      }
    });
  }
}

if (typeof window !== "undefined") {
  window.PageNavigator = PageNavigator;
}
