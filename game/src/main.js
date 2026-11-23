// Leonida Nights — main: boot, render loop, and system wiring.
// Owns the renderer, chase camera, game state (cash / respect /
// district standing / health), the busted-wasted flow, autosave and
// the debug hooks the automated play-test drives.
(function () {
  'use strict';

  function startGame() {
    var THREE = window.THREE;
    var cfg = window.Leonida.config;
    var W = cfg.WORLD;

    var canvas = document.getElementById('game-canvas');
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = false;

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(W.fogColor, 120, 700);
    var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);

    // Dusk lighting: low amber sun + cool ambient.
    var sun = new THREE.DirectionalLight(0xffb37a, 1.1);
    sun.position.set(-180, 220, -120);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x5a5a8a, 1.05));
    var hemi = new THREE.HemisphereLight(0x8a7bff, 0x1a2f23, 0.65);
    scene.add(hemi);

    // Build the world.
    var city = window.Leonida.city.buildCity(scene, THREE);
    var world = window.Leonida.world.buildWorld(scene, THREE);
    var chars = window.Leonida.characters.createCharacters(scene, THREE);
    var audio = window.Leonida.audio.createAudio();
    var shots = window.Leonida.shots.createShots(scene, THREE);
    var garage = window.Leonida.garage.createGarage();
    var saveSys = window.Leonida.save.createSave();
    var hud = window.Leonida.hud.createHUD(document);
    var input = window.Leonida.input.createInput(document, window);
    var police = window.Leonida.police.createPolice(scene, THREE, audio, chars.player);

    var game = {
      cash: 500, respect: 0, health: 100,
      standing: {}, // district id -> 0..100
      paused: false, frames: 0, startedAt: Date.now(),
      over: false
    };
    cfg.DISTRICTS.forEach(function (d) { game.standing[d.id] = 10; });

    // Attach damage targets to peds and traffic cars (for weapon hits).
    function attachTarget(mesh, kind, hp) {
      mesh.userData.targetRef = {
        kind: kind, health: hp, dead: false,
        damage: function (n) {
          this.health -= n;
          if (this.health <= 0 && !this.dead) {
            this.dead = true;
            if (kind === 'ped') { mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.2; }
          }
        }
      };
      return mesh.userData.targetRef;
    }
    world.peds.forEach(function (p) { attachTarget(p.mesh, 'ped', 60); });
    world.cars.forEach(function (c) { attachTarget(c.mesh, 'car', 120); });

    var weapons = window.Leonida.weapons.createWeapons(scene, THREE, audio, function (heat) {
      if (heat > 0) police.addHeat(heat);
    });

    var missions = window.Leonida.missions.createMissions(scene, THREE, {
      onStart: function (def) {
        hud.toast('Mission started: ' + def.name + ' — ' + def.brief);
      },
      onStage: function (def, stage, n) {
        if (def.id === 6 && n) hud.toast('Drop ' + n + ' of 3 delivered.');
        if (def.id === 9 && n) hud.toast('Wave ' + n + ' of 3 cleared.');
      },
      onComplete: function (def, pay, times) {
        game.cash += pay;
        game.respect += 250;
        game.standing[def.district] = Math.min(100, (game.standing[def.district] || 0) + 12);
        audio.cash();
        hud.toast('Mission complete: ' + def.name + ' — +$' + pay + (times > 1 ? ' (replay)' : ''));
        police.scrubHeat(10);
        doSave();
      },
      onFail: function (def) { hud.toast('Mission failed: ' + def.name); }
    });

    var sidejobs = window.Leonida.sidejobs.createSideJobs(scene, THREE, {
      onStart: function (def) { hud.toast('Side job: ' + def.name + ' — ' + def.desc); },
      onComplete: function (def, pay) {
        game.cash += pay;
        game.respect += 50;
        audio.cash();
        hud.toast('Side job done: ' + def.name + ' — +$' + pay);
      }
    });

    // Restore a previous save, if one exists.
    var saved = saveSys.read();
    if (saved) {
      game.cash = saved.cash || 500;
      game.respect = saved.respect || 0;
      game.standing = saved.standing || game.standing;
      if (saved.missions) missions.restore(saved.missions);
      if (saved.garage) garage.restore(saved.garage);
      if (saved.ammo) Object.keys(saved.ammo).forEach(function (k) { weapons.state.ammo[k] = saved.ammo[k]; });
      hud.toast('Save loaded — welcome back to Leonida.');
    }

    function doSave() {
      saveSys.write({
        cash: game.cash, respect: game.respect, standing: game.standing,
        missions: missions.serialize(), garage: garage.serialize(),
        ammo: weapons.state.ammo, station: audio.station ? audio.station.id : 'vicefm'
      });
    }

    function currentDistrict() {
      var p = chars.player.position;
      var best = cfg.DISTRICTS[0], bestD = Infinity;
      cfg.DISTRICTS.forEach(function (d) {
        var dx = p.x - d.x, dz = p.z - d.z;
        var dist = dx * dx + dz * dz;
        if (dist < bestD) { bestD = dist; best = d; }
      });
      return best;
    }

    function respawn(reason) {
      game.health = 100;
      chars.state.health = 100;
      if (reason === 'busted') {
        game.cash = Math.max(0, game.cash - 250);
        hud.toast('BUSTED — VCPD took $250. You walk free… this time.');
      } else {
        game.cash = Math.max(0, game.cash - 400);
        hud.toast('WASTED — you wake up at Ocean Beach hospital, $400 lighter.');
      }
      chars.exitCar();
      chars.player.position.set(150, 0, -20);
      chars.player.rotation.y = 0;
      police.reset(true);
      if (missions.state.active) missions.fail();
      doSave();
    }

    // Input: edge-triggered keys.
    input.on('press', function (k) {
      if (k === 'p') { game.paused = !game.paused; hud.toast(game.paused ? 'Paused' : 'Resumed'); return; }
      if (game.paused) return;
      if (k === 'e') {
        if (chars.state.onFoot) {
          var car = chars.tryCarjack(world.cars);
          if (car) { hud.toast('Carjacked a ' + (car.mesh ? 'ride' : 'car') + ' — drive!'); audio.engineHum(true); }
        } else { chars.exitCar(); }
        return;
      }
      if (k === 'q') {
        hud.showWheel(weapons.defs, weapons.state.current, function (i) {
          weapons.select(i);
          hud.hideWheel();
          hud.toast('Weapon: ' + weapons.currentDef().name);
        });
        return;
      }
      if (k === 'm') {
        hud.showSelect(missions.defs, missions.state.unlocked, missions.state.completed, function (id) {
          hud.hideSelect();
          var def = missions.start(id);
          if (def) hud.toast('Mission started: ' + def.name);
        });
        return;
      }
      if (k === 'r') {
        var st = audio.nextStation();
        hud.toast('Radio: ' + st.name + ' — ' + st.genre);
        return;
      }
      if (k === 'c') {
        var name = chars.switchCharacter(chars.state.character === 'lucia' ? 'jason' : 'lucia');
        hud.toast('Now playing as ' + (name === 'lucia' ? 'Lucia Caminos' : 'Jason Duval'));
        return;
      }
      var num = parseInt(k, 10);
      if (num >= 1 && num <= 8) {
        var w = weapons.select(num - 1);
        if (w) hud.toast('Weapon: ' + w.name);
      }
    });

    // Firing: hold F or mouse.
    var fireCooldownOk = true;
    function tryFire(now) {
      if (!fireCooldownOk) return;
      var origin = chars.player.position.clone();
      origin.y += chars.state.onFoot ? 1.5 : 1.2;
      var dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      var targets = [];
      world.peds.forEach(function (p) { targets.push({ mesh: p.mesh }); });
      police.units.forEach(function (u) { targets.push({ mesh: u.mesh }); });
      world.cars.forEach(function (c) { targets.push({ mesh: c.mesh }); });
      var result = weapons.fire(origin, dir, now, targets);
      if (result && result.hit && result.hit.point) {
        shots.impact(result.hit.point);
        if (result.hit.target && result.hit.target.kind === 'car' && result.hit.target.dead) {
          shots.explosion(result.hit.point);
          police.addHeat(6);
        }
        if (result.hit.target && result.hit.target.kind === 'ped' && result.hit.target.dead) {
          game.respect += 5;
          police.addHeat(3);
        }
        if (result.hit.target && result.hit.target.kind === 'police') police.addHeat(4);
      }
      if (result) shots.addShake(weapons.currentDef().damage > 60 ? 0.5 : 0.15);
    }

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    var clock = new THREE.Clock();
    var lastAutosave = 0;

    function animate() {
      requestAnimationFrame(animate);
      var dt = Math.min(clock.getDelta(), 0.05);
      var now = performance.now();
      if (game.paused) { renderer.render(scene, camera); return; }

      // Movement.
      var inp = input.state;
      if (chars.state.onFoot) {
        chars.movePlayer(inp, dt, W.size / 2 - 6);
      } else {
        var boost = 1;
        if (inp.sprint && garage.hasNitro()) boost = garage.useNitro(dt);
        else garage.rechargeNitro(dt);
        var car = chars.state.inCar;
        if (car) {
          var top = garage.topSpeed() * boost;
          var accel = 0;
          if (inp.forward) accel += 1;
          if (inp.back) accel -= 0.7;
          car.speed = Math.max(-8, Math.min(top, car.speed + accel * 14 * dt));
          if (inp.left) car.mesh.rotation.y += 1.9 * dt * (car.speed >= 0 ? 1 : -1);
          if (inp.right) car.mesh.rotation.y -= 1.9 * dt * (car.speed >= 0 ? 1 : -1);
          var dir = car.mesh.rotation.y;
          car.mesh.position.x += Math.sin(dir) * car.speed * dt;
          car.mesh.position.z += Math.cos(dir) * car.speed * dt;
          var half = W.size / 2;
          car.mesh.position.x = Math.max(-half, Math.min(half, car.mesh.position.x));
          car.mesh.position.z = Math.max(-half, Math.min(half, car.mesh.position.z));
          chars.player.position.copy(car.mesh.position);
        }
      }

      // Firing.
      if ((inp.fire || inp.mouseDown) && chars.state.onFoot) tryFire(now);

      // Systems.
      world.step(dt, now / 1000);
      police.step(dt, now);
      missions.step(chars.player.position, now);
      sidejobs.step(chars.player.position);
      weapons.step(now);
      shots.step(dt);

      // Health regen when not wanted.
      if (police.state.wanted === 0 && game.health < 100) game.health = Math.min(100, game.health + dt * 2);

      // Busted / wasted.
      if (police.state.busted) { police.reset(false); respawn('busted'); }
      if (game.health <= 0 && !game.over) { police.reset(false); respawn('wasted'); }

      // Chase camera.
      var heading = chars.state.onFoot ? chars.state.heading : (chars.state.inCar ? chars.state.inCar.mesh.rotation.y : 0);
      var dist = chars.state.onFoot ? 9 : 13;
      var height = chars.state.onFoot ? 4.2 : 5.6;
      var px = chars.player.position.x;
      var pz = chars.player.position.z;
      var cx = px - Math.sin(heading) * dist;
      var cz = pz - Math.cos(heading) * dist;
      camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 5);
      camera.position.y += (height - camera.position.y) * Math.min(1, dt * 5);
      camera.position.z += (cz - camera.position.z) * Math.min(1, dt * 5);
      camera.lookAt(px + Math.sin(heading) * 6, 1.6, pz + Math.cos(heading) * 6);
      shots.applyShake(camera, dt);

      // HUD.
      var district = currentDistrict();
      hud.update({
        wanted: police.state.wanted, cash: game.cash, health: game.health,
        weapon: weapons.currentDef().name, ammo: weapons.state.ammo[weapons.currentDef().id],
        radio: audio.station ? audio.station.name : 'Vice FM',
        mission: missions.state.active, respect: game.respect,
        district: district.name + ' (' + Math.round(game.standing[district.id] || 0) + ')',
        busted: police.state.busted, wasted: game.health <= 0,
        player: { x: px, z: pz },
        missionTarget: missions.state.active ? missions.missionTarget(missions.state.active) : null,
        police: police.units.map(function (u) { return { x: u.mesh.position.x, z: u.mesh.position.z }; }),
        traffic: world.cars.slice(0, 12).map(function (c) { return { x: c.mesh.position.x, z: c.mesh.position.z }; })
      });

      if (now - lastAutosave > 30000) { lastAutosave = now; doSave(); }
      renderer.render(scene, camera);
      game.frames++;
      if (game.frames === 1) window.Leonida.ready = true;
    }

    // Debug hooks for the automated play-test.
    window.Leonida.game = game;
    window.Leonida.debug = {
      state: function () {
        return {
          frames: game.frames, cash: game.cash, respect: game.respect,
          health: game.health, wanted: police.state.wanted,
          mission: missions.state.active ? missions.state.active.id : null,
          unlocked: missions.state.unlocked,
          completed: missions.state.completed,
          player: { x: chars.player.position.x, z: chars.player.position.z },
          weapon: weapons.currentDef().name,
          district: currentDistrict().name
        };
      },
      teleport: function (x, z) {
        chars.exitCar();
        chars.player.position.set(x, 0, z);
      },
      startMission: function (id) {
        // Debug hook unlocks the mission first so the play-test can
        // exercise any mission; normal play still locks via M menu.
        missions.state.unlocked = Math.max(missions.state.unlocked, id);
        return missions.start(id);
      },
      setWanted: function (n) {
        if (n <= 0) { police.scrubHeat(99); return police.state.wanted; }
        police.state.heat = n * 20;
        police.addHeat(0);
        return police.state.wanted;
      },
      setCash: function (n) { game.cash = n; },
      selectWeapon: function (i) { return weapons.select(i); },
      fire: function () { tryFire(performance.now()); },
      carjack: function () {
        var c = chars.tryCarjack(world.cars);
        return c ? { ok: true, lane: c.lane, speed: Math.round(c.speed * 10) / 10 } : null;
      },
      nearestCar: function () {
        var best = null, bestD = Infinity;
        world.cars.forEach(function (c) {
          var d = c.mesh.position.distanceTo(chars.player.position);
          if (d < bestD) { bestD = d; best = c; }
        });
        return best ? { x: best.mesh.position.x, z: best.mesh.position.z, dist: bestD } : null;
      },
      setInput: function (patch) { input.setSynthetic(patch); },
      press: function (k) { input.pressSynthetic(k); },
      counts: function () {
        return { buildings: city.buildingCount, cars: world.cars.length, peds: world.peds.length,
          missions: cfg.MISSIONS.length, weapons: cfg.WEAPONS.length, districts: cfg.DISTRICTS.length };
      }
    };

    // Start position + first radio.
    chars.player.position.set(W.playerStart.x, 0, W.playerStart.z);
    camera.position.set(0, 5, 52);
    animate();
    return { game: game, missions: missions, police: police, weapons: weapons };
  }

  window.Leonida.main = { startGame: startGame };
})();
