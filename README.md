# gta6-vice-city-leonida-nights

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Abdul0204/gta6-vice-city-leonida-nights/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Abdul0204/gta6-vice-city-leonida-nights/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Vice City: Leonida Nights — an open-world crime game for the make.fun "Make GTA 6" bounty: 10 story missions with Lucia Caminos and Jason Duval vs the Viceroys, VCPD dispatch with roadblocks and the Police Maverick helicopter, an 8-weapon wheel, crew abilities, district standing, garage upgrades, carjacking, 40 traffic cars, 70 pedestrians, and 4 radio stations.

## Run it

```sh
node serve.ts
# open http://127.0.0.1:8080/
```

## Controls

WASD drive / walk · E carjack · F fire · 1–8 weapons · Q weapon wheel · M mission select · R radio · C switch character (Lucia / Jason) · Shift sprint / nitro · P pause

## What is inside

- `main.ts` — typed entrypoint (missions, weapons, districts, save shape)
- `game/index.html` — the playable game page
- `game/src/` — config, city, world (traffic + peds), characters, missions, police, weapons, garage, save, side jobs, shots, HUD, input, audio, boot loader
- `game/vendor/three.min.js` — Three.js r158 (local, no CDN at runtime)
- `serve.ts` — stdlib-only static server
- `screenshots/` — frames captured from the live play-test

---

<sub>Entered on [make.fun](https://make.fun/?ref=kge7mw32&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
