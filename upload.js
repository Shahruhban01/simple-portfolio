// Upload & Admin API Client for Ruhban Abdullah Portfolio
// Connects to local dev backend or production API

const API_BASE_URL = (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:" ||
  window.location.port !== ""
)
  ? "http://localhost:4000"
  : "https://api.developerruhban.online";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Helper: Format file sizes
function formatSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Helper: Format dates
function formatDate(dateStr) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateStr));
  } catch (_e) {
    return dateStr;
  }
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Disallowed file extensions to prevent active content execution and malicious binaries
const BLOCKED_FILE_EXTENSIONS = [
  ".html", ".htm", ".xhtml", ".svg", ".xml", ".js", ".mjs", ".ts",
  ".exe", ".bat", ".cmd", ".sh", ".bash", ".ps1", ".vbs", ".msi",
  ".dll", ".scr", ".jar", ".com", ".pif", ".application", ".gadget",
  ".php", ".phtml", ".py", ".rb", ".pl", ".cgi", ".asp", ".aspx"
];

function isSafeFile(file) {
  if (!file || !file.name) return true;
  const lowerName = file.name.toLowerCase();
  for (const ext of BLOCKED_FILE_EXTENSIONS) {
    if (lowerName.endsWith(ext) || lowerName.includes(ext + ".")) {
      return false;
    }
  }
  return true;
}

function isSafeHttpUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch (_e) {
    return false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // --- Theme support for Admin page ---
  const savedTheme = localStorage.getItem("portfolio_theme");
  if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  const themeBtn = document.getElementById("admin-theme-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("portfolio_theme", "light");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("portfolio_theme", "dark");
      }
    });
  }

  // --- Upload Form Elements ---
  const uploadForm = document.getElementById("upload-form");
  const uploadText = document.getElementById("upload-text");
  const uploadFile = document.getElementById("upload-file");
  const uploadBtn = document.getElementById("upload-submit-btn");
  const uploadStatus = document.getElementById("upload-status");
  const charCount = document.getElementById("char-count");
  const fileInfo = document.getElementById("file-info");

  // --- Admin Elements ---
  const adminLoginView = document.getElementById("admin-login-view");
  const adminDashboardView = document.getElementById("admin-dashboard-view");
  const adminLoginForm = document.getElementById("admin-login-form");
  const adminTokenInput = document.getElementById("admin-token-input");
  const adminLoginStatus = document.getElementById("admin-login-status");
  const adminAuthControls = document.getElementById("admin-auth-controls");
  const adminRefreshBtn = document.getElementById("admin-refresh-btn");
  const adminSignoutBtn = document.getElementById("admin-signout-btn");
  const adminContactsList = document.getElementById("admin-contacts-list");
  const adminUploadsList = document.getElementById("admin-uploads-list");
  const adminVisitorsList = document.getElementById("admin-visitors-list");
  const adminRecentVisitsList = document.getElementById("admin-recent-visits-list");

  // Character counter for upload form
  if (uploadText && charCount) {
    uploadText.addEventListener("input", () => {
      charCount.textContent = `${uploadText.value.length} / 10,000`;
    });
  }

  // File size and extension check on selection
  if (uploadFile && fileInfo) {
    uploadFile.addEventListener("change", () => {
      const file = uploadFile.files?.[0];
      if (file) {
        fileInfo.style.display = "block";
        fileInfo.textContent = `Selected: ${file.name} (${formatSize(file.size)})`;

        if (!isSafeFile(file)) {
          showStatus(uploadStatus, "Executable files and active web content (.html, .svg, .js, .exe, etc.) are strictly disallowed.", "error");
        } else if (file.size > MAX_FILE_SIZE) {
          showStatus(uploadStatus, "File exceeds the 10 MB limit.", "error");
        } else {
          hideStatus(uploadStatus);
        }
      } else {
        fileInfo.style.display = "none";
      }
    });
  }

  // Handle Upload Form Submit
  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = uploadText.value.trim();
      const file = uploadFile.files?.[0];

      if (!text && !file) {
        showStatus(uploadStatus, "Please provide a text note, attach a file, or both.", "error");
        return;
      }

      if (file && !isSafeFile(file)) {
        showStatus(uploadStatus, "Blocked file type: Active web content and executables are not permitted.", "error");
        return;
      }

      if (file && file.size > MAX_FILE_SIZE) {
        showStatus(uploadStatus, "Files must be smaller than 10 MB.", "error");
        return;
      }

      const formData = new FormData();
      if (text) formData.append("text", text);
      if (file) formData.append("file", file);

      uploadBtn.disabled = true;
      uploadBtn.textContent = "Uploading...";
      hideStatus(uploadStatus);

      try {
        const response = await fetch(`${API_BASE_URL}/api/uploads`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Upload failed (Status ${response.status})`);
        }

        showStatus(uploadStatus, "Content uploaded successfully!", "success");
        uploadText.value = "";
        uploadFile.value = "";
        if (charCount) charCount.textContent = "0 / 10,000";
        if (fileInfo) fileInfo.style.display = "none";

        if (getAdminToken()) {
          loadAdminData();
        }
      } catch (err) {
        showStatus(uploadStatus, err.message || "Failed to reach the upload API.", "error");
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload Content";
      }
    });
  }

  // --- Admin Token Management (Restricted to sessionStorage for session security) ---
  function getAdminToken() {
    return sessionStorage.getItem("adminToken") || "";
  }

  function setAdminToken(token) {
    if (token) {
      sessionStorage.setItem("adminToken", String(token).trim().slice(0, 256));
    } else {
      sessionStorage.removeItem("adminToken");
    }
    // Clean up any legacy localStorage entries for defense-in-depth
    try {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("admin_token");
    } catch (_e) {}
  }

  // --- Tab Management ---
  const tabButtons = document.querySelectorAll(".admin-tab-btn");
  const tabPanels = {
    analytics: document.getElementById("tab-analytics"),
    visitors: document.getElementById("tab-visitors"),
    contacts: document.getElementById("tab-contacts"),
    uploads: document.getElementById("tab-uploads"),
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");

      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      Object.keys(tabPanels).forEach((tabKey) => {
        if (tabPanels[tabKey]) {
          tabPanels[tabKey].style.display = tabKey === targetTab ? "block" : "none";
        }
      });
    });
  });

  // Initial check of admin auth state
  function syncAdminUI() {
    const token = getAdminToken();
    if (token) {
      adminLoginView.style.display = "none";
      adminDashboardView.style.display = "block";
      adminAuthControls.style.display = "flex";
      loadAdminData();
    } else {
      adminLoginView.style.display = "block";
      adminDashboardView.style.display = "none";
      adminAuthControls.style.display = "none";
    }
  }

  // Admin login handler
  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const token = adminTokenInput.value.trim();
      if (!token) return;

      setAdminToken(token);
      adminTokenInput.value = "";
      hideStatus(adminLoginStatus);
      syncAdminUI();
    });
  }

  // Admin sign out handler
  if (adminSignoutBtn) {
    adminSignoutBtn.addEventListener("click", () => {
      setAdminToken("");
      syncAdminUI();
    });
  }

  // Admin refresh handler
  if (adminRefreshBtn) {
    adminRefreshBtn.addEventListener("click", () => {
      loadAdminData();
    });
  }

  // Retention Purge button handler
  const purgeBtn = document.getElementById("purge-visits-btn");
  const retentionSelect = document.getElementById("retention-days");
  if (purgeBtn && retentionSelect) {
    purgeBtn.addEventListener("click", async () => {
      const days = Number(retentionSelect.value) || 90;
      if (!confirm(`Are you sure you want to permanently purge visit history older than ${days} days?`)) {
        return;
      }

      const token = getAdminToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/retention/purge`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ days }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to purge logs.");

        alert(`Purge complete: ${data.purgedCount} historical records deleted.`);
        loadAdminData();
      } catch (err) {
        alert("Purge failed: " + err.message);
      }
    });
  }

  // Load all admin modules
  function loadAdminData() {
    loadAdminAnalytics();
    loadAdminVisitors();
    loadAdminContacts();
    loadAdminUploads();
  }

  // =========================================================================
  // 1. Load Admin Analytics Overview
  // =========================================================================
  async function loadAdminAnalytics() {
    const token = getAdminToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`Analytics API returned status ${response.status}`);
      }

      const data = await response.json();
      renderAnalytics(data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
  }

  function renderAnalytics(data) {
    const m = data.metrics || {};

    const uniqueEl = document.getElementById("stat-unique-visitors");
    const totalEl = document.getElementById("stat-total-visits");
    const repeatRateEl = document.getElementById("stat-repeat-rate");
    const repeatCountEl = document.getElementById("stat-repeat-count");
    const visitsTodayEl = document.getElementById("stat-visits-today");
    const activeTodayEl = document.getElementById("stat-active-today");

    if (uniqueEl) uniqueEl.textContent = (m.totalUniqueVisitors || 0).toLocaleString();
    if (totalEl) totalEl.textContent = (m.totalVisits || 0).toLocaleString();
    if (repeatRateEl) repeatRateEl.textContent = m.repeatVisitorRate || "0%";
    if (repeatCountEl) repeatCountEl.textContent = `${(m.repeatVisitorsCount || 0).toLocaleString()} repeat visitors`;
    if (visitsTodayEl) visitsTodayEl.textContent = `${m.visitsToday || 0} visits today`;
    if (activeTodayEl) activeTodayEl.textContent = (m.visitorsToday || 0).toLocaleString();

    // Render Geographic breakdown
    const geoList = document.getElementById("geo-distribution-list");
    if (geoList) {
      if (!data.topCountries || data.topCountries.length === 0) {
        geoList.innerHTML = `<li class="meta">No geographic visits logged yet.</li>`;
      } else {
        geoList.innerHTML = data.topCountries
          .map(
            (c) => `
            <li class="breakdown-row">
              <span>🌐 ${escapeHtml(c.country)}</span>
              <span class="breakdown-count">${c.count.toLocaleString()} visits</span>
            </li>
          `
          )
          .join("");
      }
    }

    // Render Devices breakdown
    const devList = document.getElementById("device-distribution-list");
    if (devList) {
      if (!data.deviceStats || data.deviceStats.length === 0) {
        devList.innerHTML = `<li class="meta">No device data logged yet.</li>`;
      } else {
        devList.innerHTML = data.deviceStats
          .map((d) => {
            const icon = d.category === "mobile" ? "📱" : d.category === "tablet" ? "📟" : "💻";
            return `
            <li class="breakdown-row">
              <span>${icon} ${escapeHtml(d.category.toUpperCase())}</span>
              <span class="breakdown-count">${d.count.toLocaleString()}</span>
            </li>
          `;
          })
          .join("");
      }
    }

    // Render Top Sections viewed
    const secList = document.getElementById("sections-distribution-list");
    if (secList) {
      if (!data.topSections || data.topSections.length === 0) {
        secList.innerHTML = `<li class="meta">No section transitions recorded yet.</li>`;
      } else {
        secList.innerHTML = data.topSections
          .map(
            (s) => `
            <li class="breakdown-row">
              <span>📍 #${escapeHtml(s.section)}</span>
              <span class="breakdown-count">${s.count.toLocaleString()} views</span>
            </li>
          `
          )
          .join("");
      }
    }

    // Render Recent Visits stream
    if (adminRecentVisitsList) {
      if (!data.recentVisits || data.recentVisits.length === 0) {
        adminRecentVisitsList.innerHTML = `<p class="meta">No recent visits recorded.</p>`;
      } else {
        adminRecentVisitsList.innerHTML = data.recentVisits
          .map((v) => {
            const dev = v.device || {};
            const loc = v.location || {};
            return `
            <article class="visitor-record" style="margin-bottom: 8px; padding: 10px 12px;">
              <div class="visitor-top">
                <span><strong>Section: #${escapeHtml(v.section || "home")}</strong> &bull; ${formatDate(v.timestamp)}</span>
                <span class="badge-source ${loc.source === "precise_gps" ? "gps" : "ip"}">${escapeHtml(loc.source || "ip_estimated")}</span>
              </div>
              <div class="visitor-details" style="margin-bottom: 0;">
                <span>📍 ${escapeHtml(loc.city ? `${loc.city}, ${loc.country}` : loc.country || "Unknown")}</span>
                <span>💻 ${escapeHtml(dev.category || "desktop")} (${escapeHtml(dev.browser || "Unknown")})</span>
                ${v.referrer ? `<span>🔗 From: ${escapeHtml(v.referrer)}</span>` : ""}
              </div>
            </article>
          `;
          })
          .join("");
      }
    }
  }

  // =========================================================================
  // 2. Load Admin Visitors Directory & Retention Controls
  // =========================================================================
  async function loadAdminVisitors() {
    const token = getAdminToken();
    if (!token || !adminVisitorsList) return;

    adminVisitorsList.innerHTML = `<p class="meta">Loading visitor directory...</p>`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/visitors?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`Error fetching visitors (Status ${response.status})`);
      }

      const data = await response.json();
      renderVisitors(data.visitors || []);
    } catch (err) {
      adminVisitorsList.innerHTML = `<p class="meta" style="color: #991b1b;">Failed to load visitors: ${escapeHtml(err.message)}</p>`;
    }
  }

  function renderVisitors(visitors) {
    if (!adminVisitorsList) return;

    const countEl = document.getElementById("visitor-list-count");
    if (countEl) countEl.textContent = `${visitors.length} visitors`;

    if (!visitors || visitors.length === 0) {
      adminVisitorsList.innerHTML = `<p class="meta">No visitor records tracked yet.</p>`;
      return;
    }

    adminVisitorsList.innerHTML = "";

    visitors.forEach((v) => {
      const card = document.createElement("article");
      card.className = "visitor-record";
      card.id = `visitor-card-${v.visitorId}`;

      const geo = v.approxGeo || {};
      const dev = v.lastDevice || {};
      const isGps = v.locationSource === "precise_gps" && v.preciseLocation?.latitude;
      const consentText = v.consentMetadata?.locationConsentGranted
        ? "Consent Granted"
        : v.consentMetadata?.promptDismissed
        ? "Prompt Dismissed"
        : "Standard IP Location";

      let coordsHtml = "";
      if (isGps) {
        coordsHtml = `
          <div id="coords-${escapeHtml(v.visitorId)}" class="precise-coords-box">
            <div><strong>Precise Coordinates (Authorized Admin Only):</strong></div>
            <div>Latitude: <code>${v.preciseLocation.latitude.toFixed(6)}</code>, Longitude: <code>${v.preciseLocation.longitude.toFixed(6)}</code></div>
            <div>Accuracy Radius: <code>${Math.round(v.preciseLocation.accuracy || 0)} meters</code></div>
            <div class="meta" style="margin-top: 4px;">Collected: ${formatDate(v.preciseLocation.collectedAt)}</div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="visitor-top">
          <span class="visitor-id-tag">ID: ${escapeHtml(v.visitorId)}</span>
          <div style="display: flex; gap: 6px; align-items: center;">
            <span class="badge-source ${isGps ? "gps" : "ip"}">${isGps ? "📍 Precise GPS" : "🌐 IP Estimated"}</span>
            <button type="button" class="btn-danger" data-del-visitor="${escapeHtml(v.visitorId)}" style="padding: 2px 8px; font-size: 0.78rem;">Delete Visitor</button>
          </div>
        </div>
        <div class="visitor-details">
          <span><strong>Visits:</strong> ${v.visitCount}</span>
          <span><strong>First Seen:</strong> ${formatDate(v.firstSeen)}</span>
          <span><strong>Last Seen:</strong> ${formatDate(v.lastSeen)}</span>
        </div>
        <div class="visitor-details">
          <span><strong>Location:</strong> ${escapeHtml(geo.city ? `${geo.city}, ${geo.country}` : geo.country || "Unknown")}</span>
          <span><strong>Device:</strong> ${escapeHtml(dev.category || "desktop")} (${escapeHtml(dev.browser || "Unknown")})</span>
          <span><strong>Consent:</strong> ${escapeHtml(consentText)}</span>
        </div>
        ${isGps ? `<button type="button" class="btn-action" data-toggle-coords="${escapeHtml(v.visitorId)}" style="margin-top: 4px; font-size: 0.78rem;">👁 Reveal Exact Coordinates</button>` : ""}
        ${coordsHtml}
      `;

      // Handle Coordinate Reveal Toggle
      if (isGps) {
        const toggleBtn = card.querySelector(`[data-toggle-coords="${v.visitorId}"]`);
        const coordsBox = card.querySelector(`#coords-${v.visitorId}`);
        if (toggleBtn && coordsBox) {
          toggleBtn.addEventListener("click", () => {
            const isHidden = coordsBox.style.display !== "block";
            coordsBox.style.display = isHidden ? "block" : "none";
            toggleBtn.textContent = isHidden ? "✕ Hide Coordinates" : "👁 Reveal Exact Coordinates";
          });
        }
      }

      // Handle Delete Visitor (GDPR Right to Erasure)
      const deleteBtn = card.querySelector(`[data-del-visitor="${v.visitorId}"]`);
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => deleteVisitor(v.visitorId));
      }

      adminVisitorsList.appendChild(card);
    });
  }

  async function deleteVisitor(visitorId) {
    if (!confirm(`Are you sure you want to permanently delete visitor ${visitorId} and all associated visit logs?`)) {
      return;
    }

    const token = getAdminToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/visitors/${encodeURIComponent(visitorId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Failed to delete (Status ${response.status})`);

      const card = document.getElementById(`visitor-card-${visitorId}`);
      if (card) card.remove();
      loadAdminAnalytics();
    } catch (err) {
      alert("Could not delete visitor record: " + err.message);
    }
  }

  // =========================================================================
  // 3. Load Admin Contacts with Read/Unread & Processing Status
  // =========================================================================
  async function loadAdminContacts() {
    const token = getAdminToken();
    if (!token || !adminContactsList) return;

    adminContactsList.innerHTML = `<p class="meta">Loading contact messages...</p>`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Error fetching contacts (Status ${response.status})`);
      }

      const data = await response.json();
      renderContacts(data.contacts || []);
    } catch (err) {
      adminContactsList.innerHTML = `<p class="meta" style="color: #991b1b;">Failed to load contacts: ${escapeHtml(err.message)}</p>`;
    }
  }

  function renderContacts(items) {
    if (!adminContactsList) return;

    const countEl = document.getElementById("contacts-count");
    if (countEl) countEl.textContent = `${items.length} messages`;

    if (!items || items.length === 0) {
      adminContactsList.innerHTML = `<p class="meta">No contact messages received yet.</p>`;
      return;
    }

    adminContactsList.innerHTML = "";

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "admin-record";
      card.id = `contact-${item._id}`;

      const isRead = Boolean(item.read);
      const currentStatus = item.status || "pending";

      card.innerHTML = `
        <div class="record-top">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="${isRead ? "badge-read" : "badge-unread"}">${isRead ? "Read" : "Unread"}</span>
            <strong>${escapeHtml(item.name)}</strong> &bull; 
            <a href="mailto:${encodeURIComponent(item.email)}">${escapeHtml(item.email)}</a> &bull; 
            ${formatDate(item.createdAt)}
          </div>
          <div class="contact-actions">
            <select class="status-select" data-status-id="${item._id}">
              <option value="pending" ${currentStatus === "pending" ? "selected" : ""}>Pending</option>
              <option value="replied" ${currentStatus === "replied" ? "selected" : ""}>Replied</option>
              <option value="archived" ${currentStatus === "archived" ? "selected" : ""}>Archived</option>
            </select>
            <button type="button" class="btn-action" data-toggle-read="${item._id}" style="font-size: 0.8rem;">
              ${isRead ? "Mark Unread" : "Mark Read"}
            </button>
            <button type="button" class="btn-danger" data-contact-id="${item._id}">Delete</button>
          </div>
        </div>
        <div class="meta" style="margin-bottom: 6px;"><strong>Subject:</strong> ${escapeHtml(item.subject || "No subject")}</div>
        <div class="record-text">${escapeHtml(item.message)}</div>
      `;

      // Status dropdown change
      const statusSelect = card.querySelector(`select[data-status-id="${item._id}"]`);
      if (statusSelect) {
        statusSelect.addEventListener("change", (e) => {
          updateContactStatus(item._id, { status: e.target.value });
        });
      }

      // Read toggle
      const toggleReadBtn = card.querySelector(`button[data-toggle-read="${item._id}"]`);
      if (toggleReadBtn) {
        toggleReadBtn.addEventListener("click", () => {
          updateContactStatus(item._id, { read: !isRead });
        });
      }

      // Delete message
      const deleteBtn = card.querySelector(`button[data-contact-id="${item._id}"]`);
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => deleteContact(item._id));
      }

      adminContactsList.appendChild(card);
    });
  }

  async function updateContactStatus(id, updates) {
    const token = getAdminToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/contacts/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update contact.");
      }

      loadAdminContacts();
    } catch (err) {
      alert("Error updating contact: " + err.message);
    }
  }

  async function deleteContact(id) {
    if (!confirm("Are you sure you want to delete this contact message?")) {
      return;
    }

    const token = getAdminToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/contacts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to delete (Status ${response.status})`);
      }

      const card = document.getElementById(`contact-${id}`);
      if (card) card.remove();

      if (adminContactsList.children.length === 0) {
        adminContactsList.innerHTML = `<p class="meta">No contact messages received yet.</p>`;
      }
    } catch (err) {
      alert("Could not delete contact message: " + err.message);
    }
  }

  // =========================================================================
  // 4. Load Admin Uploads (Preserved functionality)
  // =========================================================================
  async function loadAdminUploads() {
    const token = getAdminToken();
    if (!token || !adminUploadsList) return;

    adminUploadsList.innerHTML = `<p class="meta">Loading uploads...</p>`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/uploads`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Error fetching uploads (Status ${response.status})`);
      }

      const data = await response.json();
      renderUploads(data.uploads || []);
    } catch (err) {
      adminUploadsList.innerHTML = `<p class="meta" style="color: #991b1b;">Failed to load uploads: ${escapeHtml(err.message)}</p>`;
    }
  }

  function renderUploads(items) {
    if (!adminUploadsList) return;

    const countEl = document.getElementById("uploads-count");
    if (countEl) countEl.textContent = `${items.length} files/notes`;

    if (!items || items.length === 0) {
      adminUploadsList.innerHTML = `<p class="meta">No uploads found.</p>`;
      return;
    }

    adminUploadsList.innerHTML = "";

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "admin-record";
      card.id = `record-${item._id}`;

      let textHtml = "";
      if (item.text) {
        textHtml = `
          <div class="record-text">
            <strong>Note:</strong><br>${escapeHtml(item.text)}
          </div>
        `;
      }

      let fileHtml = "";
      if (item.file) {
        const hasSafeUrl = isSafeHttpUrl(item.file.url);
        fileHtml = `
          <div class="record-file">
            <div>
              <strong>${escapeHtml(item.file.name || "Attached file")}</strong>
              <span class="meta">(${formatSize(item.file.size)} &bull; ${escapeHtml(item.file.contentType || "binary")})</span>
            </div>
            ${hasSafeUrl ? `<a href="${escapeHtml(item.file.url)}" target="_blank" rel="noopener noreferrer">Download / View</a>` : ""}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="record-top">
          <span>${formatDate(item.createdAt)} &bull; ID: <code>${item._id}</code></span>
          <button type="button" class="btn-danger" data-id="${item._id}">Delete</button>
        </div>
        ${textHtml}
        ${fileHtml}
      `;

      const deleteBtn = card.querySelector("button[data-id]");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => deleteUpload(item._id));
      }

      adminUploadsList.appendChild(card);
    });
  }

  async function deleteUpload(id) {
    if (!confirm("Are you sure you want to delete this upload and its file permanently?")) {
      return;
    }

    const token = getAdminToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/uploads/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to delete (Status ${response.status})`);
      }

      const card = document.getElementById(`record-${id}`);
      if (card) card.remove();

      if (adminUploadsList.children.length === 0) {
        adminUploadsList.innerHTML = `<p class="meta">No uploads found.</p>`;
      }
    } catch (err) {
      alert("Could not delete upload: " + err.message);
    }
  }

  // --- Auth & Status Helpers ---
  function handleAuthError() {
    setAdminToken("");
    syncAdminUI();
    showStatus(adminLoginStatus, "Admin session expired or token is invalid.", "error");
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

  // Run initial state setup
  syncAdminUI();
});
