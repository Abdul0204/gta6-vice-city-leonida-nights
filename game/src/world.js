// Leonida Nights — ambient world life: traffic cars and pedestrians.
// Cars follow the road grid; peds wander sidewalks. All movement is
// cheap kinematic steering so 110 agents cost almost nothing.
(function () {
  'use strict';

  var CAR_COLORS = [0xd90429, 0x2b2d42, 0xef8354, 0x8ecae6, 0xffd60a, 0x80b918, 0x9d4edd, 0xe0e1dd];

  function makeCarMesh(THREE, color) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.65, 4.4),
      new THREE.MeshLambertMaterial({ color: color })
    );
    body.position.y = 0.55;
    g.add(body);
    var cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.55, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x182233 })
    );
    cabin.position.set(0, 1.05, -0.2);
    g.add(cabin);
    var wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
    var wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]].forEach(function (p) {
      var w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(p[0], 0.36, p[1]);
      g.add(w);
    });
    var light = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.18, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xfff3b0 })
    );
    light.position.set(0, 0.6, 2.21);
    g.add(light);
    return g;
  }

  function makePedMesh(THREE, seed) {
    var g = new THREE.Group();
    var skin = [0xc68642, 0x8d5524, 0xffdbac, 0xf1c27d][seed % 4];
    var shirt = [0xef476f, 0x06d6a0, 0x118ab2, 0xffd166, 0x9b5de5][seed % 5];
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8),
      new THREE.MeshLambertMaterial({ color: skin }));
    head.position.y = 1.62;
    g.add(head);
    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.4),
      new THREE.MeshLambertMaterial({ color: shirt }));
    torso.position.y = 1.05;
    g.add(torso);
    var legMat = new THREE.MeshLambertMaterial({ color: 0x222831 });
    [-0.18, 0.18].forEach(function (x) {
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.7, 0.3), legMat);
      leg.position.set(x, 0.35, 0);
      leg.name = 'leg';
      g.add(leg);
    });
    return g;
  }

  function buildWorld(scene, THREE) {
    var cfg = window.Leonida.config;
    var W = cfg.WORLD;
    var half = W.size / 2;
    var group = new THREE.Group();
    group.name = 'world';
    var cars = [];
    var peds = [];

    // Road lanes the cars can drive on.
    var lanes = [];
    for (var c = -half; c <= half; c += W.roadSpacing) lanes.push(c);

    function randomLane() { return lanes[Math.floor(Math.random() * lanes.length)]; }

    for (var i = 0; i < W.trafficCars; i++) {
      var mesh = makeCarMesh(THREE, CAR_COLORS[i % CAR_COLORS.length]);
      var vertical = Math.random() > 0.5;
      var lane = randomLane();
      var speed = 6 + Math.random() * 7;
      mesh.position.set(vertical ? lane + (Math.random() > 0.5 ? 1.8 : -1.8) : (Math.random() - 0.5) * W.size,
        0, vertical ? (Math.random() - 0.5) * W.size : lane + (Math.random() > 0.5 ? 1.8 : -1.8));
      mesh.rotation.y = vertical ? (Math.random() > 0.5 ? 0 : Math.PI) : (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
      group.add(mesh);
      cars.push({ mesh: mesh, vertical: vertical, lane: lane, speed: speed, dir: Math.random() > 0.5 ? 1 : -1 });
    }

    for (var j = 0; j < W.pedestrians; j++) {
      var ped = makePedMesh(THREE, j);
      ped.position.set((Math.random() - 0.5) * (W.size - 20), 0, (Math.random() - 0.5) * (W.size - 20));
      ped.rotation.y = Math.random() * Math.PI * 2;
      group.add(ped);
      peds.push({ mesh: ped, speed: 0.8 + Math.random() * 1.1, heading: Math.random() * Math.PI * 2,
        turnAt: 0, walkPhase: Math.random() * 6 });
    }

    scene.add(group);

    function step(dt, time) {
      // Cars: drive along their lane, wrap at the edges.
      for (var i = 0; i < cars.length; i++) {
        var car = cars[i];
        var v = car.speed * car.dir * dt;
        if (car.vertical) {
          car.mesh.position.z += v;
          if (car.mesh.position.z > half + 10) car.mesh.position.z = -half - 10;
          if (car.mesh.position.z < -half - 10) car.mesh.position.z = half + 10;
        } else {
          car.mesh.position.x += v;
          if (car.mesh.position.x > half + 10) car.mesh.position.x = -half - 10;
          if (car.mesh.position.x < -half - 10) car.mesh.position.x = half + 10;
        }
      }
      // Peds: wander, turn at random, legs swing.
      for (var k = 0; k < peds.length; k++) {
        var p = peds[k];
        if (time > p.turnAt) {
          p.heading += (Math.random() - 0.5) * 2.4;
          p.turnAt = time + 2 + Math.random() * 4;
        }
        p.mesh.position.x += Math.sin(p.heading) * p.speed * dt;
        p.mesh.position.z += Math.cos(p.heading) * p.speed * dt;
        if (Math.abs(p.mesh.position.x) > half - 8) p.heading = Math.PI - p.heading;
        if (Math.abs(p.mesh.position.z) > half - 8) p.heading = -p.heading;
        p.mesh.rotation.y = p.heading;
        p.walkPhase += dt * 7;
        var swing = Math.sin(p.walkPhase) * 0.45;
        p.mesh.children.forEach(function (child) {
          if (child.name === 'leg') child.rotation.x = swing * (child.position.x < 0 ? 1 : -1);
        });
      }
    }

    return { group: group, cars: cars, peds: peds, step: step };
  }

  window.Leonida.world = { buildWorld: buildWorld };
})();
