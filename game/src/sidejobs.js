// Leonida Nights — side jobs: taxi fares, vigilante hits, courier runs.
// Small repeatable jobs that pay cash and respect between story missions.
// Each job is a short state machine: accept, reach the marker, get paid.
(function () {
  'use strict';

  function createSideJobs(scene, THREE, hooks) {
    var cfg = window.Leonida.config;
    var state = { active: null, done: 0, earned: 0 };

    var marker = null;
    var markerMat = new THREE.MeshBasicMaterial({ color: 0x06d6a0, transparent: true, opacity: 0.85 });

    function makeMarker(pos) {
      clearMarker();
      marker = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 20), markerMat);
      marker.position.set(pos.x, 0.15, pos.z);
      scene.add(marker);
    }

    function clearMarker() {
      if (marker) { scene.remove(marker); marker = null; }
    }

    function randomPoint() {
      var half = cfg.WORLD.size / 2 - 20;
      return { x: (Math.random() - 0.5) * 2 * half, z: (Math.random() - 0.5) * 2 * half };
    }

    function start(id) {
      var def = cfg.SIDE_JOBS.filter(function (j) { return j.id === id; })[0];
      if (!def || state.active) return null;
      state.active = { def: def, target: randomPoint(), startedAt: Date.now() };
      makeMarker(state.active.target);
      if (hooks && hooks.onStart) hooks.onStart(def);
      return state.active;
    }

    function cancel() {
      if (!state.active) return;
      state.active = null;
      clearMarker();
    }

    function step(playerPos) {
      if (!state.active) return 0;
      var t = state.active.target;
      var dx = playerPos.x - t.x;
      var dz = playerPos.z - t.z;
      if (Math.sqrt(dx * dx + dz * dz) < 6) {
        var def = state.active.def;
        var pay = def.pay;
        state.earned += pay;
        state.done++;
        state.active = null;
        clearMarker();
        if (hooks && hooks.onComplete) hooks.onComplete(def, pay);
        return pay;
      }
      return 0;
    }

    return {
      state: state, start: start, cancel: cancel, step: step
    };
  }

  window.Leonida.sidejobs = { createSideJobs: createSideJobs };
})();
