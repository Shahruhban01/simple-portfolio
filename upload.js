// Upload & Admin API Client for Ruhban Abdullah Portfolio
// API endpoint: https://api.developerruhban.online

const API_BASE_URL = "https://api.developerruhban.online";
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

document.addEventListener("DOMContentLoaded", () => {
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
  const adminDashboardStatus = document.getElementById("admin-dashboard-status");
  const adminAuthControls = document.getElementById("admin-auth-controls");
  const adminRefreshBtn = document.getElementById("admin-refresh-btn");
  const adminSignoutBtn = document.getElementById("admin-signout-btn");
  const adminUploadsList = document.getElementById("admin-uploads-list");

  // Character counter
  if (uploadText && charCount) {
    uploadText.addEventListener("input", () => {
      charCount.textContent = `${uploadText.value.length} / 10,000`;
    });
  }

  // File size check on selection
  if (uploadFile && fileInfo) {
    uploadFile.addEventListener("change", () => {
      const file = uploadFile.files?.[0];
      if (file) {
        fileInfo.style.display = "block";
        fileInfo.textContent = `Selected: ${file.name} (${formatSize(file.size)})`;
        if (file.size > MAX_FILE_SIZE) {
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
        charCount.textContent = "0 / 10,000";
        fileInfo.style.display = "none";

        // If admin is active, refresh the list
        if (getAdminToken()) {
          loadAdminUploads();
        }
      } catch (err) {
        showStatus(uploadStatus, err.message || "Failed to reach the upload API.", "error");
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload Content";
      }
    });
  }

  // --- Admin Token Management ---
  function getAdminToken() {
    return sessionStorage.getItem("adminToken") || "";
  }

  function setAdminToken(token) {
    if (token) {
      sessionStorage.setItem("adminToken", token);
    } else {
      sessionStorage.removeItem("adminToken");
    }
  }

  // Initial check of admin auth state
  function syncAdminUI() {
    const token = getAdminToken();
    if (token) {
      adminLoginView.style.display = "none";
      adminDashboardView.style.display = "block";
      adminAuthControls.style.display = "block";
      loadAdminUploads();
    } else {
      adminLoginView.style.display = "block";
      adminDashboardView.style.display = "none";
      adminAuthControls.style.display = "none";
      adminUploadsList.innerHTML = "";
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
      loadAdminUploads();
    });
  }

  // Load Admin Uploads from API
  async function loadAdminUploads() {
    const token = getAdminToken();
    if (!token) return;

    adminUploadsList.innerHTML = `<p class="meta">Loading uploads...</p>`;
    hideStatus(adminDashboardStatus);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/uploads`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        setAdminToken("");
        syncAdminUI();
        showStatus(adminLoginStatus, "Admin session expired or token is invalid.", "error");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || `Error fetching uploads (Status ${response.status})`);
      }

      const uploads = data.uploads || [];
      renderUploads(uploads);
    } catch (err) {
      adminUploadsList.innerHTML = "";
      showStatus(adminDashboardStatus, err.message || "Failed to load uploads from server.", "error");
    }
  }

  // Render uploads list
  function renderUploads(items) {
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
        fileHtml = `
          <div class="record-file">
            <div>
              <strong>${escapeHtml(item.file.name || "Attached file")}</strong>
              <span class="meta">(${formatSize(item.file.size)} &bull; ${escapeHtml(item.file.contentType || "binary")})</span>
            </div>
            ${item.file.url ? `<a href="${item.file.url}" target="_blank" rel="noopener noreferrer">Download / View</a>` : ""}
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

      // Attach delete event
      const deleteBtn = card.querySelector("button[data-id]");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => deleteRecord(item._id));
      }

      adminUploadsList.appendChild(card);
    });
  }

  // Delete an upload
  async function deleteRecord(id) {
    if (!confirm("Are you sure you want to delete this upload and its file permanently?")) {
      return;
    }

    const token = getAdminToken();
    if (!token) return;

    hideStatus(adminDashboardStatus);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/uploads/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to delete (Status ${response.status})`);
      }

      // Remove from DOM
      const card = document.getElementById(`record-${id}`);
      if (card) {
        card.remove();
      }

      if (adminUploadsList.children.length === 0) {
        adminUploadsList.innerHTML = `<p class="meta">No uploads found.</p>`;
      }
    } catch (err) {
      showStatus(adminDashboardStatus, err.message || "Could not delete upload.", "error");
    }
  }

  // Helper status functions
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

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Run initial state setup
  syncAdminUI();
});
