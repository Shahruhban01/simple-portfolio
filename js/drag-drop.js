/**
 * drag-drop.js - Unified Pointer-Events Drag & Drop Engine
 * Supports normal document-flow reordering with drop indicators
 * and bounded free-positioning with optional grid snapping.
 */

window.PortfolioEditor = window.PortfolioEditor || {};

(function () {
  class DragDropEngine {
    constructor(options = {}) {
      this.container = options.container || document.querySelector("main.container");
      this.onReorder = options.onReorder || (() => {});
      this.onFreeMove = options.onFreeMove || (() => {});
      this.onDragEnd = options.onDragEnd || (() => {});

      this.activeDrag = null;
      this.placeholder = null;
      this.gridSnap = false;
      this.gridSize = 16;

      this.boundPointerMove = this.handlePointerMove.bind(this);
      this.boundPointerUp = this.handlePointerUp.bind(this);
      this.boundPointerCancel = this.handlePointerCancel.bind(this);
    }

    setGridSnap(enabled, size = 16) {
      this.gridSnap = !!enabled;
      this.gridSize = size || 16;
    }

    /**
     * Initializes drag on a handle
     */
    startDrag(e, targetElement, options = {}) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      e.stopPropagation();

      const isFreeMode = options.isFreeMode || false;
      const type = options.type || "section"; // 'section', 'project', 'decoration'
      const customId = targetElement.getAttribute("data-custom-id") || targetElement.id;

      const rect = targetElement.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();

      this.activeDrag = {
        pointerId: e.pointerId,
        element: targetElement,
        customId,
        type,
        isFreeMode,
        startX: e.clientX,
        startY: e.clientY,
        elemStartX: rect.left - containerRect.left,
        elemStartY: rect.top - containerRect.top,
        origWidth: rect.width,
        origHeight: rect.height,
        hasMoved: false,
        dropTarget: null,
        dropPosition: null, // 'before' | 'after'
      };

      // Create placeholder for flow reordering
      if (!isFreeMode) {
        this.placeholder = document.createElement("div");
        this.placeholder.className = "editor-drop-placeholder";
        this.placeholder.style.height = `${Math.min(rect.height, 80)}px`;
        targetElement.classList.add("is-dragging");
      } else {
        targetElement.classList.add("is-free-dragging");
      }

      try {
        e.target.setPointerCapture(e.pointerId);
      } catch (_e) {}

      window.addEventListener("pointermove", this.boundPointerMove, { passive: false });
      window.addEventListener("pointerup", this.boundPointerUp);
      window.addEventListener("pointercancel", this.boundPointerCancel);
    }

    handlePointerMove(e) {
      if (!this.activeDrag) return;
      if (e.pointerId !== this.activeDrag.pointerId) return;

      const deltaX = e.clientX - this.activeDrag.startX;
      const deltaY = e.clientY - this.activeDrag.startY;

      // Threshold check
      if (!this.activeDrag.hasMoved && Math.hypot(deltaX, deltaY) < 4) {
        return;
      }
      this.activeDrag.hasMoved = true;

      if (this.activeDrag.isFreeMode) {
        this.handleFreeMove(e, deltaX, deltaY);
      } else {
        this.handleFlowMove(e);
      }
    }

    handleFreeMove(_e, deltaX, deltaY) {
      let nextX = this.activeDrag.elemStartX + deltaX;
      let nextY = this.activeDrag.elemStartY + deltaY;

      if (this.gridSnap) {
        nextX = Math.round(nextX / this.gridSize) * this.gridSize;
        nextY = Math.round(nextY / this.gridSize) * this.gridSize;
      }

      // Constrain inside container rect
      const containerWidth = this.container.clientWidth;
      const maxX = Math.max(0, containerWidth - this.activeDrag.origWidth);
      nextX = Math.max(0, Math.min(nextX, maxX));
      nextY = Math.max(0, nextY);

      this.activeDrag.element.style.position = "relative";
      this.activeDrag.element.style.left = `${nextX}px`;
      this.activeDrag.element.style.top = `${nextY}px`;

      this.onFreeMove({
        customId: this.activeDrag.customId,
        left: `${nextX}px`,
        top: `${nextY}px`,
      });
    }

    handleFlowMove(e) {
      const type = this.activeDrag.type;
      const draggedEl = this.activeDrag.element;

      // Find sibling elements of the same type
      let siblings = [];
      if (type === "section") {
        siblings = Array.from(this.container.querySelectorAll("section[data-custom-id]")).filter(
          (s) => s !== draggedEl && !s.classList.contains("is-dragging")
        );
      } else if (type === "project") {
        const list = document.getElementById("project-items-list");
        if (list) {
          siblings = Array.from(list.querySelectorAll(".project-item")).filter(
            (p) => p !== draggedEl && !p.classList.contains("is-dragging")
          );
        }
      }

      let closestTarget = null;
      let closestDistance = Infinity;
      let insertPosition = "before";

      siblings.forEach((sibling) => {
        const box = sibling.getBoundingClientRect();
        const midY = box.top + box.height / 2;
        const dist = Math.abs(e.clientY - midY);

        if (dist < closestDistance) {
          closestDistance = dist;
          closestTarget = sibling;
          insertPosition = e.clientY < midY ? "before" : "after";
        }
      });

      if (closestTarget && this.placeholder) {
        this.activeDrag.dropTarget = closestTarget;
        this.activeDrag.dropPosition = insertPosition;

        if (insertPosition === "before") {
          closestTarget.parentNode.insertBefore(this.placeholder, closestTarget);
        } else {
          closestTarget.parentNode.insertBefore(this.placeholder, closestTarget.nextSibling);
        }
      }
    }

    handlePointerUp(e) {
      if (!this.activeDrag || e.pointerId !== this.activeDrag.pointerId) return;

      const drag = this.activeDrag;
      this.cleanupPointerListeners();

      if (drag.isFreeMode) {
        drag.element.classList.remove("is-free-dragging");
        this.onDragEnd({
          customId: drag.customId,
          type: drag.type,
          isFreeMode: true,
          left: drag.element.style.left,
          top: drag.element.style.top,
        });
      } else {
        drag.element.classList.remove("is-dragging");

        // Commit reorder if placeholder was placed
        if (this.placeholder && this.placeholder.parentNode && drag.dropTarget) {
          const parent = this.placeholder.parentNode;
          parent.insertBefore(drag.element, this.placeholder);
          this.placeholder.remove();

          this.onReorder({
            customId: drag.customId,
            type: drag.type,
            targetId: drag.dropTarget.getAttribute("data-custom-id") || drag.dropTarget.id,
            position: drag.dropPosition,
          });
        } else if (this.placeholder) {
          this.placeholder.remove();
        }

        this.onDragEnd({
          customId: drag.customId,
          type: drag.type,
          isFreeMode: false,
        });
      }

      this.activeDrag = null;
      this.placeholder = null;
    }

    handlePointerCancel(e) {
      if (!this.activeDrag || e.pointerId !== this.activeDrag.pointerId) return;
      if (this.placeholder) this.placeholder.remove();
      this.activeDrag.element.classList.remove("is-dragging", "is-free-dragging");
      this.cleanupPointerListeners();
      this.activeDrag = null;
      this.placeholder = null;
    }

    cleanupPointerListeners() {
      window.removeEventListener("pointermove", this.boundPointerMove);
      window.removeEventListener("pointerup", this.boundPointerUp);
      window.removeEventListener("pointercancel", this.boundPointerCancel);
    }
  }

  window.PortfolioEditor.DragDrop = DragDropEngine;
})();
