/**
 * storage.js - Customization State & Persistence Manager
 * Pure Vanilla JavaScript (Zero external dependencies)
 */

window.PortfolioEditor = window.PortfolioEditor || {};

(function () {
  const STORAGE_KEY = "portfolio_playground_state_v1";

  // Allowed CSS properties for style sanitization
  const ALLOWED_STYLE_KEYS = [
    "width",
    "maxWidth",
    "minHeight",
    "height",
    "fontSize",
    "fontWeight",
    "textAlign",
    "color",
    "backgroundColor",
    "borderColor",
    "borderStyle",
    "borderWidth",
    "borderRadius",
    "padding",
    "margin",
    "opacity",
    "boxShadow",
    "position",
    "left",
    "top",
    "transform",
  ];

  function createDefaultState() {
    return {
      version: 1,
      timestamp: Date.now(),
      sectionOrder: ["about", "skills", "projects", "experience", "education", "contact"],
      projectOrder: ["project-vaultx", "project-wows", "project-picloud", "project-queue"],
      hiddenElements: [],
      elements: {},
      decorations: [],
      global: {
        containerWidth: "680px",
        fontFamily: "",
        gridSnap: false,
        gridSize: 16,
      },
    };
  }

  function saveState(state) {
    try {
      if (!state || typeof state !== "object") return false;
      state.timestamp = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.warn("PortfolioEditor: Failed to save customization state to localStorage", err);
      return false;
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const validation = validateState(parsed);
      if (validation.valid) {
        return validation.sanitized;
      } else {
        console.warn("PortfolioEditor: Invalid saved state encountered", validation.errors);
        return null;
      }
    } catch (err) {
      console.warn("PortfolioEditor: Failed to load state from localStorage", err);
      return null;
    }
  }

  function clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (_e) {
      return false;
    }
  }

  /**
   * Sanitizes style values against potential script injection or malformed strings
   */
  function sanitizeStyleValue(prop, val) {
    if (typeof val !== "string" && typeof val !== "number") return "";
    let str = String(val).trim();

    // Disallow javascript:, url(), expression(), or dangerous characters
    if (/javascript:|expression\(|<script|url\(/i.test(str)) {
      return "";
    }

    // Limit length to avoid absurd payloads
    if (str.length > 80) return "";

    return str;
  }

  /**
   * Validates and cleans any external or loaded state structure
   */
  function validateState(input) {
    const errors = [];
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return { valid: false, errors: ["State must be an object"] };
    }

    const sanitized = createDefaultState();

    // Section Order
    if (Array.isArray(input.sectionOrder)) {
      const defaultSections = ["about", "skills", "projects", "experience", "education", "contact"];
      const validSections = input.sectionOrder.filter((s) => typeof s === "string" && defaultSections.includes(s));
      // Append missing sections
      defaultSections.forEach((s) => {
        if (!validSections.includes(s)) validSections.push(s);
      });
      sanitized.sectionOrder = validSections;
    }

    // Project Order
    if (Array.isArray(input.projectOrder)) {
      const defaultProjects = ["project-vaultx", "project-wows", "project-picloud", "project-queue"];
      const validProjects = input.projectOrder.filter((p) => typeof p === "string" && defaultProjects.includes(p));
      defaultProjects.forEach((p) => {
        if (!validProjects.includes(p)) validProjects.push(p);
      });
      sanitized.projectOrder = validProjects;
    }

    // Hidden elements
    if (Array.isArray(input.hiddenElements)) {
      sanitized.hiddenElements = input.hiddenElements.filter((id) => typeof id === "string" && id.length < 50);
    }

    // Elements style map
    if (input.elements && typeof input.elements === "object") {
      sanitized.elements = {};
      Object.keys(input.elements).forEach((elemId) => {
        if (typeof elemId !== "string" || elemId.length > 60) return;
        const elemData = input.elements[elemId];
        if (!elemData || typeof elemData !== "object") return;

        const cleanElem = { style: {} };
        if (elemData.style && typeof elemData.style === "object") {
          ALLOWED_STYLE_KEYS.forEach((key) => {
            if (elemData.style[key] !== undefined) {
              const cleaned = sanitizeStyleValue(key, elemData.style[key]);
              if (cleaned) cleanElem.style[key] = cleaned;
            }
          });
        }

        if (typeof elemData.positionMode === "string") {
          cleanElem.positionMode = elemData.positionMode === "free" ? "free" : "flow";
        }

        sanitized.elements[elemId] = cleanElem;
      });
    }

    // Decorations
    if (Array.isArray(input.decorations)) {
      sanitized.decorations = [];
      input.decorations.forEach((dec) => {
        if (!dec || typeof dec !== "object") return;
        if (!dec.id || typeof dec.id !== "string") return;

        const cleanDec = {
          id: String(dec.id).slice(0, 40),
          type: ["note", "badge", "emoji", "divider"].includes(dec.type) ? dec.type : "note",
          content: typeof dec.content === "string" ? dec.content.slice(0, 300) : "",
          style: {},
          positionMode: dec.positionMode === "free" ? "free" : "flow",
        };

        if (dec.style && typeof dec.style === "object") {
          ALLOWED_STYLE_KEYS.forEach((key) => {
            if (dec.style[key] !== undefined) {
              const cleaned = sanitizeStyleValue(key, dec.style[key]);
              if (cleaned) cleanDec.style[key] = cleaned;
            }
          });
        }

        sanitized.decorations.push(cleanDec);
      });
    }

    // Global properties
    if (input.global && typeof input.global === "object") {
      if (typeof input.global.containerWidth === "string") {
        sanitized.global.containerWidth = sanitizeStyleValue("width", input.global.containerWidth) || "680px";
      }
      if (typeof input.global.gridSnap === "boolean") {
        sanitized.global.gridSnap = input.global.gridSnap;
      }
    }

    return { valid: true, sanitized, errors };
  }

  function exportToJSON(state) {
    const validated = validateState(state);
    return JSON.stringify(validated.sanitized, null, 2);
  }

  function downloadJSON(state, filename = "portfolio-customization.json") {
    const jsonStr = exportToJSON(state);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function parseAndValidateJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const res = validateState(parsed);
      if (!res.valid) {
        return { success: false, error: res.errors.join("; ") };
      }
      return { success: true, state: res.sanitized };
    } catch (err) {
      return { success: false, error: `Invalid JSON format: ${err.message}` };
    }
  }

  window.PortfolioEditor.Storage = {
    createDefaultState,
    saveState,
    loadState,
    clearState,
    validateState,
    exportToJSON,
    downloadJSON,
    parseAndValidateJSON,
  };
})();
