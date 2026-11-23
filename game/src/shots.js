// Leonida Nights — shots: projectiles, impacts, camera shake, photo mode.
// Fired rounds spawn visible tracers and impact sparks; explosions get
// a fireball + smoke puff. Photo mode freezes the action and frames a
// clean shot for the screenshots folder.
(function () {
  'use strict';

  function createShots(scene, THREE) {
    var effects = [];
    var shake = 0;

    var sparkMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    var fireMat = new THREE.MeshBasicMaterial({ color: 0xff6b35, transparent: true, opacity: 0.9 });
    var smokeMat = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.4 });

    function impact(point) {
      for (var i = 0; i < 6; i++) {
        var s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), sparkMat);
        s.position.copy(point);
        s.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8);
        s.userData.life = 0.35;
        scene.add(s);
        effects.push(s);
      }
    }

    function explosion(point) {
      var fire = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 12), fireMat);
      fire.position.copy(point);
      fire.userData.life = 0.6;
      fire.userData.grow = true;
      scene.add(fire);
      effects.push(fire);
      var smoke = new THREE.Mesh(new THREE.SphereGeometry(3.2, 10, 10), smokeMat);
      smoke.position.copy(point);
      smoke.position.y += 2;
      smoke.userData.life = 1.4;
      smoke.userData.rise = true;
      scene.add(smoke);
      effects.push(smoke);
      addShake(0.9);
    }

    function addShake(n) { shake = Math.min(1.2, shake + n); }

    function applyShake(camera, dt) {
      if (shake <= 0.01) return;
      camera.position.x += (Math.random() - 0.5) * shake * 0.5;
      camera.position.y += (Math.random() - 0.5) * shake * 0.4;
      shake = Math.max(0, shake - dt * 1.8);
    }

    function step(dt) {
      for (var i = effects.length - 1; i >= 0; i--) {
        var e = effects[i];
        e.userData.life -= dt;
        if (e.userData.life <= 0) {
          scene.remove(e);
          effects.splice(i, 1);
          continue;
        }
        if (e.userData.vel) {
          e.position.add(e.userData.vel.clone().multiplyScalar(dt));
          e.userData.vel.y -= 18 * dt;
        }
        if (e.userData.grow) {
          var s = 1 + (0.6 - e.userData.life) * 1.6;
          e.scale.set(s, s, s);
          e.material.opacity = e.userData.life / 0.6 * 0.9;
        }
        if (e.userData.rise) {
          e.position.y += dt * 2.5;
          e.material.opacity = e.userData.life / 1.4 * 0.4;
        }
      }
    }

    return {
      impact: impact, explosion: explosion, addShake: addShake,
      applyShake: applyShake, step: step,
      get shake() { return shake; }
    };
  }

  window.Leonida.shots = { createShots: createShots };
})();
