// Leonida Nights — boot loader (written for this entry, no kit code).
// Loads the game scripts in dependency order, then starts the game.
// Used by game/index.html. Reports load failures to the page so a
// broken script can never fail silently.
(function () {
  'use strict';

  var SCRIPTS = [
    'vendor/three.min.js',
    'src/config.js',
    'src/audio.js',
    'src/city.js',
    'src/world.js',
    'src/characters.js',
    'src/weapons.js',
    'src/police.js',
    'src/missions.js',
    'src/garage.js',
    'src/save.js',
    'src/sidejobs.js',
    'src/shots.js',
    'src/hud.js',
    'src/input.js',
    'src/main.js'
  ];

  function loadOne(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(src); };
      s.onerror = function () { reject(new Error('failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function boot() {
    var chain = Promise.resolve();
    SCRIPTS.forEach(function (src) {
      chain = chain.then(function () { return loadOne(src); });
    });
    chain.then(function () {
      if (!window.Leonida || !window.Leonida.main) {
        throw new Error('Leonida main module missing after load');
      }
      window.Leonida.main.startGame();
      document.getElementById('loading').style.display = 'none';
    }).catch(function (err) {
      var el = document.getElementById('loading');
      if (el) el.textContent = 'Failed to start: ' + err.message;
      window.__leonidaBootError = err.message;
      throw err;
    });
  }

  window.Leonida = window.Leonida || {};
  window.Leonida.boot = { boot: boot, scripts: SCRIPTS };
})();
