// Leonida Nights — HUD: health, wanted stars, cash, minimap, radio,
// weapon wheel, mission tracker, respect ranks and district standing.
// All DOM, updated from game state every frame. The minimap is a 2D
// canvas that plots the player, mission marker, police and traffic.
(function () {
  'use strict';

  function createHUD(document, hooks) {
    var cfg = window.Leonida.config;
    var root = document.getElementById('hud');
    root.innerHTML =
      '<div id="hud-top"><div id="hud-wanted"></div><div id="hud-cash">$0</div></div>' +
      '<div id="hud-health"><div id="hud-health-bar"></div><span id="hud-health-text">100</span></div>' +
      '<div id="hud-weapon">Pistol</div>' +
      '<div id="hud-radio">Vice FM</div>' +
      '<div id="hud-mission"></div>' +
      '<div id="hud-toast"></div>' +
      '<canvas id="hud-minimap" width="180" height="180"></canvas>' +
      '<div id="hud-wheel" class="hidden"></div>' +
      '<div id="hud-select" class="hidden"></div>' +
      '<div id="hud-status">BUSTED</div>' +
      '<div id="hud-help">WASD drive / walk · E carjack · F fire · 1-8 weapons · Q wheel · M missions · R radio · C character · P pause</div>';

    var els = {
      wanted: document.getElementById('hud-wanted'),
      cash: document.getElementById('hud-cash'),
      healthBar: document.getElementById('hud-health-bar'),
      healthText: document.getElementById('hud-health-text'),
      weapon: document.getElementById('hud-weapon'),
      radio: document.getElementById('hud-radio'),
      mission: document.getElementById('hud-mission'),
      toast: document.getElementById('hud-toast'),
      minimap: document.getElementById('hud-minimap'),
      wheel: document.getElementById('hud-wheel'),
      select: document.getElementById('hud-select'),
      status: document.getElementById('hud-status')
    };
    var mm = els.minimap.getContext('2d');
    var toastTimer = null;

    function toast(msg, ms) {
      els.toast.textContent = msg;
      els.toast.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, ms || 3200);
    }

    function rankFor(respect) {
      var rank = cfg.RANKS[0];
      cfg.RANKS.forEach(function (r) { if (respect >= r.min) rank = r; });
      return rank;
    }

    function update(s) {
      // Wanted stars.
      var stars = '';
      for (var i = 0; i < 5; i++) stars += i < s.wanted ? '★' : '☆';
      els.wanted.textContent = stars;
      els.wanted.className = s.wanted >= 3 ? 'hot' : '';
      els.cash.textContent = '$' + s.cash.toLocaleString('en-US');
      els.healthBar.style.width = Math.max(0, s.health) + '%';
      els.healthBar.style.background = s.health > 50 ? '#06d6a0' : s.health > 25 ? '#ffb703' : '#ef476f';
      els.healthText.textContent = Math.round(s.health);
      els.weapon.textContent = s.weapon + (s.ammo === Infinity ? ' ∞' : ' · ' + s.ammo);
      els.radio.textContent = s.radio;
      var rank = rankFor(s.respect);
      var missionText = s.mission
        ? 'MISSION: ' + s.mission.name + ' — ' + s.mission.objective
        : 'No active mission — press M for mission select';
      els.mission.innerHTML = missionText +
        '<br>Respect: ' + rank.name + ' (' + s.respect + ') · District: ' + s.district;
      els.status.style.display = s.busted ? 'block' : (s.wasted ? 'block' : 'none');
      els.status.textContent = s.busted ? 'BUSTED' : 'WASTED';
      drawMinimap(s);
    }

    function drawMinimap(s) {
      var W = cfg.WORLD.size;
      var scale = 180 / W;
      mm.fillStyle = 'rgba(10, 10, 26, 0.85)';
      mm.fillRect(0, 0, 180, 180);
      mm.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      for (var c = -W / 2; c <= W / 2; c += cfg.WORLD.roadSpacing) {
        var p = (c + W / 2) * scale;
        mm.beginPath(); mm.moveTo(p, 0); mm.lineTo(p, 180); mm.stroke();
        mm.beginPath(); mm.moveTo(0, p); mm.lineTo(180, p); mm.stroke();
      }
      function dot(x, z, color, r) {
        mm.fillStyle = color;
        mm.beginPath();
        mm.arc((x + W / 2) * scale, (z + W / 2) * scale, r || 3, 0, Math.PI * 2);
        mm.fill();
      }
      if (s.missionTarget) dot(s.missionTarget.x, s.missionTarget.z, '#ffd60a', 5);
      (s.police || []).forEach(function (u) { dot(u.x, u.z, '#3a86ff', 3); });
      (s.traffic || []).forEach(function (t) { dot(t.x, t.z, 'rgba(255,255,255,0.5)', 2); });
      dot(s.player.x, s.player.z, '#06d6a0', 4);
    }

    function showWheel(weapons, current, onPick) {
      var html = '<div class="wheel-title">WEAPONS</div>';
      weapons.forEach(function (w, i) {
        html += '<div class="wheel-item' + (i === current ? ' active' : '') + '" data-i="' + i + '">' +
          (i + 1) + ' · ' + w.name + '</div>';
      });
      els.wheel.innerHTML = html;
      els.wheel.classList.remove('hidden');
      els.wheel.querySelectorAll('.wheel-item').forEach(function (el) {
        el.addEventListener('click', function () { onPick(parseInt(el.getAttribute('data-i'), 10)); });
      });
    }

    function hideWheel() { els.wheel.classList.add('hidden'); }

    function showSelect(missions, unlocked, completed, onPick) {
      var html = '<div class="wheel-title">STORY MISSIONS — $50,400 total</div>';
      missions.forEach(function (m) {
        var locked = m.id > unlocked;
        var times = completed[m.id] || 0;
        var pay = times === 0 ? m.pay : Math.floor(m.pay / 2);
        html += '<div class="wheel-item' + (locked ? ' locked' : '') + '" data-i="' + m.id + '">' +
          m.id + '. ' + m.name + ' — $' + pay + (times > 0 ? ' (replay ½)' : '') +
          (locked ? ' 🔒' : '') + '<br><span class="dim">' + m.brief + '</span></div>';
      });
      els.select.innerHTML = html;
      els.select.classList.remove('hidden');
      els.select.querySelectorAll('.wheel-item:not(.locked)').forEach(function (el) {
        el.addEventListener('click', function () { onPick(parseInt(el.getAttribute('data-i'), 10)); });
      });
    }

    function hideSelect() { els.select.classList.add('hidden'); }

    return {
      update: update, toast: toast, showWheel: showWheel, hideWheel: hideWheel,
      showSelect: showSelect, hideSelect: hideSelect, rankFor: rankFor, els: els
    };
  }

  window.Leonida.hud = { createHUD: createHUD };
})();
