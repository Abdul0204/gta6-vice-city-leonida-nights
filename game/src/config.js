// Leonida Nights — central configuration & static data.
// Everything the other systems read lives here: districts, missions,
// weapons, police units, radio, ranks, prices. No logic, just data.
(function () {
  'use strict';

  var DISTRICTS = [
    { id: 'ocean',   name: 'Ocean Beach',    x: 150,  z: -40,  color: 0x2ec4b6 },
    { id: 'downtown',name: 'Downtown',       x: 0,    z: 0,    color: 0x4361ee },
    { id: 'havana',  name: 'Little Havana',  x: -120, z: 60,   color: 0xf72585 },
    { id: 'port',    name: 'Viceport',       x: -40,  z: -160, color: 0x7209b7 },
    { id: 'starfish',name: 'Starfish Island',x: 60,   z: -120, color: 0x4cc9f0 },
    { id: 'coral',   name: 'Coral Gables',   x: -150, z: -60,  color: 0x80b918 },
    { id: 'malibu',  name: 'Malibu Bay',     x: 120,  z: 120,  color: 0xff9e00 },
    { id: 'leaflinks',name: 'Leaf Links',    x: -60,  z: 150,  color: 0x06d6a0 }
  ];

  // 10 story missions. Payouts sum to exactly $50,400.
  var MISSIONS = [
    { id: 1,  name: 'Welcome to Leonida',  giver: 'Lucia',  pay: 1200,  district: 'downtown',
      brief: 'Meet Lucia at the Downtown garage and pick up the getaway Comet.',
      objective: 'Drive to the Downtown garage marker.' },
    { id: 2,  name: 'Vice Heist',          giver: 'Jason',  pay: 3400,  district: 'port',
      brief: 'Hit the Viceport warehouse. Grab the cash, lose the cops, get out clean.',
      objective: 'Reach the warehouse, take the cash, escape the wanted level.' },
    { id: 3,  name: 'Neon Run',            giver: 'Dre',    pay: 2800,  district: 'ocean',
      brief: 'Dre needs a package run down Ocean Drive before the Viceroys wake up.',
      objective: 'Deliver the package to the Ocean Beach marker in time.' },
    { id: 4,  name: 'The Viceroys',        giver: 'Lucia',  pay: 4500,  district: 'havana',
      brief: 'The Viceroys are moving product through Little Havana. Shut the deal down.',
      objective: 'Take out the Viceroy dealers at the Havana marker.' },
    { id: 5,  name: 'Harbor Lights',       giver: 'Cal',    pay: 5200,  district: 'port',
      brief: 'A shipment is coming into Viceport at midnight. Cal wants it first.',
      objective: 'Intercept the shipment at the docks.' },
    { id: 6,  name: 'Midnight Courier',    giver: 'Dre',    pay: 3900,  district: 'malibu',
      brief: 'Three drops, one night, no questions. The Comet is fueled and waiting.',
      objective: 'Complete all three drops around Malibu Bay.' },
    { id: 7,  name: 'Turbulence',          giver: 'Jason',  pay: 6100,  district: 'starfish',
      brief: 'A Viceroy plane is landing on Starfish Island. Be there when it touches down.',
      objective: 'Ambush the airstrip and secure the cargo.' },
    { id: 8,  name: 'Gold Rush',           giver: 'Lucia',  pay: 7300,  district: 'coral',
      brief: 'A gold convoy is crossing Coral Gables. Lucia has a plan and a tow truck.',
      objective: 'Stop the convoy and take the gold.' },
    { id: 9,  name: 'Storm Surge',         giver: 'Cal',    pay: 7800,  district: 'leaflinks',
      brief: 'The hurricane is coming and so are the Viceroys. Hold the Leaf Links safehouse.',
      objective: 'Defend the safehouse through three waves.' },
    { id: 10, name: 'Leonida Nights',      giver: 'Lucia',  pay: 8200,  district: 'downtown',
      brief: 'One last job. The Viceroy boss is in Downtown tonight. End it.',
      objective: 'Confront the Viceroy boss at the Downtown tower.' }
  ];

  var WEAPONS = [
    { id: 'fist',    name: 'Fist',            damage: 12,  rate: 400, range: 2.2,  ammo: Infinity, auto: false, color: 0xdddddd },
    { id: 'pistol',  name: 'Pistol',          damage: 22,  rate: 280, range: 55,   ammo: 120,      auto: false, color: 0x9aa0a6 },
    { id: 'smg',     name: 'SMG',             damage: 14,  rate: 90,  range: 45,   ammo: 240,      auto: true,  color: 0x5f6368 },
    { id: 'shotgun', name: 'Shotgun',         damage: 65,  rate: 800, range: 22,   ammo: 40,       auto: false, color: 0x8b4513 },
    { id: 'rifle',   name: 'Rifle',           damage: 38,  rate: 140, range: 90,   ammo: 180,      auto: true,  color: 0x37474f },
    { id: 'sniper',  name: 'Sniper Rifle',    damage: 120, rate: 1400,range: 160,  ammo: 24,       auto: false, color: 0x1b5e20 },
    { id: 'rocket',  name: 'Rocket Launcher', damage: 200, rate: 1800,range: 120,  ammo: 8,        auto: false, color: 0xb71c1c },
    { id: 'molotov', name: 'Molotov',         damage: 45,  rate: 900, range: 30,   ammo: 12,       auto: false, color: 0xe65100 }
  ];

  var POLICE_UNITS = [
    { callsign: 'Unit 12', name: 'Rook',   kind: 'patrol' },
    { callsign: 'Unit 7',  name: 'Vega',   kind: 'patrol' },
    { callsign: 'Unit 23', name: 'Hawk',   kind: 'pursuit' },
    { callsign: 'Unit 4',  name: 'Blaze',  kind: 'pursuit' },
    { callsign: 'Unit 31', name: 'Comet',  kind: 'interceptor' },
    { callsign: 'Unit 18', name: 'Falcon', kind: 'interceptor' },
    { callsign: 'Unit 9',  name: 'Storm',  kind: 'roadblock' },
    { callsign: 'Unit 27', name: 'Viper',  kind: 'roadblock' }
  ];

  var RADIO = [
    { id: 'vicefm',  name: 'Vice FM',     genre: 'Synthwave',  bpm: 112 },
    { id: 'neon',    name: 'Neon Waves',  genre: 'Electro',    bpm: 126 },
    { id: 'coral',   name: 'Coral Talk',  genre: 'Talk Radio', bpm: 0 },
    { id: 'ocean',   name: 'Ocean Drive', genre: 'Latin Pop',  bpm: 98 }
  ];

  var RANKS = [
    { id: 'street',  name: 'Street',  min: 0 },
    { id: 'hustler', name: 'Hustler', min: 5000 },
    { id: 'player',  name: 'Player',  min: 15000 },
    { id: 'kingpin', name: 'Kingpin', min: 30000 },
    { id: 'legend',  name: 'Legend',  min: 50000 }
  ];

  var UPGRADES = [
    { id: 'armor',  name: 'Armor Plating', cost: 1500, desc: '+50 vehicle health' },
    { id: 'nitro',  name: 'Nitro Boost',   cost: 2200, desc: 'Dre nitro: hold Shift for boost' },
    { id: 'engine', name: 'Engine Tune',   cost: 3000, desc: '+25% top speed' },
    { id: 'paint',  name: 'Neon Paint',    cost: 800,  desc: 'Custom neon underglow' }
  ];

  var SIDE_JOBS = [
    { id: 'taxi',      name: 'Taxi Fare',      pay: 350,  desc: 'Drive a fare across town.' },
    { id: 'vigilante', name: 'Vigilante',      pay: 600,  desc: 'Take down a wanted Viceroy.' },
    { id: 'courier',   name: 'Courier Run',    pay: 450,  desc: 'Deliver a package, no questions.' }
  ];

  var WORLD = {
    size: 420, roadSpacing: 42, blockSize: 30,
    trafficCars: 40, pedestrians: 70,
    totalMissionPay: 50400, playerStart: { x: 0, z: 40 },
    seaLevel: -1.2, fogColor: 0x1a1033, skyTop: 0x2b1055, skyBottom: 0xff6e7f
  };

  window.Leonida = window.Leonida || {};
  window.Leonida.config = {
    DISTRICTS: DISTRICTS, MISSIONS: MISSIONS, WEAPONS: WEAPONS,
    POLICE_UNITS: POLICE_UNITS, RADIO: RADIO, RANKS: RANKS,
    UPGRADES: UPGRADES, SIDE_JOBS: SIDE_JOBS, WORLD: WORLD
  };
})();
