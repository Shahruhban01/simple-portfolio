/**
 * resize.js - Interactive Resizing Engine for Selected Elements
 * Pure Vanilla JavaScript with Pointer Events
 */

window.PortfolioEditor = window.PortfolioEditor || {};

(function () {
  class ResizeEngine {
    constructor(options = {}) {
      this.container = options.container || document.querySelector("main.container");
      this.onResize = options.onResize || (() => {});
      this.onResizeEnd = options.onResizeEnd || (() => {});

      this.activeResize = null;
      this.boundPointerMove = this.handlePointerMove.bind(this);
      this.boundPointerUp = this.handlePointerUp.bind(this);
      this.boundPointerCancel = this.handlePointerCancel.bind(this);
    }

    startResize(e, targetElement, direction = "se") {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      e.stopPropagation();

      const rect = targetElement.getBoundingClientRect();
      const customId = targetElement.getAttribute("data-custom-id") || targetElement.id;

      this.activeResize = {
        pointerId: e.pointerId,
        element: targetElement,
        customId,
        direction,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        minWidth: 180,
        maxWidth: this.container ? this.container.clientWidth : 720,
        minHeight: 40,
        maxHeight: 1400,
      };

      try {
        e.target.setPointerCapture(e.pointerId);
      } catch (_e) {}

      window.addEventListener("pointermove", this.boundPointerMove, { passive: false });
      window.addEventListener("pointerup", this.boundPointerUp);
      window.addEventListener("pointercancel", this.boundPointerCancel);
    }

    handlePointerMove(e) {
      if (!this.activeResize || e.pointerId !== this.activeResize.pointerId) return;

      const res = this.activeResize;
      const deltaX = e.clientX - res.startX;
      const deltaY = e.clientY - res.startY;

      let newWidth = res.startWidth;
      let newHeight = res.startHeight;

      if (res.direction === "e" || res.direction === "se") {
        newWidth = Math.max(res.minWidth, Math.min(res.startWidth + deltaX, res.maxWidth));
        res.element.style.width = `${Math.round(newWidth)}px`;
      }

      if (res.direction === "s" || res.direction === "se") {
        newHeight = Math.max(res.minHeight, Math.min(res.startHeight + deltaY, res.maxHeight));
        res.element.style.minHeight = `${Math.round(newHeight)}px`;
      }

      this.onResize({
        customId: res.customId,
        width: `${Math.round(newWidth)}px`,
        height: `${Math.round(newHeight)}px`,
      });
    }

    handlePointerUp(e) {
      if (!this.activeResize || e.pointerId !== this.activeResize.pointerId) return;

      const res = this.activeResize;
      this.cleanup();

      this.onResizeEnd({
        customId: res.customId,
        width: res.element.style.width,
        height: res.element.style.minHeight || res.element.style.height,
      });

      this.activeResize = null;
    }

    handlePointerCancel(e) {
      if (!this.activeResize || e.pointerId !== this.activeResize.pointerId) return;
      this.cleanup();
      this.activeResize = null;
    }

    cleanup() {
      window.removeEventListener("pointermove", this.boundPointerMove);
      window.removeEventListener("pointerup", this.boundPointerUp);
      window.removeEventListener("pointercancel", this.boundPointerCancel);
    }
  }

  window.PortfolioEditor.Resize = ResizeEngine;
})();
