// Leonida Nights — VCPD dispatch: wanted 1-5, named units, roadblocks,
// Police Maverick helicopter, busted / wasted states.
// Wanted rises on crime and decays when the player stays out of sight;
// at 3+ the heli joins; at 5 roadblocks close the main avenues.
(function () {
  'use strict';

  function createPolice(scene, THREE, audio, player) {
    var cfg = window.Leonida.config;
    var state = {
      wanted: 0, heat: 0, busted: false, wasted: false,
      chaseStart: 0, lastSiren: 0
    };
    var group = new THREE.Group();
    group.name = 'police';
    scene.add(group);

    var unitMeshes = [];
    var heli = null;
    var heliLight = null;
    var roadblocks = [];

    function carMesh(color) {
      var g = new THREE.Group();
      var body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 4.4),
        new THREE.MeshLambertMaterial({ color: color }));
      body.position.y = 0.55;
      g.add(body);
      var cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 2.0),
        new THREE.MeshLambertMaterial({ color: 0x111111 }));
      cab.position.set(0, 1.05, -0.2);
      g.add(cab);
      var bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      bar.position.set(0, 1.4, -0.2);
      bar.name = 'lightbar';
      g.add(bar);
      return g;
    }

    function spawnUnit(unitDef, pos) {
      var mesh = carMesh(0x1a1a2e);
      mesh.position.copy(pos);
      mesh.userData.targetRef = {
        kind: 'police', name: unitDef.name, health: 100, dead: false,
        damage: function (n) { this.health -= n; if (this.health <= 0) this.dead = true; }
      };
      group.add(mesh);
      unitMeshes.push({ def: unitDef, mesh: mesh, speed: 11 });
      return mesh;
    }

    function spawnHeli() {
      if (heli) return heli;
      var g = new THREE.Group();
      var body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 7),
        new THREE.MeshLambertMaterial({ color: 0x0f3460 }));
      g.add(body);
      var rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.12, 0.5),
        new THREE.MeshLambertMaterial({ color: 0x222222 }));
      rotor.position.y = 1.1;
      rotor.name = 'rotor';
      g.add(rotor);
      heliLight = new THREE.Mesh(new THREE.ConeGeometry(6, 26, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff8c9, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
      heliLight.position.y = -13;
      heliLight.name = 'spot';
      g.add(heliLight);
      g.position.set(player.position.x + 25, 34, player.position.z - 25);
      group.add(g);
      heli = { mesh: g, rotor: rotor };
      return heli;
    }

    function spawnRoadblock(x, z, rotY) {
      var g = new THREE.Group();
      for (var i = -1; i <= 1; i++) {
        var car = carMesh(0x1a1a2e);
        car.position.set(i * 4.4, 0, 0);
        g.add(car);
      }
      var barrier = new THREE.Mesh(new THREE.BoxGeometry(13, 1.1, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xff9f1c }));
      barrier.position.set(0, 0.55, 2.6);
      g.add(barrier);
      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      group.add(g);
      roadblocks.push(g);
      return g;
    }

    function clearRoadblocks() {
      roadblocks.forEach(function (r) { group.remove(r); });
      roadblocks = [];
    }

    function addHeat(n) {
      if (state.busted || state.wasted) return;
      state.heat += n;
      var next = state.heat >= 90 ? 5 : state.heat >= 60 ? 4 : state.heat >= 35 ? 3 : state.heat >= 15 ? 2 : state.heat >= 4 ? 1 : 0;
      if (next > state.wanted) {
        state.wanted = next;
        state.chaseStart = performance.now();
        if (audio) audio.siren();
        syncForces();
      }
    }

    function syncForces() {
      // Units on the road scale with wanted level.
      var want = state.wanted === 0 ? 0 : state.wanted + 1;
      while (unitMeshes.length < want) {
        var def = cfg.POLICE_UNITS[unitMeshes.length % cfg.POLICE_UNITS.length];
        spawnUnit(def, new THREE.Vector3(
          player.position.x + (Math.random() - 0.5) * 90,
          0, player.position.z + (Math.random() - 0.5) * 90));
      }
      while (unitMeshes.length > want) {
        var u = unitMeshes.pop();
        group.remove(u.mesh);
      }
      if (state.wanted >= 3) spawnHeli();
      else if (heli) { group.remove(heli.mesh); heli = null; }
      clearRoadblocks();
      if (state.wanted >= 5) {
        spawnRoadblock(0, 42, 0);
        spawnRoadblock(0, -42, 0);
        spawnRoadblock(42, 0, Math.PI / 2);
        spawnRoadblock(-42, 0, Math.PI / 2);
      } else if (state.wanted === 4) {
        spawnRoadblock(0, 42, 0);
        spawnRoadblock(0, -42, 0);
      }
    }

    function scrubHeat(n) {
      state.heat = Math.max(0, state.heat - n);
      var next = state.heat >= 90 ? 5 : state.heat >= 60 ? 4 : state.heat >= 35 ? 3 : state.heat >= 15 ? 2 : state.heat >= 4 ? 1 : 0;
      if (next < state.wanted) { state.wanted = next; syncForces(); }
      return state.wanted;
    }

    function bust() {
      state.busted = true;
      if (audio) audio.busted();
    }

    function waste() {
      state.wasted = true;
      if (audio) audio.busted();
    }

    function reset(clearHeat) {
      state.busted = false;
      state.wasted = false;
      if (clearHeat) { state.wanted = 0; state.heat = 0; syncForces(); }
    }

    function step(dt, now) {
      // Heat decays slowly while the player keeps a low profile.
      if (state.wanted > 0 && !state.busted && !state.wasted) {
        state.heat = Math.max(0, state.heat - dt * 0.7);
        var next = state.heat >= 90 ? 5 : state.heat >= 60 ? 4 : state.heat >= 35 ? 3 : state.heat >= 15 ? 2 : state.heat >= 4 ? 1 : 0;
        if (next < state.wanted) { state.wanted = next; syncForces(); }
      }
      // Pursuit units chase the player.
      for (var i = 0; i < unitMeshes.length; i++) {
        var u = unitMeshes[i];
        var to = new THREE.Vector3().subVectors(player.position, u.mesh.position);
        to.y = 0;
        var dist = to.length();
        if (dist > 1) {
          to.normalize();
          u.mesh.position.add(to.multiplyScalar(Math.min(u.speed * dt, dist)));
          u.mesh.rotation.y = Math.atan2(to.x, to.z);
          u.mesh.children.forEach(function (c) {
            if (c.name === 'lightbar') c.material.color.setHex(Math.floor(now / 300) % 2 ? 0xff0000 : 0x2244ff);
          });
          if (dist < 3.5 && !state.busted) bust();
        }
      }
      // Heli circles above the player, spotlight tracking.
      if (heli) {
        var t = now / 1000;
        heli.mesh.position.x = player.position.x + Math.cos(t * 0.4) * 26;
        heli.mesh.position.z = player.position.z + Math.sin(t * 0.4) * 26;
        heli.mesh.position.y = 34 + Math.sin(t * 0.8) * 2;
        heli.rotor.rotation.y = t * 18;
        heli.mesh.lookAt(player.position.x, 0, player.position.z);
      }
      if (audio && state.wanted > 0 && now - state.lastSiren > 9000) {
        state.lastSiren = now;
        audio.siren();
      }
    }

    return {
      state: state, addHeat: addHeat, scrubHeat: scrubHeat,
      bust: bust, waste: waste, reset: reset, step: step,
      get units() { return unitMeshes; }
    };
  }

  window.Leonida.police = { createPolice: createPolice };
})();
