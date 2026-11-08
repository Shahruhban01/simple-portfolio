// Playlists & Favorites Manager for Ruhban Abdullah Music Player
// Manages local favorite tracks, recently played history, and playlist helpers

export class PlaylistManager {
  constructor() {
    this.favoritesKey = "portfolio_music_favorites";
    this.recentsKey = "portfolio_music_recents";
    this.favorites = this._loadList(this.favoritesKey);
    this.recents = this._loadList(this.recentsKey);

    this.listeners = new Map();
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
        console.error(`PlaylistManager event error on "${event}":`, err);
      }
    }
  }

  _loadList(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (_e) {
      return [];
    }
  }

  _saveList(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch (_e) {}
  }

  isFavorite(songId) {
    if (!songId) return false;
    return this.favorites.some((s) => (s._id || s.id) === songId);
  }

  toggleFavorite(song) {
    if (!song) return false;
    const songId = song._id || song.id;
    const idx = this.favorites.findIndex((s) => (s._id || s.id) === songId);

    let isFav = false;
    if (idx >= 0) {
      this.favorites.splice(idx, 1);
      isFav = false;
    } else {
      this.favorites.unshift(song);
      isFav = true;
    }

    this._saveList(this.favoritesKey, this.favorites);
    this._emit("favoriteschanged", {
      songId,
      isFavorite: isFav,
      favorites: this.favorites,
    });
    return isFav;
  }

  getFavorites() {
    return [...this.favorites];
  }

  addRecent(song) {
    if (!song) return;
    const songId = song._id || song.id;
    // Remove if already in recents list
    this.recents = this.recents.filter((s) => (s._id || s.id) !== songId);
    // Add to front with timestamp
    this.recents.unshift({
      ...song,
      playedAt: new Date().toISOString(),
    });
    // Keep max 30 recent tracks
    if (this.recents.length > 30) {
      this.recents = this.recents.slice(0, 30);
    }
    this._saveList(this.recentsKey, this.recents);
    this._emit("recentschanged", this.recents);
  }

  getRecents() {
    return [...this.recents];
  }
}

if (typeof window !== "undefined") {
  window.PlaylistManager = PlaylistManager;
}

