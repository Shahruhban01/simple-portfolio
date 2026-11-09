// Music API Client for Ruhban Abdullah Portfolio
// Connects to local dev backend or production API with Cloudflare R2 Multipart Streaming

const API_BASE_URL = (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:" ||
  (window.location.port !== "" && window.location.port !== "80" && window.location.port !== "443")
)
  ? "http://localhost:4000"
  : "https://api.developerruhban.online";

export const MusicApi = {
  baseUrl: API_BASE_URL,

  /**
   * Helper: Build streaming URL with optional auth token
   */
  getStreamUrl(songId, token = null) {
    if (!songId) return "";
    let url = `${API_BASE_URL}/api/music/stream/${encodeURIComponent(songId)}`;
    if (token) {
      url += `?token=${encodeURIComponent(token)}`;
    }
    return url;
  },

  /**
   * Helper: Build cover artwork URL
   */
  getCoverUrl(songId) {
    if (!songId) return "";
    return `${API_BASE_URL}/api/music/cover/${encodeURIComponent(songId)}`;
  },

  /**
   * Public: List public songs
   */
  async getSongs(params = {}) {
    const qs = new URLSearchParams();
    if (params.search) qs.append("search", params.search);
    if (params.genre) qs.append("genre", params.genre);
    if (params.artist) qs.append("artist", params.artist);
    if (params.album) qs.append("album", params.album);
    if (params.sort) qs.append("sort", params.sort);
    if (params.page) qs.append("page", params.page);
    if (params.limit) qs.append("limit", params.limit);

    const url = `${API_BASE_URL}/api/music/songs${qs.toString() ? `?${qs.toString()}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to load songs");
    }
    return res.json();
  },

  /**
   * Public: Single song details
   */
  async getSong(songId, token = null) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/api/music/songs/${encodeURIComponent(songId)}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to load song");
    }
    return res.json();
  },

  /**
   * Public: Get distinct genres
   */
  async getGenres() {
    const res = await fetch(`${API_BASE_URL}/api/music/genres`);
    if (!res.ok) return { genres: [] };
    return res.json();
  },

  /**
   * Public: List public playlists
   */
  async getPlaylists() {
    const res = await fetch(`${API_BASE_URL}/api/music/playlists`);
    if (!res.ok) return { playlists: [] };
    return res.json();
  },

  /**
   * Public: Single playlist
   */
  async getPlaylist(playlistId) {
    const res = await fetch(`${API_BASE_URL}/api/music/playlists/${encodeURIComponent(playlistId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to load playlist");
    }
    return res.json();
  },

  /**
   * Public: Record play count increment
   */
  async recordPlay(songId) {
    try {
      await fetch(`${API_BASE_URL}/api/music/songs/${encodeURIComponent(songId)}/play`, {
        method: "POST",
      });
    } catch (_e) {}
  },

  // =========================================================================
  // ADMIN API & DIRECT R2 MULTIPART STREAMING
  // =========================================================================

  /**
   * Admin: Overview metrics
   */
  async getAdminOverview(token) {
    const res = await fetch(`${API_BASE_URL}/api/admin/music/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to load overview");
    }
    return res.json();
  },

  /**
   * Admin: List all songs (public & private)
   */
  async getAdminSongs(token, params = {}) {
    const qs = new URLSearchParams();
    if (params.search) qs.append("search", params.search);
    if (params.visibility) qs.append("visibility", params.visibility);
    if (params.genre) qs.append("genre", params.genre);
    if (params.sort) qs.append("sort", params.sort);
    if (params.page) qs.append("page", params.page);
    if (params.limit) qs.append("limit", params.limit);

    const res = await fetch(
      `${API_BASE_URL}/api/admin/music/songs${qs.toString() ? `?${qs.toString()}` : ""}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to load admin songs");
    }
    return res.json();
  },

  /**
   * Admin Step 1: Initiate Multipart Upload in Cloudflare R2
   */
  async initUpload(token, { filename, fileSize, mimeType, isCover = false }) {
    const res = await fetch(`${API_BASE_URL}/api/admin/music/upload/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ filename, fileSize, mimeType, isCover }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to initiate R2 upload");
    }
    return res.json();
  },

  /**
   * Admin Step 2: Upload chunk directly to R2 or via streaming part endpoint with byte-level progress
   */
  uploadChunk({ url, blob, contentType = "application/octet-stream", token, onProgress, abortSignal }) {
    return new Promise((resolve, reject) => {
      if (!url) {
        return reject(new Error("Upload URL is required."));
      }

      // Ensure relative URLs are resolved against API_BASE_URL (never static Vercel origin)
      const targetUrl = (url.startsWith("http://") || url.startsWith("https://"))
        ? url
        : `${this.baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", targetUrl);

      // If uploading to our backend API proxy, attach Authorization header
      const isBackendApi = targetUrl.includes("/api/admin/") || targetUrl.startsWith(this.baseUrl);
      if (isBackendApi && token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      // For backend proxy or explicit non-R2 requests, set Content-Type
      if (contentType && !targetUrl.includes("r2.cloudflarestorage.com")) {
        xhr.setRequestHeader("Content-Type", contentType);
      }

      if (abortSignal) {
        abortSignal.addEventListener("abort", () => {
          xhr.abort();
          reject(new DOMException("Upload aborted by user", "AbortError"));
        });
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            onProgress(evt.loaded, evt.total);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Extract ETag from response headers or response body
          let etag = xhr.getResponseHeader("ETag") || xhr.getResponseHeader("etag");
          if (!etag) {
            try {
              const parsed = JSON.parse(xhr.responseText);
              etag = parsed.ETag || parsed.etag;
            } catch (_e) {}
          }
          resolve({ etag, status: xhr.status });
        } else {
          let errMsg = `Chunk upload failed with status ${xhr.status}`;
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed.message) errMsg += `: ${parsed.message}`;
          } catch (_e) {}
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => {
        reject(new Error(`Network error during chunk upload to ${targetUrl.slice(0, 80)}...`));
      };

      xhr.send(blob);
    });
  },

  /**
   * Admin Step 3: Complete Multipart Upload in Cloudflare R2 and save metadata
   */
  async completeUpload(token, completeData) {
    const res = await fetch(`${API_BASE_URL}/api/admin/music/upload/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(completeData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to complete R2 upload");
    }
    return res.json();
  },

  /**
   * Admin Step 4: Abort incomplete multipart upload in R2
   */
  async abortUpload(token, { uploadId, storageKey }) {
    try {
      await fetch(`${API_BASE_URL}/api/admin/music/upload/abort`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uploadId, storageKey }),
      });
    } catch (_e) {}
  },

  /**
   * Admin: Update song metadata
   */
  async updateSong(token, songId, updateData) {
    const res = await fetch(`${API_BASE_URL}/api/admin/music/songs/${encodeURIComponent(songId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to update song");
    }
    return res.json();
  },

  /**
   * Admin: Delete song and R2 storage
   */
  async deleteSong(token, songId) {
    const res = await fetch(`${API_BASE_URL}/api/admin/music/songs/${encodeURIComponent(songId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to delete song");
    }
    return res.json();
  },

  /**
   * Admin: List all playlists
   */
  async getAdminPlaylists(token) {
    const res = await fetch(`${API_BASE_URL}/api/admin/music/playlists`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to load playlists");
    }
    return res.json();
  },

  /**
   * Admin: Create playlist
   */
  async createPlaylist(token, playlistData) {
    const res = await fetch(`${API_BASE_URL}/api/admin/music/playlists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(playlistData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to create playlist");
    }
    return res.json();
  },

  /**
   * Admin: Update playlist
   */
  async updatePlaylist(token, playlistId, updateData) {
    const res = await fetch(
      `${API_BASE_URL}/api/admin/music/playlists/${encodeURIComponent(playlistId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to update playlist");
    }
    return res.json();
  },

  /**
   * Admin: Delete playlist
   */
  async deletePlaylist(token, playlistId) {
    const res = await fetch(
      `${API_BASE_URL}/api/admin/music/playlists/${encodeURIComponent(playlistId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to delete playlist");
    }
    return res.json();
  },

  /**
   * Admin: Storage metrics
   */
  async getStorageStats(token) {
    const res = await fetch(`${API_BASE_URL}/api/admin/music/storage`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to load storage statistics");
    }
    return res.json();
  },

  /**
   * Admin: Clean up abandoned multipart uploads in R2
   */
  async cleanupStorage(token) {
    const res = await fetch(`${API_BASE_URL}/api/admin/music/storage/cleanup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "Failed to cleanup storage");
    }
    return res.json();
  },
};

if (typeof window !== "undefined") {
  window.MusicApi = MusicApi;
}
