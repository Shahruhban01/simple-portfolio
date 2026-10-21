/**
 * presets.js - Predefined Layouts & Surprise-Me Layout Generator
 * Pure Vanilla JavaScript
 */

window.PortfolioEditor = window.PortfolioEditor || {};

(function () {
  const PRESETS = {
    minimal: {
      name: "Minimal",
      description: "Original clean, restrained single-column layout with standard typography",
      apply: (defaultState) => {
        const state = JSON.parse(JSON.stringify(defaultState));
        state.sectionOrder = ["about", "skills", "projects", "experience", "education", "contact"];
        state.elements = {};
        state.decorations = [];
        state.hiddenElements = [];
        state.global.containerWidth = "680px";
        return state;
      },
    },

    developer: {
      name: "Developer",
      description: "Projects prioritized at top with dark-bordered cards and a live status badge",
      apply: (defaultState) => {
        const state = JSON.parse(JSON.stringify(defaultState));
        // Put Projects and Skills right at top
        state.sectionOrder = ["projects", "skills", "experience", "about", "education", "contact"];
        state.elements = {
          "section-projects": {
            style: {
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--border)",
              borderRadius: "6px",
              padding: "16px",
              backgroundColor: "var(--bg-card)",
            },
          },
          "section-skills": {
            style: {
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--border)",
              borderRadius: "6px",
              padding: "16px",
              backgroundColor: "var(--bg-card)",
            },
          },
          "project-vaultx": {
            style: {
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--accent)",
              borderRadius: "4px",
              padding: "12px",
            },
          },
        };
        state.decorations = [
          {
            id: "dec-dev-badge",
            type: "badge",
            content: "⚡ Ready for High-Scale Backend Roles (Node.js / Go / AWS)",
            style: {
              backgroundColor: "var(--status-success-bg)",
              color: "var(--status-success-text)",
              borderColor: "var(--status-success-border)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderRadius: "4px",
              padding: "6px 12px",
              fontSize: "0.82rem",
              fontWeight: "600",
              margin: "0 0 16px 0",
            },
            positionMode: "flow",
          },
        ];
        return state;
      },
    },

    compact: {
      name: "Compact",
      description: "Condensed layout with tighter paddings, narrower margins, and space-efficient cards",
      apply: (defaultState) => {
        const state = JSON.parse(JSON.stringify(defaultState));
        state.sectionOrder = ["about", "skills", "projects", "experience", "education", "contact"];
        state.global.containerWidth = "600px";
        state.elements = {
          "section-about": { style: { padding: "8px 0", margin: "4px 0" } },
          "section-skills": { style: { padding: "8px 0", margin: "4px 0" } },
          "section-projects": { style: { padding: "8px 0", margin: "4px 0" } },
          "section-experience": { style: { padding: "8px 0", margin: "4px 0" } },
          "project-vaultx": { style: { padding: "8px", borderRadius: "4px", backgroundColor: "var(--bg-card)" } },
          "project-wows": { style: { padding: "8px", borderRadius: "4px", backgroundColor: "var(--bg-card)" } },
          "project-picloud": { style: { padding: "8px", borderRadius: "4px", backgroundColor: "var(--bg-card)" } },
          "project-queue": { style: { padding: "8px", borderRadius: "4px", backgroundColor: "var(--bg-card)" } },
        };
        return state;
      },
    },

    creative: {
      name: "Creative",
      description: "Card-based design with soft rounded corners, subtle accents, and welcoming notes",
      apply: (defaultState) => {
        const state = JSON.parse(JSON.stringify(defaultState));
        state.sectionOrder = ["about", "projects", "skills", "experience", "education", "contact"];
        state.global.containerWidth = "720px";
        state.elements = {
          "section-about": {
            style: {
              borderRadius: "12px",
              padding: "20px",
              backgroundColor: "var(--bg-card)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--border)",
            },
          },
          "section-projects": {
            style: {
              borderRadius: "12px",
              padding: "20px",
              backgroundColor: "var(--bg-card)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--border)",
            },
          },
          "project-vaultx": {
            style: {
              borderRadius: "8px",
              padding: "14px",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--border)",
              backgroundColor: "var(--bg)",
            },
          },
          "project-wows": {
            style: {
              borderRadius: "8px",
              padding: "14px",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--border)",
              backgroundColor: "var(--bg)",
            },
          },
        };
        state.decorations = [
          {
            id: "dec-creative-note",
            type: "note",
            content: "💡 Feel free to customize any section using the handles above!",
            style: {
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--accent)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "0.85rem",
              margin: "0 0 16px 0",
            },
            positionMode: "flow",
          },
        ];
        return state;
      },
    },

    terminal: {
      name: "Terminal-Inspired",
      description: "Monospace feel with high-contrast card outlines and terminal badge indicators",
      apply: (defaultState) => {
        const state = JSON.parse(JSON.stringify(defaultState));
        state.sectionOrder = ["skills", "projects", "experience", "about", "contact", "education"];
        state.global.containerWidth = "690px";
        state.elements = {
          "section-skills": {
            style: {
              borderWidth: "1px",
              borderStyle: "dashed",
              borderColor: "var(--accent)",
              padding: "16px",
              borderRadius: "4px",
              backgroundColor: "var(--bg-card)",
            },
          },
          "section-projects": {
            style: {
              borderWidth: "1px",
              borderStyle: "dashed",
              borderColor: "var(--border)",
              padding: "16px",
              borderRadius: "4px",
            },
          },
          "section-contact": {
            style: {
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--border)",
              padding: "16px",
              borderRadius: "4px",
              backgroundColor: "var(--bg-card)",
            },
          },
        };
        state.decorations = [
          {
            id: "dec-terminal-tag",
            type: "badge",
            content: "$ ruhban --status available --location sopore_jk",
            style: {
              backgroundColor: "var(--terminal-bg)",
              color: "var(--terminal-prompt)",
              borderColor: "var(--terminal-border)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderRadius: "3px",
              padding: "6px 12px",
              fontSize: "0.82rem",
              fontFamily: "ui-monospace, monospace",
              margin: "0 0 14px 0",
            },
            positionMode: "flow",
          },
        ];
        return state;
      },
    },
  };

  /**
   * Generates a sensible, non-destructive randomized layout
   */
  function randomize(currentState, defaultState) {
    const state = JSON.parse(JSON.stringify(defaultState));

    // 1. Sensible section reordering (permutations that make sense)
    const orderOptions = [
      ["projects", "skills", "about", "experience", "education", "contact"],
      ["about", "projects", "skills", "experience", "contact", "education"],
      ["skills", "projects", "experience", "about", "education", "contact"],
      ["projects", "experience", "skills", "about", "education", "contact"],
    ];
    const chosenOrder = orderOptions[Math.floor(Math.random() * orderOptions.length)];
    state.sectionOrder = chosenOrder;

    // 2. Harmonious container width variations
    const widths = ["640px", "680px", "720px"];
    state.global.containerWidth = widths[Math.floor(Math.random() * widths.length)];

    // 3. Sensible border-radius & border styling
    const radiusList = ["0px", "4px", "8px", "12px"];
    const chosenRadius = radiusList[Math.floor(Math.random() * radiusList.length)];

    const borderStyles = ["solid", "dashed"];
    const chosenStyle = borderStyles[Math.floor(Math.random() * borderStyles.length)];

    // Apply to featured sections
    state.elements = {
      "section-projects": {
        style: {
          borderRadius: chosenRadius,
          borderWidth: "1px",
          borderStyle: chosenStyle,
          borderColor: "var(--border)",
          padding: "16px",
          backgroundColor: "var(--bg-card)",
        },
      },
      "section-skills": {
        style: {
          borderRadius: chosenRadius,
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "var(--border)",
          padding: "14px",
        },
      },
      "project-vaultx": {
        style: {
          borderRadius: chosenRadius,
          padding: "12px",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "var(--border)",
        },
      },
    };

    // 4. Tasteful random badge
    const badgeOptions = [
      { text: "🚀 Distributed Backend Systems Architect", bg: "var(--bg-card)", color: "var(--text)" },
      { text: "⚡ High Concurrency & WebSocket Engineering", bg: "var(--status-success-bg)", color: "var(--status-success-text)" },
      { text: "🛠️ Open for Full-Time & Contract Engineering", bg: "var(--bg-card)", color: "var(--accent)" },
    ];
    const chosenBadge = badgeOptions[Math.floor(Math.random() * badgeOptions.length)];

    state.decorations = [
      {
        id: `dec-rand-${Date.now()}`,
        type: "badge",
        content: chosenBadge.text,
        style: {
          backgroundColor: chosenBadge.bg,
          color: chosenBadge.color,
          borderColor: "var(--border)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderRadius: chosenRadius,
          padding: "6px 12px",
          fontSize: "0.82rem",
          fontWeight: "500",
          margin: "0 0 16px 0",
        },
        positionMode: "flow",
      },
    ];

    return state;
  }

  window.PortfolioEditor.Presets = {
    PRESETS,
    randomize,
  };
})();
