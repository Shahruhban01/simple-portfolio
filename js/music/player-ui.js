// Full-Featured Player UI for Ruhban Abdullah Music Player
// Manages compact floating bottom player, fullscreen expanded player,
// interactive scrubber, volume, playback speed, queue sidebar, and keyboard shortcuts

export function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  const padSec = remSec < 10 ? `0${remSec}` : `${remSec}`;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remMin = m % 60;
    const padMin = remMin < 10 ? `0${remMin}` : `${remMin}`;
    return `${h}:${padMin}:${padSec}`;
  }
  return `${m}:${padSec}`;
}

export class PlayerUI {
  constructor({ engine, queue, playlists }) {
    this.engine = engine;
    this.queue = queue;
    this.playlists = playlists;

    this.isExpanded = false;
    this.isQueueOpen = false;
    this.isScrubbing = false;

    this._createDOM();
    this._bindEngineEvents();
    this._bindQueueEvents();
    this._bindUIEvents();
    this._bindKeyboardShortcuts();
    this._restoreLastPlayedState();
  }

  _createDOM() {
    // 1. Create Floating Bottom Player Container
    const bottomPlayer = document.createElement("div");
    bottomPlayer.id = "portfolio-music-player";
    bottomPlayer.className = "music-player-bar";
    bottomPlayer.setAttribute("role", "region");
    bottomPlayer.setAttribute("aria-label", "Audio Player");
    bottomPlayer.innerHTML = `
      <!-- Scrubber Track across the top of the bar -->
      <div class="player-scrubber-wrapper" id="player-scrubber-wrapper" title="Seek (drag or click)">
        <div class="player-buffered-bar" id="player-buffered-bar"></div>
        <div class="player-progress-bar" id="player-progress-bar"></div>
        <div class="player-scrubber-handle" id="player-scrubber-handle"></div>
      </div>

      <div class="player-bar-content">
        <!-- Left: Track Info -->
        <div class="player-track-info" id="player-track-info" title="Click to expand player">
          <div class="player-thumb-wrapper">
            <img id="player-thumb" class="player-thumb" src="" alt="Album Artwork" />
            <div id="player-thumb-placeholder" class="player-thumb-placeholder">🎵</div>
          </div>
          <div class="player-track-meta">
            <div class="player-track-title" id="player-title">No track selected</div>
            <div class="player-track-artist" id="player-artist">Select a song to play</div>
          </div>
          <button type="button" class="player-fav-btn" id="player-fav-btn" title="Add to favorites" aria-label="Favorite">
            <svg class="icon-heart" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>

        <!-- Center: Playback Controls & Times -->
        <div class="player-center-controls">
          <div class="player-buttons-row">
            <button type="button" class="player-ctrl-btn" id="ctrl-shuffle" title="Shuffle (S)" aria-label="Shuffle">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
              </svg>
            </button>
            <button type="button" class="player-ctrl-btn" id="ctrl-prev" title="Previous (P)" aria-label="Previous Track">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
                <polygon points="19 20 9 12 19 4 19 20"></polygon>
                <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="3"></line>
              </svg>
            </button>
            <button type="button" class="player-ctrl-btn btn-play-main" id="ctrl-play" title="Play / Pause (Space)" aria-label="Play">
              <svg id="icon-play" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <svg id="icon-pause" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" style="display: none;">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            </button>
            <button type="button" class="player-ctrl-btn" id="ctrl-next" title="Next (N)" aria-label="Next Track">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
                <polygon points="5 4 15 12 5 20 5 4"></polygon>
                <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="3"></line>
              </svg>
            </button>
            <button type="button" class="player-ctrl-btn" id="ctrl-repeat" title="Repeat (R)" aria-label="Repeat">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
              <span id="repeat-badge" class="repeat-badge" style="display: none;">1</span>
            </button>
          </div>
          <div class="player-time-display">
            <span id="time-current">0:00</span>
            <span class="time-sep">/</span>
            <span id="time-total">0:00</span>
          </div>
        </div>

        <!-- Right: Speed, Volume, Queue & Expand -->
        <div class="player-right-controls">
          <button type="button" class="player-pill-btn" id="ctrl-speed-btn" title="Playback speed">1.0x</button>
          
          <div class="player-volume-wrapper">
            <button type="button" class="player-icon-btn" id="ctrl-volume-icon" title="Mute/Unmute" aria-label="Volume">
              <svg id="icon-vol-high" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
              <svg id="icon-vol-mute" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            </button>
            <input type="range" class="player-volume-slider" id="ctrl-volume-slider" min="0" max="1" step="0.01" value="0.85" aria-label="Volume Slider" />
          </div>

          <button type="button" class="player-icon-btn" id="ctrl-queue-toggle" title="Playback Queue (Q)" aria-label="Queue">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            <span id="queue-badge" class="queue-badge" style="display: none;">0</span>
          </button>

          <button type="button" class="player-icon-btn" id="ctrl-expand-toggle" title="Expand Player" aria-label="Fullscreen Player">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
        </div>
      </div>
    `;

    // 2. Create Fullscreen / Expanded Player Modal
    const modalPlayer = document.createElement("div");
    modalPlayer.id = "portfolio-expanded-player";
    modalPlayer.className = "music-expanded-player";
    modalPlayer.style.display = "none";
    modalPlayer.innerHTML = `
      <div class="expanded-player-header">
        <button type="button" class="btn-close-expanded" id="btn-close-expanded" title="Minimize Player" aria-label="Close Fullscreen Player">
          &times;
        </button>
        <span class="expanded-player-heading">Now Playing</span>
        <button type="button" class="btn-queue-expanded" id="btn-queue-expanded-toggle" title="Toggle Queue Panel">
          Queue ☰
        </button>
      </div>

      <div class="expanded-player-body">
        <div class="expanded-artwork-container">
          <img id="expanded-thumb" class="expanded-thumb" src="" alt="Album Artwork" />
          <div id="expanded-thumb-placeholder" class="expanded-thumb-placeholder">🎵</div>
        </div>

        <div class="expanded-meta-container">
          <h2 id="expanded-title" class="expanded-title">No track selected</h2>
          <p id="expanded-artist" class="expanded-artist">Select a song to play</p>
          <p id="expanded-album" class="expanded-album"></p>
          <div id="expanded-genre-tag" class="expanded-genre-tag"></div>
        </div>

        <!-- Expanded Scrubber -->
        <div class="expanded-scrubber-box">
          <div class="player-scrubber-wrapper expanded-scrubber" id="expanded-scrubber-wrapper">
            <div class="player-buffered-bar" id="expanded-buffered-bar"></div>
            <div class="player-progress-bar" id="expanded-progress-bar"></div>
            <div class="player-scrubber-handle" id="expanded-scrubber-handle"></div>
          </div>
          <div class="expanded-times-row">
            <span id="expanded-time-current">0:00</span>
            <span id="expanded-time-total">0:00</span>
          </div>
        </div>

        <!-- Expanded Controls -->
        <div class="expanded-controls-row">
          <button type="button" class="player-ctrl-btn" id="expanded-ctrl-shuffle" title="Shuffle" aria-label="Shuffle">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="4" y1="20" x2="21" y2="3"></line>
              <polyline points="21 16 21 21 16 21"></polyline>
              <line x1="15" y1="15" x2="21" y2="21"></line>
              <line x1="4" y1="4" x2="9" y2="9"></line>
            </svg>
          </button>
          <button type="button" class="player-ctrl-btn" id="expanded-ctrl-prev" title="Previous Track">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <polygon points="19 20 9 12 19 4 19 20"></polygon>
              <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="3"></line>
            </svg>
          </button>
          <button type="button" class="player-ctrl-btn btn-play-large" id="expanded-ctrl-play" title="Play / Pause">
            <svg id="expanded-icon-play" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <svg id="expanded-icon-pause" viewBox="0 0 24 24" width="28" height="28" fill="currentColor" style="display: none;">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          </button>
          <button type="button" class="player-ctrl-btn" id="expanded-ctrl-next" title="Next Track">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <polygon points="5 4 15 12 5 20 5 4"></polygon>
              <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="3"></line>
            </svg>
          </button>
          <button type="button" class="player-ctrl-btn" id="expanded-ctrl-repeat" title="Repeat" aria-label="Repeat">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            <span id="expanded-repeat-badge" class="repeat-badge" style="display: none;">1</span>
          </button>
        </div>

        <div class="expanded-secondary-row">
          <button type="button" class="player-fav-btn" id="expanded-fav-btn" title="Favorite">
            <svg class="icon-heart" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
          <button type="button" class="player-pill-btn" id="expanded-speed-btn">1.0x</button>
        </div>
      </div>
    `;

    // 3. Create Slide-out Queue Panel Container
    const queuePanel = document.createElement("div");
    queuePanel.id = "portfolio-queue-panel";
    queuePanel.className = "music-queue-panel";
    queuePanel.style.display = "none";
    queuePanel.innerHTML = `
      <div class="queue-panel-header">
        <h3>Playing Queue</h3>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button type="button" class="btn-secondary" id="queue-clear-btn" style="padding: 2px 8px; font-size: 0.78rem;">Clear Queue</button>
          <button type="button" class="btn-close-queue" id="queue-close-btn" aria-label="Close Queue">&times;</button>
        </div>
      </div>
      <div class="queue-panel-list" id="queue-panel-items">
        <!-- Rendered dynamically -->
      </div>
    `;

    document.body.appendChild(bottomPlayer);
    document.body.appendChild(modalPlayer);
    document.body.appendChild(queuePanel);

    this.elements = {
      bottomPlayer,
      modalPlayer,
      queuePanel,
      thumb: document.getElementById("player-thumb"),
      thumbPlaceholder: document.getElementById("player-thumb-placeholder"),
      title: document.getElementById("player-title"),
      artist: document.getElementById("player-artist"),
      playBtn: document.getElementById("ctrl-play"),
      playIcon: document.getElementById("icon-play"),
      pauseIcon: document.getElementById("icon-pause"),
      prevBtn: document.getElementById("ctrl-prev"),
      nextBtn: document.getElementById("ctrl-next"),
      shuffleBtn: document.getElementById("ctrl-shuffle"),
      repeatBtn: document.getElementById("ctrl-repeat"),
      repeatBadge: document.getElementById("repeat-badge"),
      speedBtn: document.getElementById("ctrl-speed-btn"),
      favBtn: document.getElementById("player-fav-btn"),
      timeCurrent: document.getElementById("time-current"),
      timeTotal: document.getElementById("time-total"),
      progressBar: document.getElementById("player-progress-bar"),
      bufferedBar: document.getElementById("player-buffered-bar"),
      scrubberHandle: document.getElementById("player-scrubber-handle"),
      scrubberWrapper: document.getElementById("player-scrubber-wrapper"),
      volumeIcon: document.getElementById("ctrl-volume-icon"),
      volHighIcon: document.getElementById("icon-vol-high"),
      volMuteIcon: document.getElementById("icon-vol-mute"),
      volumeSlider: document.getElementById("ctrl-volume-slider"),
      queueToggle: document.getElementById("ctrl-queue-toggle"),
      queueBadge: document.getElementById("queue-badge"),
      expandToggle: document.getElementById("ctrl-expand-toggle"),
      trackInfo: document.getElementById("player-track-info"),
      // Expanded elements
      expandedThumb: document.getElementById("expanded-thumb"),
      expandedThumbPlaceholder: document.getElementById("expanded-thumb-placeholder"),
      expandedTitle: document.getElementById("expanded-title"),
      expandedArtist: document.getElementById("expanded-artist"),
      expandedAlbum: document.getElementById("expanded-album"),
      expandedGenre: document.getElementById("expanded-genre-tag"),
      expandedTimeCurrent: document.getElementById("expanded-time-current"),
      expandedTimeTotal: document.getElementById("expanded-time-total"),
      expandedProgressBar: document.getElementById("expanded-progress-bar"),
      expandedBufferedBar: document.getElementById("expanded-buffered-bar"),
      expandedScrubberWrapper: document.getElementById("expanded-scrubber-wrapper"),
      expandedPlayBtn: document.getElementById("expanded-ctrl-play"),
      expandedPlayIcon: document.getElementById("expanded-icon-play"),
      expandedPauseIcon: document.getElementById("expanded-icon-pause"),
      expandedPrevBtn: document.getElementById("expanded-ctrl-prev"),
      expandedNextBtn: document.getElementById("expanded-ctrl-next"),
      expandedShuffleBtn: document.getElementById("expanded-ctrl-shuffle"),
      expandedRepeatBtn: document.getElementById("expanded-ctrl-repeat"),
      expandedRepeatBadge: document.getElementById("expanded-repeat-badge"),
      expandedSpeedBtn: document.getElementById("expanded-speed-btn"),
      expandedFavBtn: document.getElementById("expanded-fav-btn"),
      closeExpandedBtn: document.getElementById("btn-close-expanded"),
      expandedQueueToggle: document.getElementById("btn-queue-expanded-toggle"),
      // Queue panel elements
      queueItems: document.getElementById("queue-panel-items"),
      queueClearBtn: document.getElementById("queue-clear-btn"),
      queueCloseBtn: document.getElementById("queue-close-btn"),
    };
  }

  _bindEngineEvents() {
    this.engine.on("play", (song) => {
      this._updatePlayButtonState(true);
      if (song) {
        this.playlists.addRecent(song);
        if (window.MusicApi) {
          window.MusicApi.recordPlay(song._id || song.id);
        }
      }
    });

    this.engine.on("pause", () => {
      this._updatePlayButtonState(false);
    });

    this.engine.on("trackloaded", (song) => {
      this._renderTrackInfo(song);
      this._renderQueueList();
    });

    this.engine.on("timeupdate", ({ currentTime, duration, progress }) => {
      if (!this.isScrubbing) {
        this.elements.timeCurrent.textContent = formatTime(currentTime);
        this.elements.expandedTimeCurrent.textContent = formatTime(currentTime);
        this.elements.progressBar.style.width = `${progress}%`;
        this.elements.scrubberHandle.style.left = `${progress}%`;
        this.elements.expandedProgressBar.style.width = `${progress}%`;

        // Save last position periodically
        this._savePlaybackPosition(currentTime);
      }
    });

    this.engine.on("loadedmetadata", ({ duration }) => {
      this.elements.timeTotal.textContent = formatTime(duration);
      this.elements.expandedTimeTotal.textContent = formatTime(duration);
    });

    this.engine.on("buffered", ({ bufferedPercent }) => {
      this.elements.bufferedBar.style.width = `${bufferedPercent}%`;
      this.elements.expandedBufferedBar.style.width = `${bufferedPercent}%`;
    });

    this.engine.on("ended", () => {
      const nextSong = this.queue.next();
      if (nextSong) {
        this.engine.load(nextSong, true);
      } else {
        this._updatePlayButtonState(false);
      }
    });

    this.engine.on("volumechange", ({ volume, isMuted }) => {
      this.elements.volumeSlider.value = volume;
      if (isMuted || volume === 0) {
        this.elements.volHighIcon.style.display = "none";
        this.elements.volMuteIcon.style.display = "inline";
      } else {
        this.elements.volHighIcon.style.display = "inline";
        this.elements.volMuteIcon.style.display = "none";
      }
    });

    this.engine.on("ratechange", ({ playbackRate }) => {
      const text = `${playbackRate.toFixed(playbackRate % 1 === 0 ? 1 : 2)}x`;
      this.elements.speedBtn.textContent = text;
      this.elements.expandedSpeedBtn.textContent = text;
    });

    this.engine.on("error", ({ message }) => {
      console.warn("Player notification:", message);
      this.showToast(message, true);
    });

    this.engine.on("autoplayblocked", ({ message }) => {
      this.showToast(message, false);
    });
  }

  showToast(message, isError = false) {
    let toast = document.getElementById("music-player-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "music-player-toast";
      toast.style.cssText = `
        position: fixed;
        bottom: 84px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(17, 24, 39, 0.95);
        color: #fff;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.85rem;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        pointer-events: none;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.borderColor = isError ? "#ef4444" : "rgba(255,255,255,0.1)";
    toast.style.color = isError ? "#fca5a5" : "#fff";
    toast.style.opacity = "1";
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.opacity = "0";
    }, 4000);
  }

  _bindQueueEvents() {
    this.queue.on("queuechanged", ({ queue, currentIndex, currentSong }) => {
      this._updateQueueBadge();
      this._renderQueueList();
      if (currentSong && (!this.engine.currentSong || (this.engine.currentSong._id || this.engine.currentSong.id) !== (currentSong._id || currentSong.id))) {
        this._renderTrackInfo(currentSong);
      }
    });

    this.queue.on("currentsongchanged", (song) => {
      if (song) {
        this.engine.load(song, true);
      }
    });

    this.queue.on("shufflechanged", (isShuffle) => {
      this.elements.shuffleBtn.classList.toggle("active", isShuffle);
      this.elements.expandedShuffleBtn.classList.toggle("active", isShuffle);
    });

    this.queue.on("repeatchanged", (mode) => {
      this._updateRepeatUI(mode);
    });

    this.playlists.on("favoriteschanged", ({ songId, isFavorite }) => {
      const current = this.queue.getCurrentSong();
      if (current && (current._id || current.id) === songId) {
        this._updateFavoriteUI(isFavorite);
      }
    });
  }

  _bindUIEvents() {
    // Play/Pause
    const handleTogglePlay = () => {
      if (!this.engine.currentSong) {
        const first = this.queue.getCurrentSong() || this.queue.queue[0];
        if (first) {
          this.engine.load(first, true);
        }
      } else {
        this.engine.togglePlay();
      }
    };
    this.elements.playBtn.addEventListener("click", handleTogglePlay);
    this.elements.expandedPlayBtn.addEventListener("click", handleTogglePlay);

    // Prev / Next
    const handlePrev = () => {
      if (this.engine.currentTime > 3) {
        this.engine.seek(0);
      } else {
        const prev = this.queue.previous();
        if (prev) this.engine.load(prev, true);
      }
    };
    const handleNext = () => {
      const next = this.queue.next();
      if (next) this.engine.load(next, true);
    };

    this.elements.prevBtn.addEventListener("click", handlePrev);
    this.elements.expandedPrevBtn.addEventListener("click", handlePrev);
    this.elements.nextBtn.addEventListener("click", handleNext);
    this.elements.expandedNextBtn.addEventListener("click", handleNext);

    // MediaSession lock-screen action bindings
    this.engine.on("previoustrack", handlePrev);
    this.engine.on("nexttrack", handleNext);

    // Shuffle
    const handleShuffle = () => this.queue.toggleShuffle();
    this.elements.shuffleBtn.addEventListener("click", handleShuffle);
    this.elements.expandedShuffleBtn.addEventListener("click", handleShuffle);

    // Repeat
    const handleRepeat = () => this.queue.cycleRepeat();
    this.elements.repeatBtn.addEventListener("click", handleRepeat);
    this.elements.expandedRepeatBtn.addEventListener("click", handleRepeat);

    // Speed Cycle: 1.0 -> 1.25 -> 1.5 -> 2.0 -> 0.75 -> 1.0
    const speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
    const handleSpeed = () => {
      const curr = this.engine.playbackRate;
      let nextIdx = speeds.findIndex((s) => Math.abs(s - curr) < 0.05) + 1;
      if (nextIdx >= speeds.length) nextIdx = 0;
      this.engine.setPlaybackRate(speeds[nextIdx]);
    };
    this.elements.speedBtn.addEventListener("click", handleSpeed);
    this.elements.expandedSpeedBtn.addEventListener("click", handleSpeed);

    // Volume
    this.elements.volumeSlider.addEventListener("input", (e) => {
      this.engine.setVolume(parseFloat(e.target.value));
    });
    this.elements.volumeIcon.addEventListener("click", () => {
      this.engine.toggleMute();
    });

    // Favorite button
    const handleFavorite = () => {
      const current = this.queue.getCurrentSong();
      if (current) {
        this.playlists.toggleFavorite(current);
      }
    };
    this.elements.favBtn.addEventListener("click", handleFavorite);
    this.elements.expandedFavBtn.addEventListener("click", handleFavorite);

    // Queue Toggle
    this.elements.queueToggle.addEventListener("click", () => this.toggleQueuePanel());
    this.elements.expandedQueueToggle.addEventListener("click", () => this.toggleQueuePanel());
    this.elements.queueCloseBtn.addEventListener("click", () => this.toggleQueuePanel(false));
    this.elements.queueClearBtn.addEventListener("click", () => this.queue.clear(true));

    // Fullscreen / Expanded Toggle
    this.elements.expandToggle.addEventListener("click", () => this.toggleExpandedPlayer(true));
    this.elements.trackInfo.addEventListener("click", (e) => {
      // Don't expand if favorite heart was clicked
      if (e.target.closest("#player-fav-btn")) return;
      this.toggleExpandedPlayer(true);
    });
    this.elements.closeExpandedBtn.addEventListener("click", () => this.toggleExpandedPlayer(false));

    // Mobile Swipe-Down to dismiss expanded player
    let touchStartY = 0;
    let touchStartX = 0;
    if (this.elements.modalPlayer) {
      this.elements.modalPlayer.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches[0]) {
          touchStartY = e.touches[0].clientY;
          touchStartX = e.touches[0].clientX;
        }
      }, { passive: true });

      this.elements.modalPlayer.addEventListener("touchend", (e) => {
        if (e.changedTouches && e.changedTouches[0]) {
          const deltaY = e.changedTouches[0].clientY - touchStartY;
          const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
          // If swiped down at least 70px with minimal horizontal drift
          if (deltaY > 70 && deltaX < 80) {
            this.toggleExpandedPlayer(false);
          }
        }
      }, { passive: true });
    }

    // Interactive Scrubber (Mouse & Touch)
    this._setupScrubber(this.elements.scrubberWrapper);
    this._setupScrubber(this.elements.expandedScrubberWrapper);
  }

  _setupScrubber(wrapper) {
    if (!wrapper) return;

    const onSeek = (clientX) => {
      const rect = wrapper.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const percent = clickX / rect.width;
      const targetTime = percent * (this.engine.duration || 0);

      this.elements.progressBar.style.width = `${percent * 100}%`;
      this.elements.expandedProgressBar.style.width = `${percent * 100}%`;
      this.elements.timeCurrent.textContent = formatTime(targetTime);
      this.elements.expandedTimeCurrent.textContent = formatTime(targetTime);

      return targetTime;
    };

    wrapper.addEventListener("mousedown", (e) => {
      this.isScrubbing = true;
      const targetTime = onSeek(e.clientX);

      const onMouseMove = (moveEvt) => {
        if (this.isScrubbing) {
          onSeek(moveEvt.clientX);
        }
      };

      const onMouseUp = (upEvt) => {
        if (this.isScrubbing) {
          const finalTime = onSeek(upEvt.clientX);
          this.engine.seek(finalTime);
          this.isScrubbing = false;
        }
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });

    // Touch support for mobile devices
    wrapper.addEventListener("touchstart", (e) => {
      if (e.touches.length > 0) {
        this.isScrubbing = true;
        onSeek(e.touches[0].clientX);
      }
    }, { passive: true });

    wrapper.addEventListener("touchmove", (e) => {
      if (this.isScrubbing && e.touches.length > 0) {
        onSeek(e.touches[0].clientX);
      }
    }, { passive: true });

    wrapper.addEventListener("touchend", (e) => {
      if (this.isScrubbing && e.changedTouches.length > 0) {
        const finalTime = onSeek(e.changedTouches[0].clientX);
        this.engine.seek(finalTime);
        this.isScrubbing = false;
      }
    });
  }

  _bindKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      // Guard: Never trigger shortcuts if typing inside an editable field!
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      // Guard: Don't intercept shortcuts if games, command palette, or terminal are active!
      const isHireGameActive = document.getElementById("game-overlay") && !document.getElementById("game-overlay").hasAttribute("hidden");
      const isApocalypseActive = document.body.classList.contains("ats-apocalypse-active");
      const isPaletteActive = document.getElementById("palette-overlay") && !document.getElementById("palette-overlay").hasAttribute("hidden");
      const isTerminalActive = document.getElementById("terminal-overlay") && !document.getElementById("terminal-overlay").hasAttribute("hidden");
      if (isHireGameActive || isApocalypseActive || isPaletteActive || isTerminalActive) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (this.engine.currentSong) {
            this.engine.togglePlay();
          } else {
            const first = this.queue.getCurrentSong() || this.queue.queue[0];
            if (first) this.engine.load(first, true);
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          this.engine.seekRelative(-5);
          break;

        case "ArrowRight":
          e.preventDefault();
          this.engine.seekRelative(5);
          break;

        case "ArrowUp":
          e.preventDefault();
          this.engine.setVolume(this.engine.volume + 0.05);
          break;

        case "ArrowDown":
          e.preventDefault();
          this.engine.setVolume(this.engine.volume - 0.05);
          break;

        case "KeyN":
          e.preventDefault();
          const next = this.queue.next();
          if (next) this.engine.load(next, true);
          break;

        case "KeyP":
          e.preventDefault();
          if (this.engine.currentTime > 3) {
            this.engine.seek(0);
          } else {
            const prev = this.queue.previous();
            if (prev) this.engine.load(prev, true);
          }
          break;

        case "KeyM":
          this.engine.toggleMute();
          break;

        case "KeyS":
          this.queue.toggleShuffle();
          break;

        case "KeyR":
          this.queue.cycleRepeat();
          break;

        case "KeyQ":
          this.toggleQueuePanel();
          break;

        case "Escape":
          if (this.isExpanded) this.toggleExpandedPlayer(false);
          if (this.isQueueOpen) this.toggleQueuePanel(false);
          break;
      }
    });
  }

  _updatePlayButtonState(isPlaying) {
    if (isPlaying) {
      this.elements.playIcon.style.display = "none";
      this.elements.pauseIcon.style.display = "inline";
      this.elements.expandedPlayIcon.style.display = "none";
      this.elements.expandedPauseIcon.style.display = "inline";
    } else {
      this.elements.playIcon.style.display = "inline";
      this.elements.pauseIcon.style.display = "none";
      this.elements.expandedPlayIcon.style.display = "inline";
      this.elements.expandedPauseIcon.style.display = "none";
    }
  }

  _updateRepeatUI(mode) {
    const isRepeat = mode !== "off";
    this.elements.repeatBtn.classList.toggle("active", isRepeat);
    this.elements.expandedRepeatBtn.classList.toggle("active", isRepeat);

    if (mode === "one") {
      this.elements.repeatBadge.style.display = "inline";
      this.elements.expandedRepeatBadge.style.display = "inline";
    } else {
      this.elements.repeatBadge.style.display = "none";
      this.elements.expandedRepeatBadge.style.display = "none";
    }
  }

  _updateFavoriteUI(isFavorite) {
    this.elements.favBtn.classList.toggle("active", isFavorite);
    this.elements.expandedFavBtn.classList.toggle("active", isFavorite);
  }

  _updateQueueBadge() {
    const count = this.queue.queue.length;
    if (count > 0) {
      this.elements.queueBadge.textContent = String(count);
      this.elements.queueBadge.style.display = "inline-block";
    } else {
      this.elements.queueBadge.style.display = "none";
    }
  }

  _renderTrackInfo(song) {
    if (!song) return;

    this.elements.bottomPlayer.classList.add("visible");
    document.body.classList.add("has-music-player");

    const title = song.title || "Untitled";
    const artist = song.artist || "Unknown Artist";
    const album = song.album ? `Album: ${song.album}` : "";
    const genre = song.genre ? song.genre : "";

    this.elements.title.textContent = title;
    this.elements.artist.textContent = artist;
    this.elements.expandedTitle.textContent = title;
    this.elements.expandedArtist.textContent = artist;
    this.elements.expandedAlbum.textContent = album;
    this.elements.expandedGenre.textContent = genre;

    // Artwork
    const coverUrl = song.coverArtUrl || "";
    if (coverUrl) {
      this.elements.thumb.src = coverUrl;
      this.elements.thumb.style.display = "block";
      this.elements.thumbPlaceholder.style.display = "none";

      this.elements.expandedThumb.src = coverUrl;
      this.elements.expandedThumb.style.display = "block";
      this.elements.expandedThumbPlaceholder.style.display = "none";
    } else {
      this.elements.thumb.style.display = "none";
      this.elements.thumbPlaceholder.style.display = "flex";

      this.elements.expandedThumb.style.display = "none";
      this.elements.expandedThumbPlaceholder.style.display = "flex";
    }

    // Favorite state
    const isFav = this.playlists.isFavorite(song._id || song.id);
    this._updateFavoriteUI(isFav);

    // Total duration
    if (song.duration) {
      this.elements.timeTotal.textContent = formatTime(song.duration);
      this.elements.expandedTimeTotal.textContent = formatTime(song.duration);
    }
  }

  _renderQueueList() {
    if (!this.elements.queueItems) return;
    const { queue, currentIndex } = this.queue;

    if (queue.length === 0) {
      this.elements.queueItems.innerHTML = `<p class="meta" style="padding: 16px; text-align: center;">Queue is empty.</p>`;
      return;
    }

    this.elements.queueItems.innerHTML = "";

    queue.forEach((song, idx) => {
      const isCurrent = idx === currentIndex;
      const item = document.createElement("div");
      item.className = `queue-item ${isCurrent ? "current" : ""}`;
      item.innerHTML = `
        <span class="queue-item-idx">${isCurrent ? "▶" : idx + 1}</span>
        <div class="queue-item-info">
          <div class="queue-item-title">${escapeHtml(song.title || "Untitled")}</div>
          <div class="queue-item-artist">${escapeHtml(song.artist || "Unknown")}</div>
        </div>
        <div class="queue-item-actions">
          ${idx > 0 ? `<button type="button" class="btn-queue-action" data-action="up" title="Move Up">↑</button>` : ""}
          ${idx < queue.length - 1 ? `<button type="button" class="btn-queue-action" data-action="down" title="Move Down">↓</button>` : ""}
          <button type="button" class="btn-queue-action" data-action="remove" title="Remove">&times;</button>
        </div>
      `;

      item.querySelector(".queue-item-info").addEventListener("click", () => {
        this.queue.jumpTo(idx);
      });

      item.querySelectorAll(".btn-queue-action").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          if (action === "up") this.queue.move(idx, idx - 1);
          if (action === "down") this.queue.move(idx, idx + 1);
          if (action === "remove") this.queue.removeAt(idx);
        });
      });

      this.elements.queueItems.appendChild(item);
    });
  }

  toggleExpandedPlayer(forceState = null) {
    this.isExpanded = forceState !== null ? forceState : !this.isExpanded;
    this.elements.modalPlayer.style.display = this.isExpanded ? "flex" : "none";
    document.body.classList.toggle("player-expanded-active", this.isExpanded);
  }

  toggleQueuePanel(forceState = null) {
    this.isQueueOpen = forceState !== null ? forceState : !this.isQueueOpen;
    this.elements.queuePanel.style.display = this.isQueueOpen ? "flex" : "none";
    if (this.isQueueOpen) {
      this._renderQueueList();
    }
  }

  _savePlaybackPosition(currentTime) {
    try {
      const current = this.queue.getCurrentSong();
      if (current) {
        localStorage.setItem(
          "portfolio_music_last_state",
          JSON.stringify({
            songId: current._id || current.id,
            currentTime,
            savedAt: Date.now(),
          })
        );
      }
    } catch (_e) {}
  }

  _restoreLastPlayedState() {
    try {
      const saved = localStorage.getItem("portfolio_music_last_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        const current = this.queue.getCurrentSong();
        if (current && (current._id || current.id) === parsed.songId) {
          // Preload track without autoplay
          this.engine.load(current, false, parsed.currentTime);
          this._renderTrackInfo(current);
        } else if (current) {
          this.engine.load(current, false, 0);
          this._renderTrackInfo(current);
        }
      } else {
        const current = this.queue.getCurrentSong();
        if (current) {
          this.engine.load(current, false, 0);
          this._renderTrackInfo(current);
        }
      }
    } catch (_e) {}

    this._updateRepeatUI(this.queue.repeatMode);
    this.elements.shuffleBtn.classList.toggle("active", this.queue.isShuffle);
    this.elements.expandedShuffleBtn.classList.toggle("active", this.queue.isShuffle);
    this._updateQueueBadge();
  }
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

if (typeof window !== "undefined") {
  window.PlayerUI = PlayerUI;
}
