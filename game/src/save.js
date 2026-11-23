// Leonida Nights — saves: localStorage persistence.
// One slot, versioned. Stores cash, respect, mission progress, garage,
// weapons ammo, district standing and the current radio station. A
// corrupt or missing slot simply starts a fresh game — never throws.
(function () {
  'use strict';

  var KEY = 'leonida-nights-save-v1';

  function createSave() {
    function write(data) {
      try {
        var payload = { v: 1, savedAt: Date.now(), data: data };
        localStorage.setItem(KEY, JSON.stringify(payload));
        return true;
      } catch (e) { return false; }
    }

    function read() {
      try {
        var raw = localStorage.getItem(KEY);
        if (!raw) return null;
        var payload = JSON.parse(raw);
        if (!payload || payload.v !== 1 || !payload.data) return null;
        return payload.data;
      } catch (e) { return null; }
    }

    function clear() {
      try { localStorage.removeItem(KEY); return true; } catch (e) { return false; }
    }

    function exists() {
      try { return localStorage.getItem(KEY) !== null; } catch (e) { return false; }
    }

    return { write: write, read: read, clear: clear, exists: exists, key: KEY };
  }

  window.Leonida.save = { createSave: createSave };
})();
