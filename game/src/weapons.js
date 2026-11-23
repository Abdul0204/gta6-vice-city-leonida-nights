// Leonida Nights — weapons: 8-weapon wheel, firing, ammo, hit detection.
// The wheel is a radial DOM overlay (keys 1-8 or Q to cycle). Firing
// raycasts from the camera; hits on peds, cars or police reduce health
// and raise the wanted level. Ammo is per-weapon and persists in saves.
(function () {
  'use strict';

  function createWeapons(scene, THREE, audio, onCrime) {
    var cfg = window.Leonida.config;
    var defs = cfg.WEAPONS;
    var state = {
      current: 1, // start with Pistol
      ammo: {},
      lastShot: 0,
      kills: 0
    };
    defs.forEach(function (w) { state.ammo[w.id] = w.ammo; });

    var tracers = [];
    var tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe66d });
    var muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd60a, transparent: true, opacity: 0 })
    );
    scene.add(muzzle);

    function currentDef() { return defs[state.current]; }

    function select(index) {
      if (index < 0 || index >= defs.length) return null;
      state.current = index;
      return defs[index];
    }

    function cycle(dir) {
      var next = (state.current + dir + defs.length) % defs.length;
      return select(next);
    }

    function canFire(now) {
      var def = currentDef();
      if (now - state.lastShot < def.rate) return false;
      if (state.ammo[def.id] !== Infinity && state.ammo[def.id] <= 0) return false;
      return true;
    }

    // Fire from the player toward the camera aim point. Returns hit info.
    function fire(origin, direction, now, targets) {
      var def = currentDef();
      if (!canFire(now)) return null;
      state.lastShot = now;
      if (state.ammo[def.id] !== Infinity) state.ammo[def.id]--;
      if (audio) audio.gunshot();
      muzzle.position.copy(origin).add(direction.clone().multiplyScalar(1.4));
      muzzle.material.opacity = 0.95;
      setTimeout(function () { muzzle.material.opacity = 0; }, 60);

      // Tracer line.
      var end = origin.clone().add(direction.clone().multiplyScalar(def.range));
      var tracer = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, def.range), tracerMat);
      tracer.position.copy(origin).add(direction.clone().multiplyScalar(def.range / 2));
      tracer.lookAt(end);
      scene.add(tracer);
      tracers.push({ mesh: tracer, born: now });
      setTimeout(function () { scene.remove(tracer); }, 90);

      // Hit test against target meshes (peds / police / cars).
      var hit = null;
      var ray = new THREE.Raycaster(origin, direction, 0.1, def.range);
      var meshes = [];
      (targets || []).forEach(function (t) { if (t.mesh) meshes.push(t.mesh); });
      var hits = ray.intersectObjects(meshes, true);
      if (hits.length > 0) {
        var obj = hits[0].object;
        while (obj && !obj.userData.targetRef) obj = obj.parent;
        hit = { point: hits[0].point, distance: hits[0].distance, target: obj ? obj.userData.targetRef : null };
        if (hit.target && hit.target.damage) {
          hit.target.damage(def.damage);
          state.kills += hit.target.dead ? 1 : 0;
        }
      }
      if (onCrime) onCrime(def.id === 'fist' ? 0 : 1);
      return { def: def, hit: hit, ammoLeft: state.ammo[def.id] };
    }

    function step(now) {
      // Tracers fade out on their own via timeout; nothing per-frame needed.
      void now;
    }

    function addAmmo(id, n) {
      if (state.ammo[id] === Infinity) return Infinity;
      state.ammo[id] = Math.min(state.ammo[id] + n, 999);
      return state.ammo[id];
    }

    function resetAmmo() {
      defs.forEach(function (w) { state.ammo[w.id] = w.ammo; });
    }

    return {
      state: state, defs: defs,
      currentDef: currentDef, select: select, cycle: cycle,
      fire: fire, step: step, addAmmo: addAmmo, resetAmmo: resetAmmo
    };
  }

  window.Leonida.weapons = { createWeapons: createWeapons };
})();
