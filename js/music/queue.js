// Queue Manager for Ruhban Abdullah Music Player
// Manages playback queue, track sequencing, shuffle, repeat, and persistence

export class QueueManager {
  constructor() {
    this.queue = [];
    this.originalQueue = []; // preserves original order when shuffle is active
    this.currentIndex = -1;
    this.isShuffle = false;
    this.repeatMode = "off"; // "off" | "all" | "one"

    this.listeners = new Map();
    this.restore();
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
        console.error(`QueueManager error on "${event}":`, err);
      }
    }
  }

  getCurrentSong() {
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      return this.queue[this.currentIndex];
    }
    return null;
  }

  getUpcomingSongs() {
    if (this.currentIndex < 0) return [...this.queue];
    return this.queue.slice(this.currentIndex + 1);
  }

  /**
   * Replace queue with a new song list and set current song
   */
  setQueue(songs, startIndex = 0) {
    this.queue = Array.isArray(songs) ? [...songs] : [];
    this.originalQueue = [...this.queue];
    this.currentIndex = Math.max(0, Math.min(this.queue.length - 1, startIndex));

    if (this.isShuffle) {
      this._applyShuffle();
    }

    this._save();
    this._emit("queuechanged", {
      queue: this.queue,
      currentIndex: this.currentIndex,
      currentSong: this.getCurrentSong(),
    });
  }

  /**
   * Add song to play next (immediately after current song)
   */
  addNext(song) {
    if (!song) return;
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      this.queue.splice(this.currentIndex + 1, 0, song);
      this.originalQueue.push(song);
    } else {
      this.queue.push(song);
      this.originalQueue.push(song);
      this.currentIndex = 0;
    }
    this._save();
    this._emit("queuechanged", {
      queue: this.queue,
      currentIndex: this.currentIndex,
      currentSong: this.getCurrentSong(),
    });
  }

  /**
   * Append song to end of queue
   */
  addToQueue(song) {
    if (!song) return;
    this.queue.push(song);
    this.originalQueue.push(song);
    if (this.currentIndex === -1) {
      this.currentIndex = 0;
    }
    this._save();
    this._emit("queuechanged", {
      queue: this.queue,
      currentIndex: this.currentIndex,
      currentSong: this.getCurrentSong(),
    });
  }

  /**
   * Remove song at specific index
   */
  removeAt(index) {
    if (index < 0 || index >= this.queue.length) return;
    const isCurrent = index === this.currentIndex;

    this.queue.splice(index, 1);

    if (this.queue.length === 0) {
      this.currentIndex = -1;
    } else if (index < this.currentIndex) {
      this.currentIndex -= 1;
    } else if (isCurrent && this.currentIndex >= this.queue.length) {
      this.currentIndex = this.queue.length - 1;
    }

    this._save();
    this._emit("queuechanged", {
      queue: this.queue,
      currentIndex: this.currentIndex,
      currentSong: this.getCurrentSong(),
    });

    if (isCurrent) {
      this._emit("currentsongchanged", this.getCurrentSong());
    }
  }

  /**
   * Reorder queued songs (fromIndex to toIndex)
   */
  move(fromIndex, toIndex) {
    if (
      fromIndex < 0 ||
      fromIndex >= this.queue.length ||
      toIndex < 0 ||
      toIndex >= this.queue.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const currentSong = this.getCurrentSong();
    const item = this.queue.splice(fromIndex, 1)[0];
    this.queue.splice(toIndex, 0, item);

    // Update currentIndex to follow current track
    if (currentSong) {
      this.currentIndex = this.queue.findIndex(
        (s) => (s._id || s.id) === (currentSong._id || currentSong.id)
      );
    }

    this._save();
    this._emit("queuechanged", {
      queue: this.queue,
      currentIndex: this.currentIndex,
      currentSong: this.getCurrentSong(),
    });
  }

  /**
   * Clear queue (keeps current song if desired)
   */
  clear(keepCurrent = true) {
    const current = this.getCurrentSong();
    if (keepCurrent && current) {
      this.queue = [current];
      this.originalQueue = [current];
      this.currentIndex = 0;
    } else {
      this.queue = [];
      this.originalQueue = [];
      this.currentIndex = -1;
    }
    this._save();
    this._emit("queuechanged", {
      queue: this.queue,
      currentIndex: this.currentIndex,
      currentSong: this.getCurrentSong(),
    });
  }

  /**
   * Jump to specific index
   */
  jumpTo(index) {
    if (index >= 0 && index < this.queue.length) {
      this.currentIndex = index;
      this._save();
      const song = this.getCurrentSong();
      this._emit("currentsongchanged", song);
      return song;
    }
    return null;
  }

  /**
   * Move to next song respecting repeat mode and queue end
   */
  next() {
    if (this.queue.length === 0) return null;

    if (this.repeatMode === "one") {
      // Repeat current song
      const song = this.getCurrentSong();
      this._emit("currentsongchanged", song);
      return song;
    }

    if (this.currentIndex < this.queue.length - 1) {
      this.currentIndex += 1;
      this._save();
      const song = this.getCurrentSong();
      this._emit("currentsongchanged", song);
      return song;
    }

    if (this.repeatMode === "all") {
      this.currentIndex = 0;
      this._save();
      const song = this.getCurrentSong();
      this._emit("currentsongchanged", song);
      return song;
    }

    // End of queue with repeat "off"
    this._emit("queueended");
    return null;
  }

  /**
   * Move to previous song
   */
  previous() {
    if (this.queue.length === 0) return null;

    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
      this._save();
      const song = this.getCurrentSong();
      this._emit("currentsongchanged", song);
      return song;
    }

    // If at start and repeat all is on, jump to last song
    if (this.repeatMode === "all") {
      this.currentIndex = this.queue.length - 1;
      this._save();
      const song = this.getCurrentSong();
      this._emit("currentsongchanged", song);
      return song;
    }

    const song = this.getCurrentSong();
    this._emit("currentsongchanged", song);
    return song;
  }

  /**
   * Toggle shuffle mode
   */
  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    if (this.isShuffle) {
      this._applyShuffle();
    } else {
      this._restoreOriginalOrder();
    }
    this._save();
    this._emit("shufflechanged", this.isShuffle);
    this._emit("queuechanged", {
      queue: this.queue,
      currentIndex: this.currentIndex,
      currentSong: this.getCurrentSong(),
    });
    return this.isShuffle;
  }

  _applyShuffle() {
    if (this.queue.length <= 1) return;
    const currentSong = this.getCurrentSong();

    // Separate current song and upcoming/past songs
    const others = this.queue.filter(
      (s) => (s._id || s.id) !== (currentSong?._id || currentSong?.id)
    );

    // Fisher-Yates shuffle
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }

    if (currentSong) {
      this.queue = [currentSong, ...others];
      this.currentIndex = 0;
    } else {
      this.queue = others;
      this.currentIndex = 0;
    }
  }

  _restoreOriginalOrder() {
    const currentSong = this.getCurrentSong();
    this.queue = [...this.originalQueue];
    if (currentSong) {
      this.currentIndex = this.queue.findIndex(
        (s) => (s._id || s.id) === (currentSong._id || currentSong.id)
      );
      if (this.currentIndex === -1) this.currentIndex = 0;
    }
  }

  /**
   * Cycle repeat mode: "off" -> "all" -> "one" -> "off"
   */
  cycleRepeat() {
    if (this.repeatMode === "off") {
      this.repeatMode = "all";
    } else if (this.repeatMode === "all") {
      this.repeatMode = "one";
    } else {
      this.repeatMode = "off";
    }
    this._save();
    this._emit("repeatchanged", this.repeatMode);
    return this.repeatMode;
  }

  _save() {
    try {
      localStorage.setItem("portfolio_music_queue", JSON.stringify(this.queue.slice(0, 50)));
      localStorage.setItem("portfolio_music_curr_idx", String(this.currentIndex));
      localStorage.setItem("portfolio_music_shuffle", String(this.isShuffle));
      localStorage.setItem("portfolio_music_repeat", this.repeatMode);
    } catch (_e) {}
  }

  restore() {
    try {
      const savedQueue = localStorage.getItem("portfolio_music_queue");
      if (savedQueue) {
        this.queue = JSON.parse(savedQueue);
        this.originalQueue = [...this.queue];
      }
      const savedIdx = localStorage.getItem("portfolio_music_curr_idx");
      if (savedIdx !== null) {
        this.currentIndex = parseInt(savedIdx, 10);
      }
      const savedShuffle = localStorage.getItem("portfolio_music_shuffle");
      if (savedShuffle !== null) {
        this.isShuffle = savedShuffle === "true";
      }
      const savedRepeat = localStorage.getItem("portfolio_music_repeat");
      if (savedRepeat) {
        this.repeatMode = savedRepeat;
      }
    } catch (_e) {}
  }
}

if (typeof window !== "undefined") {
  window.QueueManager = QueueManager;
}

