// Leonida Nights — story missions: 10 missions, $50,400 total.
// Each mission is a small state machine: go to a marker, do the job,
// get paid. Mission select unlocks missions in order; replays pay half.
// Progress, payouts and respect feed the HUD, the save system and ranks.
(function () {
  'use strict';

  function createMissions(scene, THREE, hooks) {
    var cfg = window.Leonida.config;
    var defs = cfg.MISSIONS;
    var state = {
      unlocked: 1,           // highest mission id available
      active: null,          // mission def currently running
      stage: 0,              // stage inside the active mission
      completed: {},         // id -> times completed
      earned: 0,             // total mission cash earned
      dropsDone: 0
    };

    var marker = null;
    var markerMat = new THREE.MeshBasicMaterial({ color: 0xffd60a, transparent: true, opacity: 0.85 });
    var markerRing = null;

    function makeMarker(pos) {
      clearMarker();
      marker = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.35, 24), markerMat);
      marker.position.set(pos.x, 0.18, pos.z);
      scene.add(marker);
      markerRing = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.14, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0xffd60a }));
      markerRing.rotation.x = Math.PI / 2;
      markerRing.position.set(pos.x, 0.5, pos.z);
      scene.add(markerRing);
    }

    function clearMarker() {
      if (marker) { scene.remove(marker); marker = null; }
      if (markerRing) { scene.remove(markerRing); markerRing = null; }
    }

    function districtPos(id) {
      var d = cfg.DISTRICTS.filter(function (x) { return x.id === id; })[0];
      return d ? { x: d.x, z: d.z } : { x: 0, z: 0 };
    }

    // Where each mission's action happens, derived from its district.
    function missionTarget(def) {
      var p = districtPos(def.district);
      return { x: p.x + 12, z: p.z + 8 };
    }

    function start(id) {
      var def = defs.filter(function (m) { return m.id === id; })[0];
      if (!def) return null;
      if (id > state.unlocked) return null;
      if (state.active) return null;
      state.active = def;
      state.stage = 0;
      state.dropsDone = 0;
      makeMarker(missionTarget(def));
      if (hooks && hooks.onStart) hooks.onStart(def);
      return def;
    }

    function fail() {
      if (!state.active) return;
      var def = state.active;
      state.active = null;
      state.stage = 0;
      clearMarker();
      if (hooks && hooks.onFail) hooks.onFail(def);
    }

    function complete() {
      var def = state.active;
      if (!def) return 0;
      var times = (state.completed[def.id] || 0) + 1;
      state.completed[def.id] = times;
      var pay = times === 1 ? def.pay : Math.floor(def.pay / 2);
      state.earned += pay;
      if (def.id === state.unlocked && state.unlocked < defs.length) state.unlocked++;
      state.active = null;
      state.stage = 0;
      clearMarker();
      if (hooks && hooks.onComplete) hooks.onComplete(def, pay, times);
      return pay;
    }

    // Called every frame: advance stages when the player reaches markers
    // or finishes the mission-specific beat.
    function step(playerPos, now) {
      if (!state.active) return;
      var def = state.active;
      var target = missionTarget(def);
      var dx = playerPos.x - target.x;
      var dz = playerPos.z - target.z;
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (marker) {
        marker.rotation.y = now / 600;
        markerRing.position.y = 0.5 + Math.sin(now / 350) * 0.25;
      }
      // Stage flow per mission family.
      if (state.stage === 0 && dist < 6) {
        state.stage = 1;
        if (hooks && hooks.onStage) hooks.onStage(def, 1);
        // Timed / multi-drop / defense missions resolve via stage timers.
        if (def.id === 3 || def.id === 6) {
          // Courier-style: 3 drops.
          state.dropsDone = 0;
          state.dropAt = now + 4000;
        } else if (def.id === 9) {
          state.wavesLeft = 3;
          state.waveAt = now + 3000;
        } else if (def.id === 2 || def.id === 4 || def.id === 5 || def.id === 7 || def.id === 8 || def.id === 10) {
          // Combat / ambush missions: one beat, then done.
          state.beatAt = now + 5000;
        } else {
          complete();
        }
      } else if (state.stage === 1) {
        if (state.dropAt && now >= state.dropAt) {
          state.dropsDone++;
          state.dropAt = now + 4000;
          if (hooks && hooks.onStage) hooks.onStage(def, 1, state.dropsDone);
          if (state.dropsDone >= 3) complete();
        } else if (state.waveAt && now >= state.waveAt) {
          state.wavesLeft--;
          state.waveAt = now + 4000;
          if (hooks && hooks.onStage) hooks.onStage(def, 1, 3 - state.wavesLeft);
          if (state.wavesLeft <= 0) complete();
        } else if (state.beatAt && now >= state.beatAt) {
          complete();
        }
      }
    }

    function totalPay() {
      return cfg.MISSIONS.reduce(function (s, m) { return s + m.pay; }, 0);
    }

    function serialize() {
      return { unlocked: state.unlocked, completed: state.completed, earned: state.earned };
    }

    function restore(data) {
      if (!data) return;
      state.unlocked = data.unlocked || 1;
      state.completed = data.completed || {};
      state.earned = data.earned || 0;
    }

    return {
      state: state, defs: defs,
      start: start, fail: fail, complete: complete, step: step,
      totalPay: totalPay, serialize: serialize, restore: restore,
      missionTarget: missionTarget
    };
  }

  window.Leonida.missions = { createMissions: createMissions };
})();
