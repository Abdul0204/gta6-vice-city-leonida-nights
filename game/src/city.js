// Leonida Nights — city builder.
// Procedural Vice City: road grid, towers with lit windows, palms,
// street lamps, ocean plane and a gradient dusk sky. Deterministic
// layout from a seeded RNG so the map is identical every run.
(function () {
  'use strict';

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildCity(scene, THREE) {
    var cfg = window.Leonida.config;
    var W = cfg.WORLD;
    var rand = mulberry32(1337);
    var group = new THREE.Group();
    group.name = 'city';

    // Ground slab.
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(W.size * 1.6, W.size * 1.6),
      new THREE.MeshLambertMaterial({ color: 0x1e2b26 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    group.add(ground);

    // Ocean ring on the east + south edges.
    var sea = new THREE.Mesh(
      new THREE.PlaneGeometry(W.size * 1.6, W.size * 0.9),
      new THREE.MeshPhongMaterial({ color: 0x0a4d68, shininess: 120, transparent: true, opacity: 0.92 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(W.size * 0.55, -0.4, 0);
    group.add(sea);

    // Beach strip.
    var beach = new THREE.Mesh(
      new THREE.PlaneGeometry(26, W.size * 1.1),
      new THREE.MeshLambertMaterial({ color: 0xd9c08a })
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(W.size / 2 - 4, 0.02, 0);
    group.add(beach);

    // Roads: grid of dark strips + center dashes.
    var roadMat = new THREE.MeshLambertMaterial({ color: 0x2a2a33 });
    var dashMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
    var half = W.size / 2;
    var roads = [];
    for (var gx = -half; gx <= half; gx += W.roadSpacing) roads.push(gx);
    roads.forEach(function (c) {
      var ns = new THREE.Mesh(new THREE.PlaneGeometry(7, W.size), roadMat);
      ns.rotation.x = -Math.PI / 2; ns.position.set(c, 0.05, 0); group.add(ns);
      var ew = new THREE.Mesh(new THREE.PlaneGeometry(W.size, 7), roadMat);
      ew.rotation.x = -Math.PI / 2; ew.position.set(0, 0.05, c); group.add(ew);
      for (var d = -half + 8; d < half; d += 16) {
        var dash = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3), dashMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(c, 0.08, d); group.add(dash);
      }
    });

    // Buildings: boxes with emissive window texture, taller near Downtown.
    var winCanvas = document.createElement('canvas');
    winCanvas.width = 64; winCanvas.height = 128;
    var wc = winCanvas.getContext('2d');
    wc.fillStyle = '#11131f'; wc.fillRect(0, 0, 64, 128);
    for (var wy = 6; wy < 122; wy += 12) {
      for (var wx = 6; wx < 58; wx += 12) {
        wc.fillStyle = rand() > 0.45 ? '#ffd166' : '#20243a';
        wc.fillRect(wx, wy, 7, 8);
      }
    }
    var winTex = new THREE.CanvasTexture(winCanvas);
    var count = 0;
    for (var bx = -half + 16; bx < half - 10; bx += W.roadSpacing) {
      for (var bz = -half + 16; bz < half - 10; bz += W.roadSpacing) {
        if (Math.abs(bx) < 4 || Math.abs(bz) < 4) continue; // keep road lines clear
        var distC = Math.sqrt(bx * bx + bz * bz);
        var h = 8 + rand() * 26 + Math.max(0, 26 - distC * 0.12);
        var mat = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(0.62 + rand() * 0.12, 0.35, 0.28 + rand() * 0.2),
          emissiveMap: winTex, emissive: 0xffffff, emissiveIntensity: 0.55
        });
        var b = new THREE.Mesh(new THREE.BoxGeometry(16 + rand() * 8, h, 16 + rand() * 8), mat);
        b.position.set(bx + (rand() - 0.5) * 8, h / 2, bz + (rand() - 0.5) * 8);
        group.add(b);
        count++;
        // Roof beacon on the tallest towers.
        if (h > 34) {
          var beacon = new THREE.Mesh(
            new THREE.SphereGeometry(0.7, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff2e63 })
          );
          beacon.position.set(b.position.x, h + 1, b.position.z);
          beacon.name = 'beacon';
          group.add(beacon);
        }
      }
    }

    // Palms along Ocean Drive.
    var trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
    var leafMat = new THREE.MeshLambertMaterial({ color: 0x2fae5f });
    for (var p = -half + 10; p < half; p += 18) {
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 7, 6), trunkMat);
      trunk.position.set(half - 22, 3.5, p);
      group.add(trunk);
      var crown = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.2, 7), leafMat);
      crown.position.set(half - 22, 7.6, p);
      group.add(crown);
    }

    // Street lamps with warm point glow (cheap: emissive spheres only).
    var lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a3 });
    for (var lx = -half; lx <= half; lx += 42) {
      for (var lz = -half; lz <= half; lz += 42) {
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 5),
          new THREE.MeshLambertMaterial({ color: 0x333944 }));
        pole.position.set(lx + 4.5, 2.5, lz + 4.5);
        group.add(pole);
        var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), lampMat);
        bulb.position.set(lx + 4.5, 5.1, lz + 4.5);
        group.add(bulb);
      }
    }

    // Dusk sky dome + sun + moon.
    var skyGeo = new THREE.SphereGeometry(900, 16, 12);
    var skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color(W.skyTop) },
        bottom: { value: new THREE.Color(W.skyBottom) }
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 bottom; void main(){ float h = normalize(vP).y * 0.5 + 0.5; gl_FragColor = vec4(mix(bottom, top, smoothstep(0.0, 0.7, h)), 1.0); }'
    });
    group.add(new THREE.Mesh(skyGeo, skyMat));
    var sun = new THREE.Mesh(new THREE.CircleGeometry(26, 24),
      new THREE.MeshBasicMaterial({ color: 0xff9e5e, fog: false }));
    sun.position.set(-420, 130, -620);
    sun.lookAt(0, 0, 0);
    group.add(sun);

    scene.add(group);
    return { group: group, buildingCount: count, rand: rand };
  }

  window.Leonida.city = { buildCity: buildCity };
})();
