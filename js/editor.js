/**
 * editor.js - Central Playground Controller & Contextual Inspector
 * Pure Vanilla JavaScript
 */

window.PortfolioEditor = window.PortfolioEditor || {};

(function () {
  const { Storage, History, Presets, DragDrop, Resize } = window.PortfolioEditor;

  class PortfolioEditorController {
    constructor() {
      this.isActive = false;
      this.state = null;
      this.selectedElement = null;
      this.selectedCustomId = null;
      this.history = new History(35);
      this.dragDrop = null;
      this.resizeEngine = null;

      this.previewMode = "desktop"; // 'desktop' | 'tablet' | 'mobile'

      // DOM references
      this.container = null;
      this.topbar = null;
      this.inspector = null;
      this.hiddenBar = null;
      this.selectionBox = null;
      this.previewWrapper = null;
    }

    init() {
      this.container = document.querySelector("main.container");
      if (!this.container) return;

      // Mark default sections and elements with stable IDs
      this.setupCustomIds();

      // Load saved state or default
      const saved = Storage.loadState();
      this.state = saved || Storage.createDefaultState();

      // Apply initial state to DOM
      this.applyStateToDOM(this.state, false);

      // Initialize history with initial state
      this.history.push(this.state, "Initial state");

      // Initialize Drag & Drop and Resize engines
      this.initEngines();

      // Setup global keyboard listeners
      this.setupKeyboardShortcuts();

      // Listen for history changes to update undo/redo buttons
      this.history.subscribe((info) => {
        this.updateHistoryButtons(info);
      });

      // Bind customize toolbar button
      const customizeBtn = document.getElementById("customize-btn");
      if (customizeBtn) {
        customizeBtn.addEventListener("click", () => {
          this.toggleCustomization();
        });
      }
    }

    setupCustomIds() {
      // Mark sections
      const sections = ["about", "skills", "projects", "experience", "education", "contact"];
      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.setAttribute("data-custom-id", `section-${id}`);
      });

      // Mark header
      const header = document.querySelector("header");
      if (header) header.setAttribute("data-custom-id", "header-intro");

      // Mark projects
      document.querySelectorAll(".project-item").forEach((item) => {
        const id = item.id;
        if (id) item.setAttribute("data-custom-id", id);
      });
    }

    initEngines() {
      this.dragDrop = new DragDrop({
        container: this.container,
        onReorder: (data) => this.handleDOMReorder(data),
        onFreeMove: (data) => this.handleFreeMove(data),
        onDragEnd: (data) => this.handleDragEnd(data),
      });

      this.resizeEngine = new Resize({
        container: this.container,
        onResize: (data) => this.handleResizeMove(data),
        onResizeEnd: (data) => this.handleResizeEnd(data),
      });
    }

    toggleCustomization() {
      if (this.isActive) {
        this.exitCustomization();
      } else {
        this.enterCustomization();
      }
    }

    enterCustomization() {
      this.isActive = true;
      document.body.classList.add("customization-active");

      // Render Editor UI
      this.renderTopBar();
      this.renderHiddenBar();
      this.renderInspector();
      this.attachElementInspectListeners();

      // Update customize button state
      const customizeBtn = document.getElementById("customize-btn");
      if (customizeBtn) {
        customizeBtn.classList.add("active");
        customizeBtn.innerHTML = `<span>✕</span> Done`;
      }

      this.showToast("Interactive Customization Mode Activated! Click any element to style or drag.", "info");
    }

    exitCustomization() {
      this.isActive = false;
      document.body.classList.remove("customization-active");

      this.deselectElement();
      this.setPreviewMode("desktop");

      if (this.topbar) this.topbar.remove();
      if (this.hiddenBar) this.hiddenBar.remove();
      if (this.inspector) this.inspector.remove();

      // Detach listeners from editable elements
      this.detachElementInspectListeners();

      // Save state to storage
      Storage.saveState(this.state);

      const customizeBtn = document.getElementById("customize-btn");
      if (customizeBtn) {
        customizeBtn.classList.remove("active");
        customizeBtn.innerHTML = `<span class="kbd-hint">✦</span> Customize`;
      }

      this.showToast("Customizations saved! Returning to standard view.", "success");
    }

    // =========================================================================
    // DOM Rendering & Application of State
    // =========================================================================
    applyStateToDOM(state, recordHistory = true) {
      if (!state) return;

      // 1. Reorder sections in container
      if (Array.isArray(state.sectionOrder)) {
        state.sectionOrder.forEach((secName) => {
          const sec = document.getElementById(secName);
          if (sec && sec.parentNode === this.container) {
            // Check preceding hr if any
            const prevHr = sec.previousElementSibling;
            if (prevHr && prevHr.tagName === "HR") {
              this.container.appendChild(prevHr);
            }
            this.container.appendChild(sec);
          }
        });
      }

      // Always keep footer at the very bottom
      this.ensureFooterAtBottom();

      // 2. Reorder projects
      if (Array.isArray(state.projectOrder)) {
        const list = document.getElementById("project-items-list");
        if (list) {
          state.projectOrder.forEach((projId) => {
            const item = document.getElementById(projId);
            if (item && item.parentNode === list) {
              list.appendChild(item);
            }
          });
        }
      }

      // 3. Reset existing inline styles on customizable elements first
      document.querySelectorAll("[data-custom-id]").forEach((el) => {
        el.removeAttribute("style");
      });

      // 4. Apply custom element styles
      if (state.elements && typeof state.elements === "object") {
        Object.keys(state.elements).forEach((customId) => {
          const el = document.querySelector(`[data-custom-id="${customId}"]`);
          if (el && state.elements[customId].style) {
            Object.assign(el.style, state.elements[customId].style);
          }
        });
      }

      // 5. Apply hidden state
      const hiddenList = state.hiddenElements || [];
      document.querySelectorAll("[data-custom-id]").forEach((el) => {
        const id = el.getAttribute("data-custom-id");
        if (hiddenList.includes(id)) {
          el.style.display = "none";
        }
      });

      // 6. Render user decorations
      this.renderDecorations(state.decorations || []);

      // 7. Apply global settings
      if (state.global) {
        if (state.global.containerWidth) {
          this.container.style.maxWidth = state.global.containerWidth;
        }
        if (this.dragDrop) {
          this.dragDrop.setGridSnap(state.global.gridSnap, state.global.gridSize);
        }
      }

      // Update hidden elements bar
      if (this.isActive) {
        this.renderHiddenBar();
        if (this.selectedElement) {
          this.updateInspectorValues();
        }
      }

      if (recordHistory) {
        Storage.saveState(this.state);
      }
    }

    renderDecorations(decorations) {
      // Remove previously rendered decorations
      document.querySelectorAll(".user-decoration").forEach((d) => d.remove());

      decorations.forEach((dec) => {
        const el = document.createElement("div");
        el.className = `user-decoration decoration-${dec.type}`;
        el.setAttribute("data-custom-id", dec.id);
        el.setAttribute("data-decoration-type", dec.type);

        if (dec.style) {
          Object.assign(el.style, dec.style);
        }

        // Render content
        if (dec.type === "note") {
          el.innerHTML = `
            <div class="decoration-header">
              <span class="decoration-tag">Note</span>
              <button type="button" class="decoration-del-btn" title="Delete note">✕</button>
            </div>
            <div class="decoration-text" contenteditable="true" spellcheck="false">${this.escape(dec.content || "Write a custom note here...")}</div>
          `;
        } else if (dec.type === "badge") {
          el.innerHTML = `
            <span class="badge-text" contenteditable="true" spellcheck="false">${this.escape(dec.content || "Custom Badge")}</span>
            <button type="button" class="decoration-del-btn" title="Delete badge">✕</button>
          `;
        } else if (dec.type === "emoji") {
          el.innerHTML = `
            <span class="emoji-text">${this.escape(dec.content || "🚀")}</span>
            <button type="button" class="decoration-del-btn" title="Delete emoji">✕</button>
          `;
        } else if (dec.type === "divider") {
          el.innerHTML = `<div class="divider-line"></div>`;
        }

        // Handle inline editing of note / badge content
        const editableText = el.querySelector("[contenteditable]");
        if (editableText) {
          editableText.addEventListener("blur", () => {
            dec.content = editableText.textContent.trim();
            this.commitChange("Edit decoration text");
          });
        }

        const delBtn = el.querySelector(".decoration-del-btn");
        if (delBtn) {
          delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.deleteDecoration(dec.id);
          });
        }

        // Insert at designated place or append to container
        const insertTarget = document.getElementById("projects") || this.container.firstChild;
        if (insertTarget && insertTarget.parentNode === this.container) {
          this.container.insertBefore(el, insertTarget);
        } else {
          this.container.appendChild(el);
        }
      });
    }

    // =========================================================================
    // Top Control Bar
    // =========================================================================
    renderTopBar() {
      if (this.topbar) this.topbar.remove();

      this.topbar = document.createElement("div");
      this.topbar.id = "editor-topbar";
      this.topbar.className = "editor-topbar";

      this.topbar.innerHTML = `
        <div class="editor-topbar-left">
          <span class="editor-badge">✦ Playground</span>
          <button type="button" id="editor-undo-btn" class="editor-btn" title="Undo (Ctrl+Z)" disabled>↶ Undo</button>
          <button type="button" id="editor-redo-btn" class="editor-btn" title="Redo (Ctrl+Shift+Z)" disabled>↷ Redo</button>
          
          <div class="editor-dropdown">
            <button type="button" class="editor-btn">Layout Presets ▾</button>
            <div class="editor-dropdown-menu">
              <button type="button" class="editor-menu-item" data-preset="minimal">Minimal (Default)</button>
              <button type="button" class="editor-menu-item" data-preset="developer">Developer Mode</button>
              <button type="button" class="editor-menu-item" data-preset="compact">Compact snuggled</button>
              <button type="button" class="editor-menu-item" data-preset="creative">Creative Cards</button>
              <button type="button" class="editor-menu-item" data-preset="terminal">Terminal Retro</button>
            </div>
          </div>

          <button type="button" id="editor-surprise-btn" class="editor-btn" title="Randomize section order, colors & cards">🎲 Surprise Me</button>

          <div class="editor-dropdown">
            <button type="button" class="editor-btn">+ Add Widget ▾</button>
            <div class="editor-dropdown-menu">
              <button type="button" class="editor-menu-item" data-add="note">📝 Sticky Note</button>
              <button type="button" class="editor-menu-item" data-add="badge">🏷️ Status Badge</button>
              <button type="button" class="editor-menu-item" data-add="emoji">🚀 Floating Emoji</button>
              <button type="button" class="editor-menu-item" data-add="divider">─ Divider Rule</button>
            </div>
          </div>
        </div>

        <div class="editor-topbar-right">
          <div class="editor-preview-group" title="Responsive Device Preview">
            <button type="button" class="editor-preview-btn active" data-preview="desktop" title="Desktop View (100%)">🖥️</button>
            <button type="button" class="editor-preview-btn" data-preview="tablet" title="Tablet View (768px)">📱</button>
            <button type="button" class="editor-preview-btn" data-preview="mobile" title="Mobile View (375px)">📲</button>
          </div>

          <label class="editor-snap-label" title="Snap elements to 16px grid">
            <input type="checkbox" id="editor-grid-snap-cb" ${this.state.global.gridSnap ? "checked" : ""}>
            <span>Grid Snap</span>
          </label>

          <div class="editor-dropdown">
            <button type="button" class="editor-btn">File ▾</button>
            <div class="editor-dropdown-menu">
              <button type="button" id="editor-export-btn" class="editor-menu-item">Export Layout (JSON)</button>
              <button type="button" id="editor-import-btn" class="editor-menu-item">Import Layout (JSON)</button>
              <button type="button" id="editor-reset-all-btn" class="editor-menu-item" style="color: #dc2626;">Reset Everything</button>
            </div>
          </div>

          <button type="button" id="editor-done-btn" class="editor-btn editor-btn-primary" title="Finish and save layout">Done ✓</button>
        </div>
      `;

      document.body.appendChild(this.topbar);
      this.bindTopBarEvents();
      this.updateHistoryButtons();
    }

    bindTopBarEvents() {
      // Done button
      document.getElementById("editor-done-btn").addEventListener("click", () => {
        this.exitCustomization();
      });

      // Undo & Redo
      document.getElementById("editor-undo-btn").addEventListener("click", () => this.handleUndo());
      document.getElementById("editor-redo-btn").addEventListener("click", () => this.handleRedo());

      // Presets
      this.topbar.querySelectorAll("[data-preset]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-preset");
          this.applyPreset(key);
        });
      });

      // Surprise Me
      document.getElementById("editor-surprise-btn").addEventListener("click", () => {
        this.surpriseMe();
      });

      // Add Widget
      this.topbar.querySelectorAll("[data-add]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const type = btn.getAttribute("data-add");
          this.addDecoration(type);
        });
      });

      // Responsive Preview
      this.topbar.querySelectorAll("[data-preview]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const mode = btn.getAttribute("data-preview");
          this.setPreviewMode(mode);
        });
      });

      // Grid snap checkbox
      const gridSnapCb = document.getElementById("editor-grid-snap-cb");
      if (gridSnapCb) {
        gridSnapCb.addEventListener("change", (e) => {
          this.state.global.gridSnap = e.target.checked;
          if (this.dragDrop) this.dragDrop.setGridSnap(e.target.checked);
          this.commitChange("Toggle grid snap");
        });
      }

      // Export
      document.getElementById("editor-export-btn").addEventListener("click", () => {
        Storage.downloadJSON(this.state);
        this.showToast("Layout exported as JSON", "success");
      });

      // Import
      document.getElementById("editor-import-btn").addEventListener("click", () => {
        this.openImportModal();
      });

      // Reset All
      document.getElementById("editor-reset-all-btn").addEventListener("click", () => {
        this.confirmResetEverything();
      });
    }

    // =========================================================================
    // Hidden Elements Bar
    // =========================================================================
    renderHiddenBar() {
      if (this.hiddenBar) this.hiddenBar.remove();

      const hiddenList = this.state.hiddenElements || [];
      if (hiddenList.length === 0) return;

      this.hiddenBar = document.createElement("div");
      this.hiddenBar.id = "editor-hidden-bar";
      this.hiddenBar.className = "editor-hidden-bar";

      let itemsHtml = "";
      hiddenList.forEach((id) => {
        const friendlyName = this.getFriendlyName(id);
        itemsHtml += `<button type="button" class="hidden-item-pill" data-unhide-id="${id}" title="Click to restore">👁️ Unhide ${this.escape(friendlyName)}</button>`;
      });

      this.hiddenBar.innerHTML = `
        <span style="font-weight: 600; font-size: 0.78rem;">Hidden items:</span>
        ${itemsHtml}
      `;

      this.hiddenBar.querySelectorAll("[data-unhide-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-unhide-id");
          this.unhideElement(id);
        });
      });

      document.body.appendChild(this.hiddenBar);
    }

    // =========================================================================
    // Contextual Inspector (Properties Panel)
    // =========================================================================
    renderInspector() {
      if (this.inspector) this.inspector.remove();

      this.inspector = document.createElement("div");
      this.inspector.id = "editor-inspector";
      this.inspector.className = "editor-inspector";
      this.inspector.style.display = "none"; // hidden until element is selected

      this.inspector.innerHTML = `
        <div class="inspector-header">
          <span id="inspector-title" class="inspector-title">Element Inspector</span>
          <button type="button" id="inspector-close-btn" class="inspector-close-btn" title="Deselect element">✕</button>
        </div>

        <div class="inspector-body">
          <!-- Width / Dimensions -->
          <div class="inspector-row">
            <label>Width:</label>
            <div class="inspector-input-group">
              <input type="range" id="insp-width-slider" min="40" max="100" value="100" step="5">
              <span id="insp-width-val" class="inspector-val">100%</span>
            </div>
          </div>

          <!-- Font Size -->
          <div class="inspector-row">
            <label>Font Size:</label>
            <select id="insp-font-size" class="inspector-select">
              <option value="">Default</option>
              <option value="0.85rem">Small (0.85rem)</option>
              <option value="1rem">Normal (1rem)</option>
              <option value="1.15rem">Medium (1.15rem)</option>
              <option value="1.35rem">Large (1.35rem)</option>
            </select>
          </div>

          <!-- Text Align -->
          <div class="inspector-row">
            <label>Align:</label>
            <div class="inspector-btn-group">
              <button type="button" class="insp-btn" data-align="left" title="Left">⇤</button>
              <button type="button" class="insp-btn" data-align="center" title="Center">⇋</button>
              <button type="button" class="insp-btn" data-align="right" title="Right">⇥</button>
            </div>
          </div>

          <!-- Colors -->
          <div class="inspector-row">
            <label>Text Color:</label>
            <div style="display:flex; gap:6px; align-items:center;">
              <input type="color" id="insp-color" value="#222222" class="inspector-color-picker">
              <button type="button" id="insp-color-reset" class="insp-subtle-btn">Default</button>
            </div>
          </div>

          <div class="inspector-row">
            <label>Background:</label>
            <div style="display:flex; gap:6px; align-items:center;">
              <input type="color" id="insp-bg-color" value="#ffffff" class="inspector-color-picker">
              <button type="button" id="insp-bg-reset" class="insp-subtle-btn">Transparent</button>
            </div>
          </div>

          <!-- Border Style & Radius -->
          <div class="inspector-row">
            <label>Border:</label>
            <select id="insp-border-style" class="inspector-select">
              <option value="none">None</option>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>

          <div class="inspector-row">
            <label>Radius:</label>
            <div class="inspector-input-group">
              <input type="range" id="insp-radius-slider" min="0" max="24" value="0" step="2">
              <span id="insp-radius-val" class="inspector-val">0px</span>
            </div>
          </div>

          <!-- Padding -->
          <div class="inspector-row">
            <label>Padding:</label>
            <div class="inspector-input-group">
              <input type="range" id="insp-padding-slider" min="0" max="32" value="0" step="4">
              <span id="insp-padding-val" class="inspector-val">0px</span>
            </div>
          </div>

          <!-- Positioning Mode -->
          <div class="inspector-row">
            <label>Position:</label>
            <select id="insp-position-mode" class="inspector-select">
              <option value="flow">Document Flow (Snap)</option>
              <option value="free">Free Positioning</option>
            </select>
          </div>

          <hr style="margin: 10px 0; border: 0; border-top: 1px solid var(--border);">

          <!-- Actions -->
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button type="button" id="insp-hide-btn" class="insp-action-btn">👁️ Hide Section</button>
            <button type="button" id="insp-reset-btn" class="insp-action-btn">↺ Reset Styles</button>
            <button type="button" id="insp-delete-btn" class="insp-action-btn insp-danger-btn" style="display:none;">🗑️ Delete</button>
          </div>
        </div>
      `;

      document.body.appendChild(this.inspector);
      this.bindInspectorEvents();
    }

    bindInspectorEvents() {
      document.getElementById("inspector-close-btn").addEventListener("click", () => {
        this.deselectElement();
      });

      // Width Slider
      const widthSlider = document.getElementById("insp-width-slider");
      const widthVal = document.getElementById("insp-width-val");
      widthSlider.addEventListener("input", (e) => {
        const val = `${e.target.value}%`;
        widthVal.textContent = val;
        this.updateCurrentElementStyle("width", val);
      });
      widthSlider.addEventListener("change", () => this.commitChange("Change width"));

      // Font size
      document.getElementById("insp-font-size").addEventListener("change", (e) => {
        this.updateCurrentElementStyle("fontSize", e.target.value);
        this.commitChange("Change font size");
      });

      // Text align
      this.inspector.querySelectorAll("[data-align]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const align = btn.getAttribute("data-align");
          this.updateCurrentElementStyle("textAlign", align);
          this.commitChange("Change alignment");
        });
      });

      // Colors
      document.getElementById("insp-color").addEventListener("input", (e) => {
        this.updateCurrentElementStyle("color", e.target.value);
      });
      document.getElementById("insp-color").addEventListener("change", () => this.commitChange("Change text color"));

      document.getElementById("insp-color-reset").addEventListener("click", () => {
        this.updateCurrentElementStyle("color", "");
        this.commitChange("Reset text color");
      });

      document.getElementById("insp-bg-color").addEventListener("input", (e) => {
        this.updateCurrentElementStyle("backgroundColor", e.target.value);
      });
      document.getElementById("insp-bg-color").addEventListener("change", () => this.commitChange("Change background color"));

      document.getElementById("insp-bg-reset").addEventListener("click", () => {
        this.updateCurrentElementStyle("backgroundColor", "");
        this.commitChange("Reset background color");
      });

      // Border style
      document.getElementById("insp-border-style").addEventListener("change", (e) => {
        const style = e.target.value;
        if (style === "none") {
          this.updateCurrentElementStyle("borderStyle", "none");
          this.updateCurrentElementStyle("borderWidth", "");
        } else {
          this.updateCurrentElementStyle("borderStyle", style);
          this.updateCurrentElementStyle("borderWidth", "1px");
          this.updateCurrentElementStyle("borderColor", "var(--border)");
        }
        this.commitChange("Change border style");
      });

      // Radius
      const radiusSlider = document.getElementById("insp-radius-slider");
      const radiusVal = document.getElementById("insp-radius-val");
      radiusSlider.addEventListener("input", (e) => {
        const val = `${e.target.value}px`;
        radiusVal.textContent = val;
        this.updateCurrentElementStyle("borderRadius", val);
      });
      radiusSlider.addEventListener("change", () => this.commitChange("Change border radius"));

      // Padding
      const padSlider = document.getElementById("insp-padding-slider");
      const padVal = document.getElementById("insp-padding-val");
      padSlider.addEventListener("input", (e) => {
        const val = `${e.target.value}px`;
        padVal.textContent = val;
        this.updateCurrentElementStyle("padding", val);
      });
      padSlider.addEventListener("change", () => this.commitChange("Change padding"));

      // Position Mode (flow vs free)
      document.getElementById("insp-position-mode").addEventListener("change", (e) => {
        const mode = e.target.value;
        this.setElementPositionMode(mode);
      });

      // Hide button
      document.getElementById("insp-hide-btn").addEventListener("click", () => {
        if (this.selectedCustomId) {
          this.hideElement(this.selectedCustomId);
        }
      });

      // Reset styles
      document.getElementById("insp-reset-btn").addEventListener("click", () => {
        if (this.selectedCustomId) {
          this.resetElementStyles(this.selectedCustomId);
        }
      });

      // Delete (for decorations)
      document.getElementById("insp-delete-btn").addEventListener("click", () => {
        if (this.selectedCustomId && this.selectedCustomId.startsWith("dec-")) {
          this.deleteDecoration(this.selectedCustomId);
        }
      });
    }

    // =========================================================================
    // Element Selection & Handles
    // =========================================================================
    attachElementInspectListeners() {
      // Add handles and click events to customizable elements
      document.querySelectorAll("[data-custom-id]").forEach((el) => {
        this.setupElementHandles(el);
      });
    }

    detachElementInspectListeners() {
      document.querySelectorAll(".editor-drag-handle, .editor-resize-handle").forEach((h) => h.remove());
      document.querySelectorAll(".editor-selected").forEach((el) => el.classList.remove("editor-selected"));
    }

    setupElementHandles(el) {
      if (el.querySelector(".editor-drag-handle")) return;

      const customId = el.getAttribute("data-custom-id");
      const isProject = el.classList.contains("project-item");
      const isDecoration = el.classList.contains("user-decoration");
      const isSection = el.tagName === "SECTION";

      // Inject Drag Handle
      const dragHandle = document.createElement("div");
      dragHandle.className = "editor-drag-handle";
      dragHandle.title = "Drag to reorder or move";
      dragHandle.innerHTML = `<span>⠿</span>`;

      dragHandle.addEventListener("pointerdown", (e) => {
        const elemData = this.state.elements[customId] || {};
        const isFree = elemData.positionMode === "free";
        const type = isProject ? "project" : isDecoration ? "decoration" : "section";

        this.selectElement(el);
        this.dragDrop.startDrag(e, el, { isFreeMode: isFree, type });
      });

      el.insertBefore(dragHandle, el.firstChild);

      // Click on element to select
      el.addEventListener("click", (e) => {
        if (!this.isActive) return;
        // Don't intercept normal interactions if clicking links or forms directly unless modifier
        if (e.target.tagName === "A" || e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") {
          return;
        }
        e.stopPropagation();
        this.selectElement(el);
      });
    }

    selectElement(el) {
      if (this.selectedElement === el) return;

      this.deselectElement();

      this.selectedElement = el;
      this.selectedCustomId = el.getAttribute("data-custom-id") || el.id;
      el.classList.add("editor-selected");

      // Attach resize handles to selected element
      this.attachResizeHandles(el);

      // Show and populate inspector
      if (this.inspector) {
        this.inspector.style.display = "block";
        this.updateInspectorValues();
      }
    }

    deselectElement() {
      if (this.selectedElement) {
        this.selectedElement.classList.remove("editor-selected");
        this.removeResizeHandles(this.selectedElement);
      }
      this.selectedElement = null;
      this.selectedCustomId = null;

      if (this.inspector) {
        this.inspector.style.display = "none";
      }
    }

    attachResizeHandles(el) {
      this.removeResizeHandles(el);

      const handleE = document.createElement("div");
      handleE.className = "editor-resize-handle resize-handle-e";
      handleE.title = "Resize width";

      const handleS = document.createElement("div");
      handleS.className = "editor-resize-handle resize-handle-s";
      handleS.title = "Resize height";

      const handleSE = document.createElement("div");
      handleSE.className = "editor-resize-handle resize-handle-se";
      handleSE.title = "Resize both";

      handleE.addEventListener("pointerdown", (e) => this.resizeEngine.startResize(e, el, "e"));
      handleS.addEventListener("pointerdown", (e) => this.resizeEngine.startResize(e, el, "s"));
      handleSE.addEventListener("pointerdown", (e) => this.resizeEngine.startResize(e, el, "se"));

      el.appendChild(handleE);
      el.appendChild(handleS);
      el.appendChild(handleSE);
    }

    removeResizeHandles(el) {
      if (!el) return;
      el.querySelectorAll(".editor-resize-handle").forEach((h) => h.remove());
    }

    updateInspectorValues() {
      if (!this.selectedElement || !this.selectedCustomId) return;

      const titleEl = document.getElementById("inspector-title");
      if (titleEl) {
        titleEl.textContent = this.getFriendlyName(this.selectedCustomId);
      }

      const elemData = this.state.elements[this.selectedCustomId] || { style: {} };
      const st = elemData.style || {};

      // Width
      const widthVal = st.width ? parseInt(st.width, 10) : 100;
      const widthSlider = document.getElementById("insp-width-slider");
      if (widthSlider) {
        widthSlider.value = isNaN(widthVal) ? 100 : widthVal;
        document.getElementById("insp-width-val").textContent = `${widthSlider.value}%`;
      }

      // Font size
      const fontSelect = document.getElementById("insp-font-size");
      if (fontSelect) fontSelect.value = st.fontSize || "";

      // Border style
      const borderSelect = document.getElementById("insp-border-style");
      if (borderSelect) borderSelect.value = st.borderStyle || "none";

      // Radius
      const radSlider = document.getElementById("insp-radius-slider");
      if (radSlider) {
        const rad = st.borderRadius ? parseInt(st.borderRadius, 10) : 0;
        radSlider.value = rad;
        document.getElementById("insp-radius-val").textContent = `${rad}px`;
      }

      // Padding
      const padSlider = document.getElementById("insp-padding-slider");
      if (padSlider) {
        const pad = st.padding ? parseInt(st.padding, 10) : 0;
        padSlider.value = pad;
        document.getElementById("insp-padding-val").textContent = `${pad}px`;
      }

      // Position mode
      const posSelect = document.getElementById("insp-position-mode");
      if (posSelect) posSelect.value = elemData.positionMode || "flow";

      // Delete button toggle for decorations
      const delBtn = document.getElementById("insp-delete-btn");
      if (delBtn) {
        delBtn.style.display = this.selectedCustomId.startsWith("dec-") ? "inline-block" : "none";
      }
    }

    updateCurrentElementStyle(prop, val) {
      if (!this.selectedElement || !this.selectedCustomId) return;

      if (!this.state.elements[this.selectedCustomId]) {
        this.state.elements[this.selectedCustomId] = { style: {} };
      }
      if (!this.state.elements[this.selectedCustomId].style) {
        this.state.elements[this.selectedCustomId].style = {};
      }

      if (val === "" || val === null) {
        delete this.state.elements[this.selectedCustomId].style[prop];
        this.selectedElement.style[prop] = "";
      } else {
        this.state.elements[this.selectedCustomId].style[prop] = val;
        this.selectedElement.style[prop] = val;
      }
    }

    setElementPositionMode(mode) {
      if (!this.selectedElement || !this.selectedCustomId) return;

      if (!this.state.elements[this.selectedCustomId]) {
        this.state.elements[this.selectedCustomId] = { style: {} };
      }
      this.state.elements[this.selectedCustomId].positionMode = mode;

      if (mode === "flow") {
        this.selectedElement.style.position = "static";
        this.selectedElement.style.left = "";
        this.selectedElement.style.top = "";
        delete this.state.elements[this.selectedCustomId].style.position;
        delete this.state.elements[this.selectedCustomId].style.left;
        delete this.state.elements[this.selectedCustomId].style.top;
      } else {
        this.selectedElement.style.position = "relative";
        this.state.elements[this.selectedCustomId].style.position = "relative";
      }

      this.commitChange(`Set position mode to ${mode}`);
    }

    // =========================================================================
    // Section & Item Reordering Handlers
    // =========================================================================
    handleDOMReorder(data) {
      if (!data || !data.customId || !data.targetId) return;

      if (data.type === "section") {
        const fromName = data.customId.replace("section-", "");
        const toName = data.targetId.replace("section-", "");

        const order = [...this.state.sectionOrder];
        const fromIdx = order.indexOf(fromName);
        const toIdx = order.indexOf(toName);

        if (fromIdx !== -1 && toIdx !== -1) {
          order.splice(fromIdx, 1);
          const insertIdx = data.position === "before" ? order.indexOf(toName) : order.indexOf(toName) + 1;
          order.splice(insertIdx, 0, fromName);
          this.state.sectionOrder = order;
          this.ensureFooterAtBottom();
          this.commitChange(`Moved ${fromName} section ${data.position} ${toName}`);
        }
      } else if (data.type === "project") {
        const order = [...this.state.projectOrder];
        const fromIdx = order.indexOf(data.customId);
        const toIdx = order.indexOf(data.targetId);

        if (fromIdx !== -1 && toIdx !== -1) {
          order.splice(fromIdx, 1);
          const insertIdx = data.position === "before" ? order.indexOf(data.targetId) : order.indexOf(data.targetId) + 1;
          order.splice(insertIdx, 0, data.customId);
          this.state.projectOrder = order;
          this.commitChange(`Reordered project ${data.customId}`);
        }
      }
    }

    ensureFooterAtBottom() {
      if (!this.container) return;
      const footer = this.container.querySelector("footer");
      if (footer && footer.parentNode === this.container) {
        this.container.appendChild(footer);
      }
    }

    handleFreeMove(data) {
      if (!data.customId) return;
      if (!this.state.elements[data.customId]) {
        this.state.elements[data.customId] = { style: {} };
      }
      this.state.elements[data.customId].style.position = "relative";
      this.state.elements[data.customId].style.left = data.left;
      this.state.elements[data.customId].style.top = data.top;
    }

    handleDragEnd(data) {
      if (data.isFreeMode) {
        this.commitChange("Free-position move");
      }
    }

    handleResizeMove(data) {
      if (!data.customId) return;
      if (!this.state.elements[data.customId]) {
        this.state.elements[data.customId] = { style: {} };
      }
      this.state.elements[data.customId].style.width = data.width;
      this.state.elements[data.customId].style.minHeight = data.height;
    }

    handleResizeEnd(_data) {
      this.commitChange("Resize element");
    }

    // =========================================================================
    // Widget / Decoration Management
    // =========================================================================
    addDecoration(type) {
      const id = `dec-${type}-${Date.now().toString(36)}`;
      let defaultContent = "Custom Note";
      if (type === "badge") defaultContent = "⭐ New Highlight";
      if (type === "emoji") defaultContent = "🚀";
      if (type === "divider") defaultContent = "";

      const newDec = {
        id,
        type,
        content: defaultContent,
        style: {
          margin: "12px 0",
        },
        positionMode: "flow",
      };

      if (!this.state.decorations) this.state.decorations = [];
      this.state.decorations.push(newDec);

      this.renderDecorations(this.state.decorations);
      this.attachElementInspectListeners();

      const newEl = document.querySelector(`[data-custom-id="${id}"]`);
      if (newEl) {
        this.selectElement(newEl);
      }

      this.commitChange(`Added ${type} widget`);
      this.showToast(`Added ${type} widget! Click to customize or drag.`, "info");
    }

    deleteDecoration(id) {
      if (!this.state.decorations) return;
      this.state.decorations = this.state.decorations.filter((d) => d.id !== id);

      const el = document.querySelector(`[data-custom-id="${id}"]`);
      if (el) el.remove();

      this.deselectElement();
      this.commitChange("Delete widget");
      this.showToast("Widget removed", "info");
    }

    // =========================================================================
    // Hide / Unhide Elements
    // =========================================================================
    hideElement(customId) {
      if (!this.state.hiddenElements) this.state.hiddenElements = [];
      if (!this.state.hiddenElements.includes(customId)) {
        this.state.hiddenElements.push(customId);
      }

      const el = document.querySelector(`[data-custom-id="${customId}"]`);
      if (el) el.style.display = "none";

      this.deselectElement();
      this.renderHiddenBar();
      this.commitChange(`Hidden ${this.getFriendlyName(customId)}`);
      this.showToast(`Hidden ${this.getFriendlyName(customId)}. Restore anytime from top bar.`, "info");
    }

    unhideElement(customId) {
      if (!this.state.hiddenElements) return;
      this.state.hiddenElements = this.state.hiddenElements.filter((id) => id !== customId);

      const el = document.querySelector(`[data-custom-id="${customId}"]`);
      if (el) {
        el.style.display = "";
        this.selectElement(el);
      }

      this.renderHiddenBar();
      this.commitChange(`Unhide ${this.getFriendlyName(customId)}`);
    }

    resetElementStyles(customId) {
      if (this.state.elements && this.state.elements[customId]) {
        delete this.state.elements[customId];
      }

      const el = document.querySelector(`[data-custom-id="${customId}"]`);
      if (el) {
        el.removeAttribute("style");
      }

      this.updateInspectorValues();
      this.commitChange(`Reset styles on ${this.getFriendlyName(customId)}`);
      this.showToast("Element styles reset to default", "info");
    }

    // =========================================================================
    // Presets & Surprise Me
    // =========================================================================
    applyPreset(name) {
      const preset = Presets.PRESETS[name];
      if (!preset) return;

      const defaultState = Storage.createDefaultState();
      this.state = preset.apply(defaultState);

      this.applyStateToDOM(this.state, false);
      this.attachElementInspectListeners();
      this.commitChange(`Applied ${preset.name} preset`);
      this.showToast(`Applied preset: ${preset.name}`, "success");
    }

    surpriseMe() {
      const defaultState = Storage.createDefaultState();
      this.state = Presets.randomize(this.state, defaultState);

      this.applyStateToDOM(this.state, false);
      this.attachElementInspectListeners();
      this.commitChange("Surprise Me randomization");
      this.showToast("🎲 Generated surprise layout! (Press Ctrl+Z to undo)", "info");
    }

    // =========================================================================
    // Responsive Device Preview
    // =========================================================================
    setPreviewMode(mode) {
      this.previewMode = mode;
      document.body.setAttribute("data-preview-mode", mode);

      if (this.topbar) {
        this.topbar.querySelectorAll(".editor-preview-btn").forEach((btn) => {
          btn.classList.toggle("active", btn.getAttribute("data-preview") === mode);
        });
      }

      if (mode === "tablet") {
        this.container.style.maxWidth = "768px";
        this.showToast("Previewing Tablet View (768px)", "info");
      } else if (mode === "mobile") {
        this.container.style.maxWidth = "375px";
        this.showToast("Previewing Mobile View (375px)", "info");
      } else {
        this.container.style.maxWidth = this.state.global.containerWidth || "680px";
      }
    }

    // =========================================================================
    // History & Undo / Redo
    // =========================================================================
    commitChange(description = "") {
      this.history.push(this.state, description);
      Storage.saveState(this.state);
    }

    handleUndo() {
      const prevState = this.history.undo(this.state);
      if (prevState) {
        this.state = prevState;
        this.applyStateToDOM(this.state, false);
        this.attachElementInspectListeners();
        Storage.saveState(this.state);
        this.showToast("Undone last change", "info");
      }
    }

    handleRedo() {
      const nextState = this.history.redo(this.state);
      if (nextState) {
        this.state = nextState;
        this.applyStateToDOM(this.state, false);
        this.attachElementInspectListeners();
        Storage.saveState(this.state);
        this.showToast("Redone change", "info");
      }
    }

    updateHistoryButtons(info) {
      const undoBtn = document.getElementById("editor-undo-btn");
      const redoBtn = document.getElementById("editor-redo-btn");

      const canUndo = info ? info.canUndo : this.history.canUndo();
      const canRedo = info ? info.canRedo : this.history.canRedo();

      if (undoBtn) undoBtn.disabled = !canUndo;
      if (redoBtn) redoBtn.disabled = !canRedo;
    }

    // =========================================================================
    // Reset & Import Modals
    // =========================================================================
    confirmResetEverything() {
      if (confirm("Reset everything to original default portfolio? All custom positioning, colors, and widgets will be cleared.")) {
        Storage.clearState();
        this.state = Storage.createDefaultState();
        this.applyStateToDOM(this.state, false);
        this.attachElementInspectListeners();
        this.history.clear();
        this.history.push(this.state, "Reset to default");
        this.deselectElement();
        this.showToast("Portfolio restored to pristine default state", "success");
      }
    }

    openImportModal() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const res = Storage.parseAndValidateJSON(event.target.result);
          if (res.success) {
            this.state = res.state;
            this.applyStateToDOM(this.state, false);
            this.attachElementInspectListeners();
            this.commitChange("Imported layout JSON");
            this.showToast("Layout imported successfully!", "success");
          } else {
            alert(`Failed to import layout: ${res.error}`);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }

    // =========================================================================
    // Keyboard Shortcuts
    // =========================================================================
    setupKeyboardShortcuts() {
      document.addEventListener("keydown", (e) => {
        if (!this.isActive) return;

        const activeEl = document.activeElement;
        const isTyping =
          activeEl &&
          (activeEl.tagName === "INPUT" ||
            activeEl.tagName === "TEXTAREA" ||
            activeEl.isContentEditable);

        // Undo: Ctrl+Z / Cmd+Z
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
          if (!isTyping) {
            e.preventDefault();
            this.handleUndo();
          }
        }

        // Redo: Ctrl+Shift+Z or Ctrl+Y
        if (
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z") ||
          ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y")
        ) {
          if (!isTyping) {
            e.preventDefault();
            this.handleRedo();
          }
        }

        // Escape closes inspector or exits editor
        if (e.key === "Escape") {
          if (this.selectedElement) {
            this.deselectElement();
          } else {
            this.exitCustomization();
          }
        }

        // Delete / Backspace removes selected decoration
        if ((e.key === "Delete" || e.key === "Backspace") && !isTyping) {
          if (this.selectedCustomId && this.selectedCustomId.startsWith("dec-")) {
            e.preventDefault();
            this.deleteDecoration(this.selectedCustomId);
          }
        }
      });
    }

    // Helper: Friendly name for inspector title
    getFriendlyName(id) {
      if (!id) return "Element";
      if (id.startsWith("section-")) {
        const name = id.replace("section-", "");
        return `${name.charAt(0).toUpperCase() + name.slice(1)} Section`;
      }
      if (id === "header-intro") return "Header & Intro";
      if (id.startsWith("project-")) {
        const p = document.getElementById(id);
        const title = p ? p.querySelector("h3") : null;
        return title ? title.textContent.split("—")[0].trim() : "Project Card";
      }
      if (id.startsWith("dec-note")) return "Sticky Note";
      if (id.startsWith("dec-badge")) return "Custom Badge";
      if (id.startsWith("dec-emoji")) return "Floating Emoji";
      if (id.startsWith("dec-divider")) return "Divider";
      return id;
    }

    escape(str) {
      if (str === null || str === undefined) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    showToast(msg, type = "info") {
      // Re-use portfolio's toast if available
      const container = document.getElementById("toast-container");
      if (!container) return;

      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `<span>${type === "success" ? "✓" : "ℹ"}</span> <span>${this.escape(msg)}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(20px)";
        toast.style.transition = "all 0.2s ease";
        setTimeout(() => toast.remove(), 200);
      }, 3500);
    }
  }

  // Initialize and attach to window
  window.PortfolioEditor.Controller = new PortfolioEditorController();

  document.addEventListener("DOMContentLoaded", () => {
    window.PortfolioEditor.Controller.init();
  });
})();
