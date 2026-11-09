// Audio Engine for Ruhban Abdullah Music Player
// Controls native HTML5 Audio element, HTTP Range streaming, seeking, volume, and playback speed

export class AudioEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = "metadata";
    this.audio.crossOrigin = "anonymous";

    this.currentSong = null;
    this.isPlaying = false;
    this.isLoading = false;
    this.isMuted = false;
    this.volume = 0.85;
    this.playbackRate = 1.0;
    this.duration = 0;
    this.currentTime = 0;

    // Listeners callback registry
    this.listeners = new Map();

    this._loadPreferences();
    this._attachMediaEvents();
    this._setupMediaSession();
  }

  _setupMediaSession() {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler("play", () => this.play());
      navigator.mediaSession.setActionHandler("pause", () => this.pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => this._emit("previoustrack"));
      navigator.mediaSession.setActionHandler("nexttrack", () => this._emit("nexttrack"));
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        const offset = details.seekOffset || 10;
        this.seekRelative(-offset);
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        const offset = details.seekOffset || 10;
        this.seekRelative(offset);
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        this.pause();
        this.seek(0);
      });
    } catch (e) {
      console.warn("MediaSession handler registration notice:", e);
    }
  }

  _updateMediaSessionMetadata(song) {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !song) return;

    try {
      const coverUrl = song.coverArtUrl || (window.MusicApi ? window.MusicApi.getCoverUrl(song._id || song.id) : "");
      const artwork = [];
      if (coverUrl) {
        artwork.push(
          { src: coverUrl, sizes: "96x96", type: "image/jpeg" },
          { src: coverUrl, sizes: "128x128", type: "image/jpeg" },
          { src: coverUrl, sizes: "192x192", type: "image/jpeg" },
          { src: coverUrl, sizes: "256x256", type: "image/jpeg" },
          { src: coverUrl, sizes: "512x512", type: "image/jpeg" }
        );
      } else {
        artwork.push(
          { src: "/favicon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/favicon-512.png", sizes: "512x512", type: "image/png" }
        );
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title || "Personal Track",
        artist: song.artist || "Ruhban Abdullah",
        album: song.album || "Personal Music Library",
        artwork,
      });
    } catch (e) {
      console.warn("MediaSession metadata update notice:", e);
    }
  }

  _updateMediaSessionPlaybackState(state) {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = state;
    } catch (_e) {}
  }

  _updateMediaSessionPositionState() {
    if (
      typeof navigator === "undefined" ||
      !("mediaSession" in navigator) ||
      !("setPositionState" in navigator.mediaSession)
    ) {
      return;
    }
    try {
      if (this.duration > 0 && !isNaN(this.currentTime) && isFinite(this.duration)) {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, this.duration),
          playbackRate: this.playbackRate || 1.0,
          position: Math.max(0, Math.min(this.duration, this.currentTime)),
        });
      }
    } catch (_e) {}
  }

  _loadPreferences() {
    try {
      const savedVol = localStorage.getItem("portfolio_music_vol");
      if (savedVol !== null) {
        this.volume = Math.max(0, Math.min(1, parseFloat(savedVol)));
      }
      const savedMute = localStorage.getItem("portfolio_music_mute");
      if (savedMute !== null) {
        this.isMuted = savedMute === "true";
      }
      const savedRate = localStorage.getItem("portfolio_music_rate");
      if (savedRate !== null) {
        this.playbackRate = parseFloat(savedRate) || 1.0;
      }
    } catch (_e) {
      // Ignore localStorage issues
    }

    this.audio.volume = this.volume;
    this.audio.muted = this.isMuted;
    this.audio.playbackRate = this.playbackRate;
  }

  _savePreferences() {
    try {
      localStorage.setItem("portfolio_music_vol", String(this.volume));
      localStorage.setItem("portfolio_music_mute", String(this.isMuted));
      localStorage.setItem("portfolio_music_rate", String(this.playbackRate));
    } catch (_e) {}
  }

  _attachMediaEvents() {
    this.audio.addEventListener("loadstart", () => {
      this.isLoading = true;
      this._emit("loadstart");
    });

    this.audio.addEventListener("loadedmetadata", () => {
      this.duration = this.audio.duration || (this.currentSong?.duration || 0);
      this.isLoading = false;
      this._updateMediaSessionPositionState();
      this._emit("loadedmetadata", {
        duration: this.duration,
        currentTime: this.audio.currentTime,
      });
    });

    this.audio.addEventListener("canplay", () => {
      this.isLoading = false;
      this._emit("canplay");
    });

    this.audio.addEventListener("play", () => {
      this.isPlaying = true;
      this._updateMediaSessionPlaybackState("playing");
      this._updateMediaSessionPositionState();
      this._emit("play", this.currentSong);
    });

    this.audio.addEventListener("pause", () => {
      this.isPlaying = false;
      this._updateMediaSessionPlaybackState("paused");
      this._emit("pause", this.currentSong);
    });

    this.audio.addEventListener("seeked", () => {
      this._updateMediaSessionPositionState();
      this._emit("seeked", { currentTime: this.audio.currentTime });
    });

    this.audio.addEventListener("timeupdate", () => {
      this.currentTime = this.audio.currentTime;
      // Duration fallback if metadata was late
      if (!this.duration && this.audio.duration) {
        this.duration = this.audio.duration;
      }
      const progress = this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
      this._emit("timeupdate", {
        currentTime: this.currentTime,
        duration: this.duration,
        progress,
      });
    });

    this.audio.addEventListener("progress", () => {
      // Calculate buffered percent for streaming visualization
      let bufferedPercent = 0;
      if (this.audio.buffered && this.audio.buffered.length > 0 && this.duration > 0) {
        try {
          const end = this.audio.buffered.end(this.audio.buffered.length - 1);
          bufferedPercent = Math.min(100, (end / this.duration) * 100);
        } catch (_e) {}
      }
      this._emit("buffered", { bufferedPercent });
    });

    this.audio.addEventListener("ended", () => {
      this.isPlaying = false;
      this._emit("ended", this.currentSong);
    });

    this.audio.addEventListener("waiting", () => {
      this.isLoading = true;
      this._emit("waiting");
    });

    this.audio.addEventListener("error", (e) => {
      this.isLoading = false;
      this.isPlaying = false;
      let msg = "Playback encountered an error.";
      if (this.audio.error) {
        switch (this.audio.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            msg = "Playback was aborted.";
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            msg = "A network error occurred while streaming audio.";
            break;
          case MediaError.MEDIA_ERR_DECODE:
            msg = "The audio playback could not be decoded.";
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            msg = "Audio format or stream is not supported.";
            break;
          default:
            msg = this.audio.error.message || msg;
        }
      }
      this._emit("error", { error: e, message: msg });
    });

    this.audio.addEventListener("volumechange", () => {
      this.volume = this.audio.volume;
      this.isMuted = this.audio.muted;
      this._savePreferences();
      this._emit("volumechange", {
        volume: this.volume,
        isMuted: this.isMuted,
      });
    });

    this.audio.addEventListener("ratechange", () => {
      this.playbackRate = this.audio.playbackRate;
      this._savePreferences();
      this._emit("ratechange", { playbackRate: this.playbackRate });
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const arr = this.listeners.get(event);
    if (!arr) return;
    this.listeners.set(event, arr.filter((cb) => cb !== callback));
  }

  _emit(event, data) {
    const arr = this.listeners.get(event);
    if (!arr) return;
    for (const cb of arr) {
      try {
        cb(data);
      } catch (err) {
        console.error(`AudioEngine event listener error on "${event}":`, err);
      }
    }
  }

  /**
   * Load track and optionally begin playing
   */
  async load(song, autoplay = true, startTime = 0, token = null) {
    if (!song) return;

    this.currentSong = song;
    this.duration = song.duration || 0;
    this.currentTime = startTime || 0;

    const streamUrl = window.MusicApi
      ? window.MusicApi.getStreamUrl(song._id || song.id, token)
      : `/api/music/stream/${song._id || song.id}`;

    // Avoid reloading if exact source is already set
    if (this.audio.src !== streamUrl) {
      this.audio.src = streamUrl;
      this.audio.load();
    }

    if (startTime > 0) {
      this.seek(startTime);
    }

    this._emit("trackloaded", song);
    this._updateMediaSessionMetadata(song);

    if (autoplay) {
      return this.play();
    }
    return Promise.resolve();
  }

  /**
   * Play current audio, respecting browser autoplay restrictions
   */
  async play() {
    if (!this.audio.src) return;

    try {
      this.isLoading = true;
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      this.isPlaying = true;
      this.isLoading = false;
      return true;
    } catch (err) {
      this.isPlaying = false;
      this.isLoading = false;
      if (err.name === "NotAllowedError") {
        console.warn("Autoplay was prevented by browser policy. Awaiting user interaction.");
        this._emit("autoplayblocked", {
          message: "Press Play to start listening.",
        });
      } else {
        console.error("Playback error:", err);
      }
      return false;
    }
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.audio) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  /**
   * Toggle between play and pause
   */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Seek to absolute second
   */
  seek(seconds) {
    if (!this.audio) return;
    const target = Math.max(0, Math.min(this.duration || Infinity, seconds));
    this.audio.currentTime = target;
    this.currentTime = target;
  }

  /**
   * Seek relative to current time (+/- seconds)
   */
  seekRelative(deltaSeconds) {
    this.seek(this.currentTime + deltaSeconds);
  }

  /**
   * Set volume level [0.0, 1.0]
   */
  setVolume(level) {
    const vol = Math.max(0, Math.min(1, level));
    this.volume = vol;
    this.audio.volume = vol;
    if (vol > 0 && this.isMuted) {
      this.isMuted = false;
      this.audio.muted = false;
    }
    this._savePreferences();
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    this.audio.muted = this.isMuted;
    this._savePreferences();
  }

  /**
   * Set playback speed (e.g. 0.5, 0.75, 1.0, 1.25, 1.5, 2.0)
   */
  setPlaybackRate(rate) {
    const validRate = Math.max(0.25, Math.min(3.0, parseFloat(rate) || 1.0));
    this.playbackRate = validRate;
    this.audio.playbackRate = validRate;
    this._savePreferences();
  }

  /**
   * Clean up audio resources
   */
  destroy() {
    this.pause();
    this.audio.src = "";
    this.audio.load();
    this.listeners.clear();
  }
}

if (typeof window !== "undefined") {
  window.AudioEngine = AudioEngine;
}

