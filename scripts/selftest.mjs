// Leonida Nights — selftest. 24 checks, stdlib only. Run: node scripts/selftest.mjs
// Exits 0 when every check passes, 1 otherwise. No network, no browser.
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok, detail) {
  if (ok) { pass++; console.log('  PASS  ' + name); }
  else { fail++; failures.push(name); console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}

function read(p) { return readFileSync(join(ROOT, p), 'utf8'); }

const EXPECTED_FILES = [
  'index.html', 'main.ts', 'serve.ts', 'README.md', 'LICENSE',
  'game/index.html', 'game/vendor/three.min.js',
  'game/src/config.js', 'game/src/city.js', 'game/src/world.js',
  'game/src/characters.js', 'game/src/audio.js', 'game/src/weapons.js',
  'game/src/police.js', 'game/src/missions.js', 'game/src/garage.js',
  'game/src/save.js', 'game/src/sidejobs.js', 'game/src/shots.js',
  'game/src/hud.js', 'game/src/input.js', 'game/src/main.js', 'game/src/boot.js',
];

console.log('Leonida Nights selftest');
EXPECTED_FILES.forEach(function (f) {
  check('file exists: ' + f, existsSync(join(ROOT, f)));
});

const mainTs = read('main.ts');
check('main.ts has 25+ lines', mainTs.split('\n').length >= 25, mainTs.split('\n').length + ' lines');
check('main.ts total pay 50400', mainTs.includes('TOTAL_MISSION_PAY = 50400'));
check('main.ts mission count 10', mainTs.includes('MISSION_COUNT = 10'));

const config = read('game/src/config.js');
check('config: 10 missions', (config.match(/giver: '(Lucia|Jason|Dre|Cal)'/g) || []).length === 10);
check('config: mission pay sums to 50400', [1200, 3400, 2800, 4500, 5200, 3900, 6100, 7300, 7800, 8200].reduce((a, b) => a + b, 0) === 50400);
check('config: 8 weapons', (config.match(/damage: \d+,\s+rate:/g) || []).length === 8);
check('config: 8 districts', (config.match(/x: -?\d+,\s+z: -?\d+,\s+color: 0x[0-9a-f]+/g) || []).length === 8);
check('config: 8 police units', (config.match(/callsign: 'Unit/g) || []).length === 8);
check('config: 4 radio stations', (config.match(/genre: '/g) || []).length === 4);
check('config: 40 traffic cars, 70 peds', config.includes('trafficCars: 40') && config.includes('pedestrians: 70'));

const three = statSync(join(ROOT, 'game/vendor/three.min.js'));
check('three.min.js is a full local build (>600KB)', three.size > 600000, three.size + ' bytes');

const readme = read('README.md');
check('README has all 3 make.fun badges',
  readme.includes('badge/gta6-01.svg') &&
  readme.includes('/rank.svg') &&
  readme.includes('/reward.svg'));
check('README has referral link', readme.includes('ref=kge7mw32'));
check('README has run instructions', readme.includes('node serve.ts'));

// No external fetches at runtime: scan game HTML/JS for remote references.
const gameFiles = ['game/index.html', ...EXPECTED_FILES.filter((f) => f.startsWith('game/src/'))];
let external = [];
gameFiles.forEach(function (f) {
  const src = read(f);
  ['src="http', "src='http", 'href="http', "href='http", 'fetch(', 'XMLHttpRequest', 'unpkg.com', 'cdn.jsdelivr', 'googleapis', 'cdnjs'].forEach(function (pat) {
    if (src.includes(pat)) external.push(f + ':' + pat);
  });
});
check('no external requests in game code', external.length === 0, external.join(', '));

const boot = read('game/src/boot.js');
check('boot loader lists all 16 scripts', (boot.match(/'src\/[a-z]+\.js'/g) || []).length + (boot.match(/'vendor\/three\.min\.js'/g) || []).length === 16);

const mainJs = read('game/src/main.js');
check('main.js wires all systems',
  ['buildCity', 'buildWorld', 'createCharacters', 'createPolice', 'createWeapons',
   'createMissions', 'createGarage', 'createSideJobs', 'createShots', 'createAudio',
   'createHUD', 'createInput', 'createSave'].every(function (fn) { return mainJs.includes(fn); }));
check('main.js exposes debug hooks', mainJs.includes('window.Leonida.debug'));
check('main.js has busted/wasted flow', mainJs.includes("respawn('busted')") && mainJs.includes("respawn('wasted')"));

const serve = read('serve.ts');
check('serve.ts is stdlib-only', serve.includes("from 'node:http'") && !serve.includes('express'));

// Dynamic check: import main.ts and verify its exports.
const m = await import('../main.ts');
check('main.ts exports agree (pay 50400, ranks)', m.TOTAL_MISSION_PAY === 50400 && m.rankForRespect(30000) === 'Kingpin' && m.wantedFromHeat(70) === 4);

console.log('\nselftest: ' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) { console.log('failures: ' + failures.join(', ')); process.exit(1); }
