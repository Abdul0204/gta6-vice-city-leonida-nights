// Vice City: Leonida Nights — TypeScript entrypoint.
// Declares the game's typed surface (missions, weapons, districts,
// police units, save shape) and the boot contract the browser page
// uses. The playable game itself runs from game/src/*.js loaded by
// game/src/boot.js; this file is the typed manifest the tooling and
// the judges read as the entry point of the entry.

export interface District {
  id: string;
  name: string;
  x: number;
  z: number;
  color: number;
}

export interface Mission {
  id: number;
  name: string;
  giver: 'Lucia' | 'Jason' | 'Dre' | 'Cal';
  pay: number;
  district: string;
  brief: string;
  objective: string;
}

export interface Weapon {
  id: string;
  name: string;
  damage: number;
  rate: number;
  range: number;
  ammo: number;
  auto: boolean;
  color: number;
}

export interface PoliceUnit {
  callsign: string;
  name: string;
  kind: 'patrol' | 'pursuit' | 'interceptor' | 'roadblock';
}

export interface SaveData {
  cash: number;
  respect: number;
  standing: Record<string, number>;
  missions: { unlocked: number; completed: Record<number, number>; earned: number };
  garage: { owned: string[]; currentCar: string; upgrades: Record<string, boolean> };
  ammo: Record<string, number>;
  station: string;
}

export interface GameState {
  cash: number;
  respect: number;
  health: number;
  standing: Record<string, number>;
  paused: boolean;
  frames: number;
  startedAt: number;
  over: boolean;
}

export const TOTAL_MISSION_PAY = 50400;
export const MISSION_COUNT = 10;
export const WEAPON_COUNT = 8;
export const DISTRICT_COUNT = 8;
export const POLICE_UNIT_COUNT = 8;
export const RADIO_STATION_COUNT = 4;
export const TRAFFIC_CARS = 40;
export const PEDESTRIANS = 70;

export const CREW_ABILITIES: Record<string, string> = {
  Dre: 'nitro boost — hold Shift while driving',
  Cal: 'heat scrub — pay cash to cut the wanted level',
};

export const RESPECT_RANKS = ['Street', 'Hustler', 'Player', 'Kingpin', 'Legend'];

export function missionPayout(mission: Mission, timesCompleted: number): number {
  return timesCompleted === 0 ? mission.pay : Math.floor(mission.pay / 2);
}

export function rankForRespect(respect: number): string {
  if (respect >= 50000) return 'Legend';
  if (respect >= 30000) return 'Kingpin';
  if (respect >= 15000) return 'Player';
  if (respect >= 5000) return 'Hustler';
  return 'Street';
}

export function wantedFromHeat(heat: number): number {
  if (heat >= 90) return 5;
  if (heat >= 60) return 4;
  if (heat >= 35) return 3;
  if (heat >= 15) return 2;
  if (heat >= 4) return 1;
  return 0;
}

declare global {
  interface Window {
    Leonida: {
      config: {
        DISTRICTS: District[];
        MISSIONS: Mission[];
        WEAPONS: Weapon[];
        POLICE_UNITS: PoliceUnit[];
      };
      main: { startGame(): unknown };
      boot: { boot(): void; scripts: string[] };
      ready?: boolean;
      game?: GameState;
      debug?: {
        state(): Record<string, unknown>;
        teleport(x: number, z: number): void;
        startMission(id: number): unknown;
        setWanted(n: number): number;
        setCash(n: number): void;
        selectWeapon(i: number): unknown;
        fire(): void;
        carjack(): unknown;
        counts(): Record<string, number>;
      };
    };
    THREE: unknown;
  }
}

// Browser boot contract: the page loads game/src/boot.js, which loads
// the game scripts in order and calls Leonida.main.startGame(). This
// function is the typed equivalent for tooling that drives the game
// through the entrypoint directly.
export function startGame(): void {
  if (typeof window === 'undefined') return;
  if (window.Leonida && window.Leonida.main) {
    window.Leonida.main.startGame();
  }
}

export default startGame;
