// Leonida Nights — characters: Lucia & Jason, player movement, carjacking.
// Humanoids are built from simple primitives so they read clearly at
// distance and cost almost nothing. The player drives on foot or in a
// commandeered car; entering a car is a one-key carjack.
(function () {
  'use strict';

  function makeHumanoid(THREE, opts) {
    var g = new THREE.Group();
    var skin = new THREE.MeshLambertMaterial({ color: opts.skin });
    var cloth = new THREE.MeshLambertMaterial({ color: opts.shirt });
    var pants = new THREE.MeshLambertMaterial({ color: opts.pants });
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), skin);
    head.position.y = 1.66;
    g.add(head);
    var hair = new THREE.Mesh(new THREE.SphereGeometry(0.31, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshLambertMaterial({ color: opts.hair }));
    hair.position.y = 1.72;
    g.add(hair);
    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.85, 0.42), cloth);
    torso.position.y = 1.08;
    g.add(torso);
    var armGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    var armL = new THREE.Mesh(armGeo, skin); armL.position.set(-0.48, 1.08, 0); armL.name = 'armL'; g.add(armL);
    var armR = new THREE.Mesh(armGeo, skin); armR.position.set(0.48, 1.08, 0); armR.name = 'armR'; g.add(armR);
    var legGeo = new THREE.BoxGeometry(0.28, 0.75, 0.3);
    var legL = new THREE.Mesh(legGeo, pants); legL.position.set(-0.19, 0.38, 0); legL.name = 'legL'; g.add(legL);
    var legR = new THREE.Mesh(legGeo, pants); legR.position.set(0.19, 0.38, 0); legR.name = 'legR'; g.add(legR);
    return g;
  }

  function createCharacters(scene, THREE) {
    var cfg = window.Leonida.config;
    var group = new THREE.Group();
    group.name = 'characters';

    var lucia = makeHumanoid(THREE, { skin: 0xc68642, shirt: 0xe63946, pants: 0x1d3557, hair: 0x1a1a1a });
    lucia.position.set(2.5, 0, 40);
    lucia.name = 'lucia';
    group.add(lucia);

    var jason = makeHumanoid(THREE, { skin: 0xffdbac, shirt: 0x2a9d8f, pants: 0x264653, hair: 0x6b4226 });
    jason.position.set(-2.5, 0, 40);
    jason.name = 'jason';
    group.add(jason);

    // The player IS Lucia by default; switching to Jason is a crew choice.
    var player = lucia;
    var playerState = {
      character: 'lucia', onFoot: true, speed: 0, heading: 0,
      health: 100, armor: 0, inCar: null, walkPhase: 0
    };

    scene.add(group);

    function switchCharacter(name) {
      if (name === 'jason') { player = jason; playerState.character = 'jason'; }
      else { player = lucia; playerState.character = 'lucia'; }
      return playerState.character;
    }

    function movePlayer(input, dt, bounds) {
      var mesh = player;
      var moving = false;
      var turnSpeed = 2.6;
      if (input.left) { playerState.heading += turnSpeed * dt; moving = true; }
      if (input.right) { playerState.heading -= turnSpeed * dt; moving = true; }
      var fwd = 0;
      if (input.forward) fwd += 1;
      if (input.back) fwd -= 0.55;
      var speed = playerState.onFoot ? (input.sprint ? 9 : 5.2) : 0;
      if (fwd !== 0) {
        moving = true;
        mesh.position.x += Math.sin(playerState.heading) * speed * fwd * dt;
        mesh.position.z += Math.cos(playerState.heading) * speed * fwd * dt;
      }
      mesh.position.x = Math.max(-bounds, Math.min(bounds, mesh.position.x));
      mesh.position.z = Math.max(-bounds, Math.min(bounds, mesh.position.z));
      mesh.rotation.y = playerState.heading + Math.PI;
      if (moving && fwd !== 0) {
        playerState.walkPhase += dt * 9;
        var swing = Math.sin(playerState.walkPhase) * 0.5;
        mesh.children.forEach(function (c) {
          if (c.name === 'legL') c.rotation.x = swing;
          if (c.name === 'legR') c.rotation.x = -swing;
          if (c.name === 'armL') c.rotation.x = -swing * 0.7;
          if (c.name === 'armR') c.rotation.x = swing * 0.7;
        });
      }
      return moving;
    }

    // Carjack: take the nearest traffic car within 4 units.
    function tryCarjack(cars) {
      if (!playerState.onFoot) return null;
      var best = null, bestD = 4;
      for (var i = 0; i < cars.length; i++) {
        var d = cars[i].mesh.position.distanceTo(player.position);
        if (d < bestD) { bestD = d; best = cars[i]; }
      }
      if (best) {
        playerState.onFoot = false;
        playerState.inCar = best;
        player.visible = false;
        return best;
      }
      return null;
    }

    function exitCar() {
      if (playerState.onFoot) return false;
      var car = playerState.inCar;
      playerState.inCar = null;
      playerState.onFoot = true;
      player.position.copy(car.mesh.position);
      player.position.x += 3;
      player.visible = true;
      return true;
    }

    function driveCar(input, dt) {
      var car = playerState.inCar;
      if (!car) return;
      var accel = 0;
      if (input.forward) accel += 1;
      if (input.back) accel -= 0.7;
      car.speed = Math.max(-8, Math.min(26, car.speed + accel * 14 * dt));
      if (input.left) car.mesh.rotation.y += 1.9 * dt * (car.speed >= 0 ? 1 : -1);
      if (input.right) car.mesh.rotation.y -= 1.9 * dt * (car.speed >= 0 ? 1 : -1);
      var dir = car.mesh.rotation.y;
      car.mesh.position.x += Math.sin(dir) * car.speed * dt;
      car.mesh.position.z += Math.cos(dir) * car.speed * dt;
      var half = window.Leonida.config.WORLD.size / 2;
      car.mesh.position.x = Math.max(-half, Math.min(half, car.mesh.position.x));
      car.mesh.position.z = Math.max(-half, Math.min(half, car.mesh.position.z));
      player.position.copy(car.mesh.position);
    }

    return {
      group: group, lucia: lucia, jason: jason,
      get player() { return player; },
      state: playerState,
      switchCharacter: switchCharacter, movePlayer: movePlayer,
      tryCarjack: tryCarjack, exitCar: exitCar, driveCar: driveCar
    };
  }

  window.Leonida.characters = { createCharacters: createCharacters, makeHumanoid: makeHumanoid };
})();
