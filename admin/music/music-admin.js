// Admin Music Manager Logic for Ruhban Abdullah Portfolio
// Real-Time Direct Cloudflare R2 S3-Compatible Multipart Uploads & Audio Governance

import { MusicApi } from "/js/music/music-api.js";

// State
let adminToken = "";
let currentSongsList = [];
let allAdminPlaylists = [];
let stagedUploads = [];

function formatSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return "0 KB/s";
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
}

function formatDuration(sec) {
  if (!sec) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

function formatEta(seconds) {
  if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return "";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s remaining`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s remaining`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  // Theme toggle
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

  // Auth elements
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const loginForm = document.getElementById("login-form");
  const tokenInput = document.getElementById("admin-token-input");
  const loginStatus = document.getElementById("login-status");
  const signoutBtn = document.getElementById("admin-signout-btn");

  adminToken = sessionStorage.getItem("adminToken") || "";
  if (adminToken) {
    verifyAndInitAdmin();
  } else {
    loginView.style.display = "block";
    dashboardView.style.display = "none";
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = tokenInput.value.trim();
    if (!token) return;

    loginStatus.style.display = "block";
    loginStatus.className = "status-box";
    loginStatus.textContent = "Verifying admin authentication token...";

    try {
      adminToken = token;
      sessionStorage.setItem("adminToken", token);
      await verifyAndInitAdmin();
      tokenInput.value = "";
    } catch (err) {
      sessionStorage.removeItem("adminToken");
      adminToken = "";
      loginStatus.className = "status-box status-error";
      loginStatus.textContent = err.message || "Invalid admin token.";
    }
  });

  signoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("adminToken");
    adminToken = "";
    loginView.style.display = "block";
    dashboardView.style.display = "none";
    signoutBtn.style.display = "none";
  });

  // Admin Navigation Tabs
  const tabButtons = document.querySelectorAll(".admin-tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const targetTab = btn.dataset.tab;

      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.style.display = panel.id === `tab-${targetTab}` ? "block" : "none";
      });

      if (targetTab === "songs") loadSongsList();
      if (targetTab === "playlists") loadPlaylistsList();
      if (targetTab === "storage") loadStorageStats();
    });
  });

  setupUploadHandlers();
  setupSongListHandlers();
  setupPlaylistHandlers();
  setupModals();
});

async function verifyAndInitAdmin() {
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const signoutBtn = document.getElementById("admin-signout-btn");

  const overview = await MusicApi.getAdminOverview(adminToken);

  loginView.style.display = "none";
  dashboardView.style.display = "block";
  signoutBtn.style.display = "inline-block";

  renderOverview(overview);
}

function renderOverview(data) {
  document.getElementById("stat-total-songs").textContent = data.totalSongs || 0;
  document.getElementById("stat-storage-used").textContent = formatSize(data.totalStorageBytes);
  document.getElementById("stat-public-songs").textContent = data.publicSongs || 0;
  document.getElementById("stat-private-songs").textContent = data.privateSongs || 0;
  document.getElementById("stat-total-playlists").textContent = data.totalPlaylists || 0;
}

// ===========================================================================
// CLOUDFLARE R2 MULTIPART DIRECT UPLOAD LOGIC
// ===========================================================================

function setupUploadHandlers() {
  const dropzone = document.getElementById("music-dropzone");
  const fileInput = document.getElementById("music-file-input");
  const browseBtn = document.getElementById("browse-files-btn");
  const startAllBtn = document.getElementById("start-all-uploads-btn");

  browseBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    handleSelectedFiles(Array.from(e.target.files));
    fileInput.value = "";
  });

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer?.files) {
      handleSelectedFiles(Array.from(e.dataTransfer.files));
    }
  });

  startAllBtn.addEventListener("click", () => {
    stagedUploads.forEach((item) => {
      if (item.status === "staged" || item.status === "error") {
        uploadMultipartFile(item);
      }
    });
  });
}

function handleSelectedFiles(files) {
  const allowedExts = [".mp3", ".wav", ".flac", ".aac", ".m4a", ".ogg", ".opus"];
  const validFiles = files.filter((f) => {
    const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
    return allowedExts.includes(ext);
  });

  if (validFiles.length === 0) {
    alert("Please select supported audio files (.mp3, .wav, .flac, .aac, .m4a, .ogg)");
    return;
  }

  validFiles.forEach((file) => {
    const baseName = file.name.substring(0, file.name.lastIndexOf("."));
    const uploadItem = {
      id: Math.random().toString(36).substring(2, 9),
      file,
      title: baseName,
      artist: "Unknown Artist",
      album: "",
      genre: "General",
      visibility: "public",
      coverFile: null,
      controller: new AbortController(),
      status: "staged", // staged | uploading | done | error
      uploadedBytes: 0,
      totalBytes: file.size,
      speed: 0,
      eta: 0,
      uploadId: null,
      storageKey: null,
      clientDuration: 0,
    };

    // Client-side duration detection
    try {
      const audioUrl = URL.createObjectURL(file);
      const tempAudio = new Audio(audioUrl);
      tempAudio.addEventListener("loadedmetadata", () => {
        if (tempAudio.duration && Number.isFinite(tempAudio.duration)) {
          uploadItem.clientDuration = tempAudio.duration;
        }
        URL.revokeObjectURL(audioUrl);
      });
    } catch (_e) {}

    stagedUploads.push(uploadItem);
  });

  renderUploadQueue();
}

function renderUploadQueue() {
  const queueContainer = document.getElementById("upload-queue-container");
  const queueList = document.getElementById("upload-queue-list");

  if (stagedUploads.length === 0) {
    queueContainer.style.display = "none";
    return;
  }

  queueContainer.style.display = "block";
  queueList.innerHTML = "";

  stagedUploads.forEach((item) => {
    const itemEl = document.createElement("div");
    itemEl.className = "upload-queue-item";
    itemEl.id = `queue-item-${item.id}`;

    const percent = item.totalBytes > 0 ? Math.round((item.uploadedBytes / item.totalBytes) * 100) : 0;

    itemEl.innerHTML = `
      <div class="upload-queue-header">
        <span class="upload-queue-title">${escapeHtml(item.file.name)} (${formatSize(item.file.size)})</span>
        <span id="queue-status-${item.id}" class="meta" style="font-weight: 600;">
          ${item.status === "uploading" ? `${percent}% &bull; ${formatSpeed(item.speed)} &bull; ${formatEta(item.eta)}` : item.status.toUpperCase()}
        </span>
      </div>

      <div class="form-grid-2" style="margin-top: 8px;">
        <div class="form-group" style="margin-bottom: 8px;">
          <label>Song Title:</label>
          <input type="text" class="form-input item-title" value="${escapeHtml(item.title)}" />
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label>Artist:</label>
          <input type="text" class="form-input item-artist" value="${escapeHtml(item.artist)}" />
        </div>
      </div>

      <div class="form-grid-2" style="margin-top: 4px;">
        <div class="form-group" style="margin-bottom: 8px;">
          <label>Album:</label>
          <input type="text" class="form-input item-album" value="${escapeHtml(item.album)}" />
        </div>
        <div class="form-group" style="margin-bottom: 8px;">
          <label>Visibility:</label>
          <select class="form-select item-visibility">
            <option value="public" ${item.visibility === "public" ? "selected" : ""}>Public (Visitors can stream)</option>
            <option value="private" ${item.visibility === "private" ? "selected" : ""}>Private (Admin only)</option>
          </select>
        </div>
      </div>

      <!-- Real-time Progress Bar & Stats -->
      <div class="upload-progress-outer" id="progress-bar-outer-${item.id}" style="${item.status === "uploading" ? "display: block;" : "display: none;"}">
        <div class="upload-progress-inner" id="progress-bar-inner-${item.id}" style="width: ${percent}%;"></div>
      </div>
      <div id="progress-meta-${item.id}" class="meta" style="font-size: 0.78rem; margin-top: 4px; display: ${item.status === "uploading" ? "flex" : "none"}; justify-content: space-between;">
        <span id="transferred-bytes-${item.id}">${formatSize(item.uploadedBytes)} / ${formatSize(item.totalBytes)}</span>
        <span id="speed-eta-${item.id}">${formatSpeed(item.speed)} &bull; ${formatEta(item.eta)}</span>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
        <button type="button" class="btn-secondary btn-cancel-item" style="padding: 4px 10px; font-size: 0.8rem;">
          ${item.status === "uploading" ? "Cancel Upload" : "Remove"}
        </button>
        <button type="button" class="btn btn-upload-item" style="padding: 4px 12px; font-size: 0.8rem;" ${item.status === "uploading" ? "disabled" : ""}>
          ${item.status === "error" ? "Retry" : "Upload to R2"}
        </button>
      </div>
    `;

    // Input bindings
    itemEl.querySelector(".item-title").addEventListener("input", (e) => {
      item.title = e.target.value;
    });
    itemEl.querySelector(".item-artist").addEventListener("input", (e) => {
      item.artist = e.target.value;
    });
    itemEl.querySelector(".item-album").addEventListener("input", (e) => {
      item.album = e.target.value;
    });
    itemEl.querySelector(".item-visibility").addEventListener("change", (e) => {
      item.visibility = e.target.value;
    });

    itemEl.querySelector(".btn-upload-item").addEventListener("click", () => {
      uploadMultipartFile(item);
    });

    itemEl.querySelector(".btn-cancel-item").addEventListener("click", async () => {
      if (item.status === "uploading") {
        item.controller.abort();
        if (item.uploadId && item.storageKey) {
          await MusicApi.abortUpload(adminToken, { uploadId: item.uploadId, storageKey: item.storageKey });
        }
      }
      stagedUploads = stagedUploads.filter((i) => i.id !== item.id);
      renderUploadQueue();
    });

    queueList.appendChild(itemEl);
  });
}

/**
 * True Cloudflare R2 Multipart Chunk Streaming Upload with live speed & ETA calculation
 */
async function uploadMultipartFile(item) {
  if (item.status === "uploading") return;

  const statusLabel = document.getElementById(`queue-status-${item.id}`);
  const progressOuter = document.getElementById(`progress-bar-outer-${item.id}`);
  const progressInner = document.getElementById(`progress-bar-inner-${item.id}`);
  const progressMeta = document.getElementById(`progress-meta-${item.id}`);
  const transferredSpan = document.getElementById(`transferred-bytes-${item.id}`);
  const speedEtaSpan = document.getElementById(`speed-eta-${item.id}`);

  item.status = "uploading";
  item.controller = new AbortController();
  item.uploadedBytes = 0;

  if (progressOuter) progressOuter.style.display = "block";
  if (progressMeta) progressMeta.style.display = "flex";

  let lastTime = Date.now();
  let lastBytes = 0;

  const updateProgress = (currentPartLoaded, partOffset) => {
    const totalTransferred = partOffset + currentPartLoaded;
    item.uploadedBytes = Math.min(item.totalBytes, totalTransferred);
    const percent = Math.round((item.uploadedBytes / item.totalBytes) * 100);

    const now = Date.now();
    const elapsedSec = (now - lastTime) / 1000;
    if (elapsedSec >= 0.3) {
      const bytesDiff = item.uploadedBytes - lastBytes;
      item.speed = bytesDiff / elapsedSec;
      const remainingBytes = Math.max(0, item.totalBytes - item.uploadedBytes);
      item.eta = item.speed > 0 ? remainingBytes / item.speed : 0;
      lastTime = now;
      lastBytes = item.uploadedBytes;
    }

    if (progressInner) progressInner.style.width = `${percent}%`;
    if (transferredSpan) transferredSpan.textContent = `${formatSize(item.uploadedBytes)} / ${formatSize(item.totalBytes)} (${percent}%)`;
    if (speedEtaSpan) speedEtaSpan.textContent = `${formatSpeed(item.speed)} &bull; ${formatEta(item.eta)}`;
    if (statusLabel) statusLabel.textContent = `STREAMING TO R2 (${percent}%)`;
  };

  try {
    // 1. Initiate Multipart Upload in Cloudflare R2
    if (statusLabel) statusLabel.textContent = "INITIALIZING R2 UPLOAD...";
    const initRes = await MusicApi.initUpload(adminToken, {
      filename: item.file.name,
      fileSize: item.file.size,
      mimeType: item.file.type,
      isCover: false,
    });

    item.uploadId = initRes.uploadId;
    item.storageKey = initRes.storageKey;
    const partSize = initRes.partSize;
    const partsToUpload = initRes.parts;
    const completedParts = [];

    // 2. Upload Each Chunk directly to R2 (or fallback to chunk streaming)
    let partOffset = 0;
    for (const p of partsToUpload) {
      if (item.controller.signal.aborted) throw new DOMException("Aborted", "AbortError");

      const start = (p.partNumber - 1) * partSize;
      const end = Math.min(item.file.size, start + partSize);
      const chunkBlob = item.file.slice(start, end);

      let chunkRes = null;
      let lastErr = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        if (item.controller.signal.aborted) throw new DOMException("Aborted", "AbortError");

        try {
          // 1. Attempt direct presigned R2 upload
          chunkRes = await MusicApi.uploadChunk({
            url: p.presignedUrl,
            blob: chunkBlob,
            onProgress: (loaded) => updateProgress(loaded, partOffset),
            abortSignal: item.controller.signal,
          });
          break; // Succeeded!
        } catch (directErr) {
          lastErr = directErr;
          console.warn(`Direct R2 upload part ${p.partNumber} attempt ${attempt} notice: ${directErr.message}. Attempting streaming endpoint...`);

          try {
            // 2. Fallback to streaming chunk through backend API
            chunkRes = await MusicApi.uploadChunk({
              url: p.proxyUrl,
              blob: chunkBlob,
              token: adminToken,
              contentType: "application/octet-stream",
              onProgress: (loaded) => updateProgress(loaded, partOffset),
              abortSignal: item.controller.signal,
            });
            break; // Succeeded via proxy!
          } catch (proxyErr) {
            lastErr = proxyErr;
            console.warn(`Streaming part ${p.partNumber} attempt ${attempt} notice: ${proxyErr.message}`);
          }
        }
      }

      if (!chunkRes || !chunkRes.etag) {
        throw lastErr || new Error(`Failed to upload part ${p.partNumber} after retries.`);
      }

      completedParts.push({
        PartNumber: p.partNumber,
        ETag: chunkRes.etag,
      });

      partOffset += chunkBlob.size;
      updateProgress(chunkBlob.size, partOffset - chunkBlob.size);
    }

    // 3. Finalize Multipart Upload in Cloudflare R2
    if (statusLabel) statusLabel.textContent = "FINALIZING & EXTRACTING METADATA...";

    let coverKey = "";
    if (item.coverFile) {
      const coverInit = await MusicApi.initUpload(adminToken, {
        filename: item.coverFile.name,
        fileSize: item.coverFile.size,
        mimeType: item.coverFile.type,
        isCover: true,
      });
      try {
        await MusicApi.uploadChunk({
          url: coverInit.presignedUrl,
          blob: item.coverFile,
          contentType: item.coverFile.type,
          token: adminToken,
          abortSignal: item.controller.signal,
        });
      } catch (coverErr) {
        console.warn("Cover direct upload notice:", coverErr.message, "Attempting proxy...");
        if (coverInit.proxyUrl) {
          await MusicApi.uploadChunk({
            url: coverInit.proxyUrl,
            blob: item.coverFile,
            contentType: item.coverFile.type,
            token: adminToken,
            abortSignal: item.controller.signal,
          });
        }
      }
      coverKey = coverInit.storageKey;
    }

    await MusicApi.completeUpload(adminToken, {
      uploadId: item.uploadId,
      storageKey: item.storageKey,
      parts: completedParts,
      title: item.title,
      artist: item.artist,
      album: item.album,
      genre: item.genre,
      visibility: item.visibility,
      clientDuration: item.clientDuration,
      coverKey,
    });

    item.status = "done";
    if (statusLabel) {
      statusLabel.textContent = "UPLOADED TO R2 ✓";
      statusLabel.style.color = "#10b981";
    }

    const overview = await MusicApi.getAdminOverview(adminToken);
    renderOverview(overview);

    setTimeout(() => {
      stagedUploads = stagedUploads.filter((i) => i.id !== item.id);
      renderUploadQueue();
    }, 2000);
  } catch (err) {
    if (err.name === "AbortError") {
      item.status = "staged";
      if (statusLabel) statusLabel.textContent = "CANCELLED";
    } else {
      item.status = "error";
      if (statusLabel) {
        statusLabel.textContent = `FAILED: ${err.message}`;
        statusLabel.style.color = "#ef4444";
      }
    }
  }
}

// ===========================================================================
// SONG LIST & MANAGEMENT
// ===========================================================================

function setupSongListHandlers() {
  const searchInput = document.getElementById("admin-song-search");
  const visFilter = document.getElementById("admin-visibility-filter");
  const genreFilter = document.getElementById("admin-genre-filter");
  const refreshBtn = document.getElementById("admin-refresh-songs-btn");
  const closePreviewBtn = document.getElementById("close-preview-btn");
  const previewAudio = document.getElementById("admin-preview-audio");
  const previewBox = document.getElementById("admin-inline-preview");

  refreshBtn.addEventListener("click", () => loadSongsList());
  searchInput.addEventListener("input", debounce(() => loadSongsList(), 300));
  visFilter.addEventListener("change", () => loadSongsList());
  genreFilter.addEventListener("change", () => loadSongsList());

  closePreviewBtn.addEventListener("click", () => {
    previewAudio.pause();
    previewAudio.src = "";
    previewBox.style.display = "none";
  });
}

async function loadSongsList() {
  const listContainer = document.getElementById("admin-songs-list");
  const searchInput = document.getElementById("admin-song-search");
  const visFilter = document.getElementById("admin-visibility-filter");
  const genreFilter = document.getElementById("admin-genre-filter");

  listContainer.innerHTML = `<p class="meta" style="padding: 20px; text-align: center;">Loading tracks...</p>`;

  try {
    const data = await MusicApi.getAdminSongs(adminToken, {
      search: searchInput.value.trim(),
      visibility: visFilter.value,
      genre: genreFilter.value,
      limit: 100,
    });

    currentSongsList = data.songs || [];
    renderAdminSongs(currentSongsList);
    populateGenreFilter(data.genres || []);
  } catch (err) {
    listContainer.innerHTML = `<p style="color: #ef4444; padding: 20px;">Failed to load songs: ${escapeHtml(err.message)}</p>`;
  }
}

function populateGenreFilter(genres) {
  const select = document.getElementById("admin-genre-filter");
  const currentVal = select.value;
  select.innerHTML = `<option value="All">All Genres</option>`;
  genres.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    if (g === currentVal) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderAdminSongs(songs) {
  const listContainer = document.getElementById("admin-songs-list");
  if (!songs || songs.length === 0) {
    listContainer.innerHTML = `<p class="meta" style="padding: 30px; text-align: center;">No tracks uploaded yet.</p>`;
    return;
  }

  listContainer.innerHTML = "";

  songs.forEach((song) => {
    const row = document.createElement("div");
    row.className = "admin-song-row";

    const coverUrl = song.coverArtKey ? MusicApi.getCoverUrl(song._id || song.id) : (song.coverArtUrl || "");
    const isPublic = song.visibility === "public";

    row.innerHTML = `
      ${
        coverUrl
          ? `<img src="${escapeHtml(coverUrl)}" class="admin-song-thumb" alt="Cover" />`
          : `<div class="admin-song-thumb">🎵</div>`
      }
      <div class="admin-song-info">
        <div class="admin-song-title">${escapeHtml(song.title)}</div>
        <div class="admin-song-meta">
          ${escapeHtml(song.artist || "Unknown Artist")} &bull; 
          ${song.album ? `${escapeHtml(song.album)} &bull; ` : ""}
          ${song.genre || "General"} &bull; 
          ${formatDuration(song.duration)} &bull; 
          ${(song.format || "mp3").toUpperCase()} &bull; 
          ${formatSize(song.fileSize)}
        </div>
      </div>

      <div style="flex-shrink: 0;">
        <button type="button" class="admin-badge ${isPublic ? "public" : "private"} btn-toggle-vis" style="cursor: pointer; border: none;" title="Click to toggle visibility">
          ${song.visibility}
        </button>
      </div>

      <div class="admin-actions-col">
        <button type="button" class="btn-secondary btn-preview-song" style="padding: 4px 8px; font-size: 0.8rem;" title="Listen Preview">▶ Preview</button>
        <button type="button" class="btn-secondary btn-edit-song" style="padding: 4px 8px; font-size: 0.8rem;" title="Edit Metadata">✎ Edit</button>
        <button type="button" class="btn-secondary btn-cover-song" style="padding: 4px 8px; font-size: 0.8rem;" title="Change Artwork">🖼 Cover</button>
        <button type="button" class="btn-danger btn-delete-song" style="padding: 4px 8px; font-size: 0.8rem;" title="Delete Audio Track">&times; Delete</button>
      </div>
    `;

    // Preview via HTTP Range streaming endpoint
    row.querySelector(".btn-preview-song").addEventListener("click", () => {
      const previewBox = document.getElementById("admin-inline-preview");
      const previewTitle = document.getElementById("preview-title");
      const previewAudio = document.getElementById("admin-preview-audio");

      previewTitle.textContent = `${song.title} - ${song.artist}`;
      previewAudio.src = MusicApi.getStreamUrl(song._id || song.id, adminToken);
      previewBox.style.display = "flex";
      previewAudio.play();
    });

    // Toggle Visibility
    row.querySelector(".btn-toggle-vis").addEventListener("click", async () => {
      const nextVis = isPublic ? "private" : "public";
      try {
        await MusicApi.updateSong(adminToken, song._id || song.id, { visibility: nextVis });
        loadSongsList();
      } catch (err) {
        alert("Failed to change visibility: " + err.message);
      }
    });

    // Edit
    row.querySelector(".btn-edit-song").addEventListener("click", () => {
      openEditModal(song);
    });

    // Cover
    row.querySelector(".btn-cover-song").addEventListener("click", () => {
      openCoverModal(song);
    });

    // Delete
    row.querySelector(".btn-delete-song").addEventListener("click", async () => {
      if (confirm(`Permanently delete "${song.title}" from Cloudflare R2 and MongoDB?`)) {
        try {
          await MusicApi.deleteSong(adminToken, song._id || song.id);
          loadSongsList();
          const overview = await MusicApi.getAdminOverview(adminToken);
          renderOverview(overview);
        } catch (err) {
          alert("Failed to delete song: " + err.message);
        }
      }
    });

    listContainer.appendChild(row);
  });
}

// ===========================================================================
// PLAYLISTS MANAGEMENT
// ===========================================================================

function setupPlaylistHandlers() {
  const newBtn = document.getElementById("create-playlist-btn");
  newBtn.addEventListener("click", () => openPlaylistModal(null));
}

async function loadPlaylistsList() {
  const container = document.getElementById("admin-playlists-list");
  container.innerHTML = `<p class="meta">Loading playlists...</p>`;

  try {
    const data = await MusicApi.getAdminPlaylists(adminToken);
    allAdminPlaylists = data.playlists || [];
    renderAdminPlaylists(allAdminPlaylists);
  } catch (err) {
    container.innerHTML = `<p style="color: #ef4444;">Failed to load playlists: ${escapeHtml(err.message)}</p>`;
  }
}

function renderAdminPlaylists(playlists) {
  const container = document.getElementById("admin-playlists-list");
  if (!playlists || playlists.length === 0) {
    container.innerHTML = `<p class="meta">No playlists created yet. Click "+ New Playlist" to create one.</p>`;
    return;
  }

  container.innerHTML = "";

  playlists.forEach((pl) => {
    const card = document.createElement("div");
    card.className = "playlist-card";

    const count = pl.songs?.length || 0;
    const coverUrl = pl.coverArtUrl || pl.songs?.[0]?.coverArtUrl || "";

    card.innerHTML = `
      <div class="playlist-card-cover">
        ${coverUrl ? `<img src="${escapeHtml(coverUrl)}" alt="Cover" />` : `<span>📂</span>`}
        <span class="admin-badge ${pl.visibility}" style="position: absolute; top: 8px; right: 8px;">${pl.visibility}</span>
      </div>
      <div class="playlist-card-info">
        <div class="playlist-card-title">${escapeHtml(pl.name)}</div>
        ${pl.description ? `<div class="playlist-card-desc">${escapeHtml(pl.description)}</div>` : ""}
        <div class="playlist-card-count" style="margin-bottom: 8px;">${count} songs</div>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn-secondary btn-edit-pl" style="padding: 2px 8px; font-size: 0.78rem;">Edit</button>
          <button type="button" class="btn-danger btn-delete-pl" style="padding: 2px 8px; font-size: 0.78rem;">Delete</button>
        </div>
      </div>
    `;

    card.querySelector(".btn-edit-pl").addEventListener("click", () => {
      openPlaylistModal(pl);
    });

    card.querySelector(".btn-delete-pl").addEventListener("click", async () => {
      if (confirm(`Delete playlist "${pl.name}"? (Songs inside are preserved)`)) {
        try {
          await MusicApi.deletePlaylist(adminToken, pl._id || pl.id);
          loadPlaylistsList();
        } catch (err) {
          alert("Failed to delete playlist: " + err.message);
        }
      }
    });

    container.appendChild(card);
  });
}

// ===========================================================================
// STORAGE & R2 DIAGNOSTICS
// ===========================================================================

async function loadStorageStats() {
  const box = document.getElementById("storage-details-box");
  box.innerHTML = `<p class="meta">Loading storage information...</p>`;

  try {
    const stats = await MusicApi.getStorageStats(adminToken);
    let breakdownHtml = "";

    if (stats.formatBreakdown && stats.formatBreakdown.length > 0) {
      breakdownHtml = stats.formatBreakdown
        .map(
          (f) =>
            `<li style="margin-bottom: 4px;"><strong>.${(f._id || "unknown").toUpperCase()}</strong>: ${f.count} tracks &mdash; ${formatSize(f.bytes)}</li>`
        )
        .join("");
    } else {
      breakdownHtml = `<li class="meta">No audio stored yet.</li>`;
    }

    box.innerHTML = `
      <div style="margin-bottom: 12px;">
        <strong>Total Audio Consumed:</strong> ${formatSize(stats.totalBytes)}
      </div>
      <div style="margin-bottom: 12px;">
        <strong>Total Audio Tracks in Cloudflare R2:</strong> ${stats.totalSongs || 0}
      </div>
      <div style="margin-bottom: 12px;">
        <strong>Max Configured Audio Upload Size:</strong> ${formatSize(stats.maxUploadBytes)}
      </div>
      <h4>Breakdown by Audio Format:</h4>
      <ul style="padding-left: 20px; margin-bottom: 18px;">
        ${breakdownHtml}
      </ul>
      <div style="border-top: 1px solid var(--border); padding-top: 14px;">
        <h4 style="margin-bottom: 6px;">Abandoned Multipart Upload Cleanup</h4>
        <p class="meta" style="margin-bottom: 10px;">Scans Cloudflare R2 for uncompleted multipart uploads older than 24 hours and safely aborts them to reclaim storage.</p>
        <button type="button" id="cleanup-storage-btn" class="btn-secondary" style="padding: 6px 14px;">🧹 Clean Abandoned Uploads</button>
        <span id="cleanup-status" class="meta" style="margin-left: 10px;"></span>
      </div>
    `;

    document.getElementById("cleanup-storage-btn").addEventListener("click", async () => {
      const statusEl = document.getElementById("cleanup-status");
      statusEl.textContent = "Scanning R2 bucket...";
      try {
        const res = await MusicApi.cleanupStorage(adminToken);
        statusEl.textContent = res.message;
      } catch (err) {
        statusEl.textContent = "Failed: " + err.message;
      }
    });
  } catch (err) {
    box.innerHTML = `<p style="color: #ef4444;">Failed to load storage details: ${escapeHtml(err.message)}</p>`;
  }
}

// ===========================================================================
// MODALS LOGIC
// ===========================================================================

function setupModals() {
  // Edit Modal
  const editModal = document.getElementById("edit-song-modal");
  const editClose = document.getElementById("modal-close-edit");
  const editCancel = document.getElementById("modal-cancel-edit");
  const editForm = document.getElementById("edit-song-form");

  const closeEdit = () => (editModal.style.display = "none");
  editClose.addEventListener("click", closeEdit);
  editCancel.addEventListener("click", closeEdit);

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const songId = document.getElementById("edit-song-id").value;
    const title = document.getElementById("edit-song-title").value.trim();
    const artist = document.getElementById("edit-song-artist").value.trim();
    const album = document.getElementById("edit-song-album").value.trim();
    const genre = document.getElementById("edit-song-genre").value.trim();
    const visibility = document.getElementById("edit-song-visibility").value;
    const tags = document.getElementById("edit-song-tags").value;
    const description = document.getElementById("edit-song-desc").value.trim();

    try {
      await MusicApi.updateSong(adminToken, songId, {
        title,
        artist,
        album,
        genre,
        visibility,
        tags,
        description,
      });
      closeEdit();
      loadSongsList();
    } catch (err) {
      alert("Failed to update song: " + err.message);
    }
  });

  // Cover Modal
  const coverModal = document.getElementById("cover-modal");
  const coverClose = document.getElementById("modal-close-cover");
  const coverCancel = document.getElementById("modal-cancel-cover");
  const coverForm = document.getElementById("cover-form");

  const closeCover = () => (coverModal.style.display = "none");
  coverClose.addEventListener("click", closeCover);
  coverCancel.addEventListener("click", closeCover);

  coverForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const songId = document.getElementById("cover-song-id").value;
    const fileInput = document.getElementById("cover-file-input");
    if (!fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const progressBar = document.getElementById("cover-progress-bar");
    const progressOuter = document.getElementById("cover-upload-progress");
    progressOuter.style.display = "block";

    try {
      // Direct R2 presigned upload
      const init = await MusicApi.initUpload(adminToken, {
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        isCover: true,
      });

      try {
        await MusicApi.uploadChunk({
          url: init.presignedUrl,
          blob: file,
          contentType: file.type,
          token: adminToken,
          onProgress: (loaded, total) => {
            progressBar.style.width = `${Math.round((loaded / total) * 100)}%`;
          },
        });
      } catch (directCoverErr) {
        console.warn("Direct cover upload failed, falling back to proxy:", directCoverErr.message);
        if (init.proxyUrl) {
          await MusicApi.uploadChunk({
            url: init.proxyUrl,
            blob: file,
            contentType: file.type,
            token: adminToken,
            onProgress: (loaded, total) => {
              progressBar.style.width = `${Math.round((loaded / total) * 100)}%`;
            },
          });
        } else {
          throw directCoverErr;
        }
      }

      await MusicApi.updateSong(adminToken, songId, {
        coverKey: init.storageKey,
      });

      closeCover();
      loadSongsList();
    } catch (err) {
      alert("Failed to update cover artwork: " + err.message);
    } finally {
      progressOuter.style.display = "none";
    }
  });

  // Playlist Modal
  const plModal = document.getElementById("playlist-modal");
  const plClose = document.getElementById("modal-close-playlist");
  const plCancel = document.getElementById("modal-cancel-playlist");
  const plForm = document.getElementById("playlist-form");

  const closePlaylist = () => (plModal.style.display = "none");
  plClose.addEventListener("click", closePlaylist);
  plCancel.addEventListener("click", closePlaylist);

  plForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("playlist-modal-id").value;
    const name = document.getElementById("playlist-name-input").value.trim();
    const description = document.getElementById("playlist-desc-input").value.trim();
    const visibility = document.getElementById("playlist-visibility-input").value;

    const checkedBoxes = document.querySelectorAll(".pl-song-checkbox:checked");
    const selectedSongs = Array.from(checkedBoxes).map((cb) => cb.value);

    try {
      if (id) {
        await MusicApi.updatePlaylist(adminToken, id, {
          name,
          description,
          visibility,
          songs: selectedSongs,
        });
      } else {
        await MusicApi.createPlaylist(adminToken, {
          name,
          description,
          visibility,
          songs: selectedSongs,
        });
      }
      closePlaylist();
      loadPlaylistsList();
    } catch (err) {
      alert("Failed to save playlist: " + err.message);
    }
  });
}

function openEditModal(song) {
  document.getElementById("edit-song-id").value = song._id || song.id;
  document.getElementById("edit-song-title").value = song.title || "";
  document.getElementById("edit-song-artist").value = song.artist || "";
  document.getElementById("edit-song-album").value = song.album || "";
  document.getElementById("edit-song-genre").value = song.genre || "General";
  document.getElementById("edit-song-visibility").value = song.visibility || "public";
  document.getElementById("edit-song-tags").value = Array.isArray(song.tags) ? song.tags.join(", ") : "";
  document.getElementById("edit-song-desc").value = song.description || "";

  document.getElementById("edit-song-modal").style.display = "flex";
}

function openCoverModal(song) {
  document.getElementById("cover-song-id").value = song._id || song.id;
  document.getElementById("cover-file-input").value = "";
  document.getElementById("cover-modal").style.display = "flex";
}

function openPlaylistModal(pl = null) {
  const modal = document.getElementById("playlist-modal");
  const title = document.getElementById("playlist-modal-title");
  const idInput = document.getElementById("playlist-modal-id");
  const nameInput = document.getElementById("playlist-name-input");
  const descInput = document.getElementById("playlist-desc-input");
  const visInput = document.getElementById("playlist-visibility-input");
  const songsSelector = document.getElementById("playlist-songs-selector");

  idInput.value = pl ? pl._id || pl.id : "";
  title.textContent = pl ? "Edit Playlist" : "Create Playlist";
  nameInput.value = pl ? pl.name : "";
  descInput.value = pl ? pl.description || "" : "";
  visInput.value = pl ? pl.visibility : "public";

  const selectedIds = new Set(
    pl && pl.songs ? pl.songs.map((s) => (typeof s === "object" ? s._id || s.id : s)) : []
  );

  if (currentSongsList.length === 0) {
    songsSelector.innerHTML = `<p class="meta" style="margin: 0;">No songs available to select.</p>`;
  } else {
    songsSelector.innerHTML = currentSongsList
      .map((s) => {
        const sid = s._id || s.id;
        const checked = selectedIds.has(sid) ? "checked" : "";
        return `
          <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-weight: normal; cursor: pointer;">
            <input type="checkbox" class="pl-song-checkbox" value="${sid}" ${checked} />
            <span>${escapeHtml(s.title)} &mdash; <span class="meta">${escapeHtml(s.artist)}</span></span>
          </label>
        `;
      })
      .join("");
  }

  modal.style.display = "flex";
}

function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
