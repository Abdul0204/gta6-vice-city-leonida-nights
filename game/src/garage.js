// Leonida Nights — garage: car upgrades, owned cars, crew abilities.
// Upgrades are bought with mission cash and apply to the player's car:
// armor adds health, nitro is Dre's boost, engine adds top speed, paint
// adds neon underglow. Crew abilities: Dre = nitro, Cal = heat scrub.
(function () {
  'use strict';

  function createGarage() {
    var cfg = window.Leonida.config;
    var state = {
      owned: ['Comet'],
      currentCar: 'Comet',
      upgrades: {},   // upgrade id -> true
      carHealth: 100,
      nitro: 100      // 0-100 charge, refills over time
    };

    var CARS = [
      { id: 'Comet',  name: 'Comet',  top: 26, accel: 14, cost: 0 },
      { id: 'Infernus', name: 'Infernus', top: 32, accel: 17, cost: 8000 },
      { id: 'Cheetah', name: 'Cheetah', top: 30, accel: 16, cost: 5500 },
      { id: 'Sentinel', name: 'Sentinel', top: 24, accel: 12, cost: 3200 }
    ];

    function buyUpgrade(id, cash) {
      var up = cfg.UPGRADES.filter(function (u) { return u.id === id; })[0];
      if (!up || state.upgrades[id]) return { ok: false, reason: 'unavailable' };
      if (cash < up.cost) return { ok: false, reason: 'not enough cash' };
      state.upgrades[id] = true;
      if (id === 'armor') state.carHealth = 150;
      return { ok: true, cost: up.cost, upgrade: up };
    }

    function buyCar(id, cash) {
      var car = CARS.filter(function (c) { return c.id === id; })[0];
      if (!car || state.owned.indexOf(id) >= 0) return { ok: false, reason: 'unavailable' };
      if (cash < car.cost) return { ok: false, reason: 'not enough cash' };
      state.owned.push(id);
      state.currentCar = id;
      return { ok: true, cost: car.cost, car: car };
    }

    function topSpeed() {
      var car = CARS.filter(function (c) { return c.id === state.currentCar; })[0] || CARS[0];
      var top = car.top;
      if (state.upgrades.engine) top *= 1.25;
      return top;
    }

    function hasNitro() { return !!state.upgrades.nitro; }

    // Dre's nitro: drains charge, triples acceleration while held.
    function useNitro(dt) {
      if (!hasNitro() || state.nitro <= 0) return 1;
      state.nitro = Math.max(0, state.nitro - dt * 34);
      return 2.6;
    }

    function rechargeNitro(dt) {
      state.nitro = Math.min(100, state.nitro + dt * 7);
    }

    // Cal's heat scrub: pay cash to cut the wanted level down.
    function scrubHeat(police, cash) {
      var cost = 400 * police.state.wanted;
      if (police.state.wanted === 0) return { ok: false, reason: 'no heat' };
      if (cash < cost) return { ok: false, reason: 'not enough cash' };
      var before = police.state.wanted;
      police.scrubHeat(99);
      return { ok: true, cost: cost, from: before, to: police.state.wanted };
    }

    function serialize() {
      return { owned: state.owned, currentCar: state.currentCar, upgrades: state.upgrades };
    }

    function restore(data) {
      if (!data) return;
      state.owned = data.owned || ['Comet'];
      state.currentCar = data.currentCar || 'Comet';
      state.upgrades = data.upgrades || {};
      if (state.upgrades.armor) state.carHealth = 150;
    }

    return {
      state: state, CARS: CARS,
      buyUpgrade: buyUpgrade, buyCar: buyCar, topSpeed: topSpeed,
      hasNitro: hasNitro, useNitro: useNitro, rechargeNitro: rechargeNitro,
      scrubHeat: scrubHeat, serialize: serialize, restore: restore
    };
  }

  window.Leonida.garage = { createGarage: createGarage };
})();
