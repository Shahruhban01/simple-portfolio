/**
 * history.js - Command and Snapshot History Manager (Undo / Redo)
 * Pure Vanilla JavaScript
 */

window.PortfolioEditor = window.PortfolioEditor || {};

(function () {
  class HistoryManager {
    constructor(maxSize = 35) {
      this.maxSize = maxSize;
      this.undoStack = [];
      this.redoStack = [];
      this.listeners = [];
      this.isPaused = false;
    }

    push(snapshot, description = "") {
      if (this.isPaused || !snapshot) return;

      // Deep copy to prevent outside mutations
      const cloned = JSON.parse(JSON.stringify(snapshot));

      // Avoid pushing identical consecutive states
      if (this.undoStack.length > 0) {
        const last = this.undoStack[this.undoStack.length - 1].state;
        if (JSON.stringify(last) === JSON.stringify(cloned)) {
          return;
        }
      }

      this.undoStack.push({ state: cloned, description, time: Date.now() });
      if (this.undoStack.length > this.maxSize) {
        this.undoStack.shift();
      }

      // Any new action clears the redo stack
      this.redoStack = [];
      this.notify();
    }

    undo(currentState) {
      if (!this.canUndo()) return null;

      // Push current state to redo stack
      if (currentState) {
        const clonedCurrent = JSON.parse(JSON.stringify(currentState));
        this.redoStack.push({ state: clonedCurrent, description: "Current state", time: Date.now() });
      }

      const entry = this.undoStack.pop();
      this.notify();
      return JSON.parse(JSON.stringify(entry.state));
    }

    redo(currentState) {
      if (!this.canRedo()) return null;

      if (currentState) {
        const clonedCurrent = JSON.parse(JSON.stringify(currentState));
        this.undoStack.push({ state: clonedCurrent, description: "Before redo", time: Date.now() });
      }

      const entry = this.redoStack.pop();
      this.notify();
      return JSON.parse(JSON.stringify(entry.state));
    }

    canUndo() {
      return this.undoStack.length > 0;
    }

    canRedo() {
      return this.redoStack.length > 0;
    }

    clear() {
      this.undoStack = [];
      this.redoStack = [];
      this.notify();
    }

    pause() {
      this.isPaused = true;
    }

    resume() {
      this.isPaused = false;
    }

    subscribe(fn) {
      if (typeof fn === "function") {
        this.listeners.push(fn);
      }
    }

    notify() {
      const info = {
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        undoCount: this.undoStack.length,
        redoCount: this.redoStack.length,
      };
      this.listeners.forEach((fn) => {
        try {
          fn(info);
        } catch (_e) {}
      });
    }
  }

  window.PortfolioEditor.History = HistoryManager;
})();
