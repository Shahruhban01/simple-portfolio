// Public Music Page Logic for Ruhban Abdullah Portfolio

import { MusicApi } from "../js/music/music-api.js";
import { AudioEngine } from "../js/music/audio-engine.js";
import { QueueManager } from "../js/music/queue.js";
import { PlaylistManager } from "../js/music/playlists.js";
import { PlayerUI, formatTime } from "../js/music/player-ui.js";
import { PageNavigator } from "../js/music/page-navigator.js";

// Global instances
let engine;
let queue;
let playlists;
let playerUI;
let pageNavigator;

let allSongs = [];
let publicPlaylists = [];
let currentTab = "all";
let currentGenre = "All";
let searchQuery = "";

export function initMusicApp() {
  if (typeof window !== "undefined") {
    window.initMusicApp = initMusicApp;
  }
  // Ensure single shared AudioEngine and PlayerUI instance across page navigation
  if (!window.sharedAudioPlayer) {
    engine = new AudioEngine();
    queue = new QueueManager();
    playlists = new PlaylistManager();
    playerUI = new PlayerUI({ engine, queue, playlists });
    window.sharedAudioPlayer = { engine, queue, playlists, playerUI };
  } else {
    engine = window.sharedAudioPlayer.engine;
    queue = window.sharedAudioPlayer.queue;
    playlists = window.sharedAudioPlayer.playlists;
    playerUI = window.sharedAudioPlayer.playerUI;
  }

  // Page Navigator for seamless uninterrupted playback
  if (!window.portfolioNavigator) {
    pageNavigator = new PageNavigator();
    window.portfolioNavigator = pageNavigator;
  } else {
    pageNavigator = window.portfolioNavigator;
  }

  pageNavigator.on("musicLoaded", () => {
    initMusicPageDOM();
    loadMusicLibrary();
  });

  // Attach player event listeners
  engine.on("trackloaded", () => updateActiveSongHighlight());
  engine.on("play", () => updateActiveSongHighlight());
  engine.on("pause", () => updateActiveSongHighlight());

  initMusicPageDOM();
  loadMusicLibrary();
}

function initMusicPageDOM() {
  // 1. Initialize Theme Button
  const themeBtn = document.getElementById("music-theme-btn");
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

  // 2. Setup Search Bar
  const searchInput = document.getElementById("music-search-input");
  const searchClear = document.getElementById("music-search-clear");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      searchClear.style.display = searchQuery ? "block" : "none";
      renderCurrentView();
    });

    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      searchQuery = "";
      searchClear.style.display = "none";
      renderCurrentView();
      searchInput.focus();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== searchInput) {
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          searchInput.focus();
        }
      }
    });
  }

  // 3. Setup Tabs
  const tabButtons = document.querySelectorAll(".music-tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTab = btn.dataset.tab;
      renderCurrentView();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMusicApp();
});

async function loadMusicLibrary() {
  const loadingEl = document.getElementById("music-loading");
  try {
    const [songsData, playlistsData] = await Promise.all([
      MusicApi.getSongs({ limit: 100 }),
      MusicApi.getPlaylists(),
    ]);

    allSongs = songsData.songs || [];
    publicPlaylists = playlistsData.playlists || [];

    renderGenrePills(songsData.genres || []);
    renderCurrentView();
  } catch (err) {
    console.error("Failed to load music library:", err);
    if (loadingEl) {
      loadingEl.innerHTML = `<p style="color: #ef4444;">Could not load songs: ${escapeHtml(err.message)}</p>`;
    }
  } finally {
    if (loadingEl) loadingEl.style.display = "none";
  }
}

function renderGenrePills(genres) {
  const container = document.getElementById("genres-container");
  if (!container) return;

  container.innerHTML = `<button type="button" class="genre-pill ${currentGenre === "All" ? "active" : ""}" data-genre="All">All Genres</button>`;

  genres.forEach((genre) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = `genre-pill ${currentGenre === genre ? "active" : ""}`;
    pill.dataset.genre = genre;
    pill.textContent = genre;
    container.appendChild(pill);
  });

  container.querySelectorAll(".genre-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      container.querySelectorAll(".genre-pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      currentGenre = pill.dataset.genre;
      renderCurrentView();
    });
  });
}

function renderCurrentView() {
  const songsContainer = document.getElementById("songs-container");
  const playlistsContainer = document.getElementById("playlists-container");
  const emptyState = document.getElementById("music-empty-state");
  const emptyTitle = document.getElementById("empty-title");
  const emptyDesc = document.getElementById("empty-desc");

  if (!songsContainer || !playlistsContainer || !emptyState) return;

  if (currentTab === "playlists") {
    songsContainer.style.display = "none";
    renderPlaylistsView();
    return;
  }

  let filtered = [...allSongs];

  if (currentTab === "recent-added") {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (currentTab === "favorites") {
    const favs = playlists.getFavorites();
    const favIds = new Set(favs.map((s) => s._id || s.id));
    filtered = filtered.filter((s) => favIds.has(s._id || s.id));
  } else if (currentTab === "recents") {
    const recents = playlists.getRecents();
    const recentIds = new Set(recents.map((s) => s._id || s.id));
    filtered = filtered.filter((s) => recentIds.has(s._id || s.id));
  }

  // Genre filter
  if (currentGenre !== "All") {
    filtered = filtered.filter(
      (s) => (s.genre || "").toLowerCase() === currentGenre.toLowerCase()
    );
  }

  // Search filter
  if (searchQuery) {
    filtered = filtered.filter((s) => {
      const matchTitle = (s.title || "").toLowerCase().includes(searchQuery);
      const matchArtist = (s.artist || "").toLowerCase().includes(searchQuery);
      const matchAlbum = (s.album || "").toLowerCase().includes(searchQuery);
      const matchTags = Array.isArray(s.tags)
        ? s.tags.some((t) => t.toLowerCase().includes(searchQuery))
        : false;
      return matchTitle || matchArtist || matchAlbum || matchTags;
    });
  }

  playlistsContainer.style.display = "none";

  if (filtered.length === 0) {
    songsContainer.style.display = "none";
    emptyState.style.display = "block";
    if (searchQuery) {
      emptyTitle.textContent = "No matching songs";
      emptyDesc.textContent = `No tracks matched "${searchQuery}". Try different keywords.`;
    } else if (currentTab === "favorites") {
      emptyTitle.textContent = "No liked songs yet";
      emptyDesc.textContent = "Click the heart icon on any song to save it to your favorites.";
    } else if (currentTab === "recents") {
      emptyTitle.textContent = "No recently played tracks";
      emptyDesc.textContent = "Songs you listen to will appear here.";
    } else {
      emptyTitle.textContent = "No songs found";
      emptyDesc.textContent = "No songs have been uploaded to the music library yet.";
    }
    return;
  }

  emptyState.style.display = "none";
  songsContainer.style.display = "flex";
  songsContainer.innerHTML = "";

  filtered.forEach((song, idx) => {
    const songId = song._id || song.id;
    const isCurrent = (engine.currentSong?._id || engine.currentSong?.id) === songId;
    const isFav = playlists.isFavorite(songId);
    const coverUrl = song.coverArtKey ? MusicApi.getCoverUrl(songId) : (song.coverArtUrl || "");

    const row = document.createElement("div");
    row.className = `song-row ${isCurrent ? "active" : ""}`;
    row.dataset.songId = songId;

    row.innerHTML = `
      <div class="song-cover-wrapper">
        ${
          coverUrl
            ? `<img class="song-cover-img" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(song.title)}" loading="lazy" />`
            : `<div class="song-cover-placeholder">🎵</div>`
        }
        <div class="song-play-overlay">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
      </div>

      <div class="song-details">
        <div class="song-title">
          ${escapeHtml(song.title)}
          ${song.genre ? `<span class="song-genre-tag">${escapeHtml(song.genre)}</span>` : ""}
        </div>
        <div class="song-artist-album">
          ${escapeHtml(song.artist || "Unknown Artist")}
          ${song.album ? ` &bull; ${escapeHtml(song.album)}` : ""}
        </div>
      </div>

      <div class="song-meta-col">
        <span class="song-duration">${formatTime(song.duration)}</span>
        
        <button type="button" class="song-action-btn btn-fav ${isFav ? "active" : ""}" title="Favorite" aria-label="Favorite">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="${isFav ? "#ef4444" : "none"}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>

        <button type="button" class="song-action-btn btn-add-queue" title="Add to Queue" aria-label="Add to Queue">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    `;

    row.addEventListener("click", (e) => {
      if (e.target.closest(".song-action-btn")) return;
      queue.setQueue(filtered, idx);
      engine.load(song, true);
    });

    const favBtn = row.querySelector(".btn-fav");
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const updatedFav = playlists.toggleFavorite(song);
      favBtn.classList.toggle("active", updatedFav);
      const svg = favBtn.querySelector("svg");
      svg.setAttribute("fill", updatedFav ? "#ef4444" : "none");
    });

    const addQueueBtn = row.querySelector(".btn-add-queue");
    addQueueBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      queue.addToQueue(song);
      addQueueBtn.title = "Added to queue!";
      setTimeout(() => {
        addQueueBtn.title = "Add to Queue";
      }, 1500);
    });

    songsContainer.appendChild(row);
  });
}

function renderPlaylistsView() {
  const songsContainer = document.getElementById("songs-container");
  const playlistsContainer = document.getElementById("playlists-container");
  const emptyState = document.getElementById("music-empty-state");
  const emptyTitle = document.getElementById("empty-title");
  const emptyDesc = document.getElementById("empty-desc");

  songsContainer.style.display = "none";

  let filtered = [...publicPlaylists];
  if (searchQuery) {
    filtered = filtered.filter((p) => {
      return (
        (p.name || "").toLowerCase().includes(searchQuery) ||
        (p.description || "").toLowerCase().includes(searchQuery)
      );
    });
  }

  if (filtered.length === 0) {
    playlistsContainer.style.display = "none";
    emptyState.style.display = "block";
    emptyTitle.textContent = "No playlists found";
    emptyDesc.textContent = searchQuery
      ? `No playlists matched "${searchQuery}".`
      : "No public playlists have been created yet.";
    return;
  }

  emptyState.style.display = "none";
  playlistsContainer.style.display = "grid";
  playlistsContainer.innerHTML = "";

  filtered.forEach((playlist) => {
    const card = document.createElement("div");
    card.className = "playlist-card";

    const songCount = playlist.songs?.length || 0;
    const coverUrl = playlist.coverArtUrl || playlist.songs?.[0]?.coverArtUrl || "";

    card.innerHTML = `
      <div class="playlist-card-cover">
        ${
          coverUrl
            ? `<img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(playlist.name)}" loading="lazy" />`
            : `<span>📂</span>`
        }
        <div class="playlist-play-badge" title="Play Playlist">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
      </div>
      <div class="playlist-card-info">
        <div class="playlist-card-title">${escapeHtml(playlist.name)}</div>
        ${playlist.description ? `<div class="playlist-card-desc">${escapeHtml(playlist.description)}</div>` : ""}
        <div class="playlist-card-count">${songCount} ${songCount === 1 ? "track" : "tracks"}</div>
      </div>
    `;

    card.addEventListener("click", () => {
      if (playlist.songs && playlist.songs.length > 0) {
        queue.setQueue(playlist.songs, 0);
        engine.load(playlist.songs[0], true);
      }
    });

    playlistsContainer.appendChild(card);
  });
}

function updateActiveSongHighlight() {
  const currentSongId = engine.currentSong?._id || engine.currentSong?.id;
  document.querySelectorAll(".song-row").forEach((row) => {
    const isCurrent = row.dataset.songId === currentSongId;
    row.classList.toggle("active", isCurrent);
  });
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
