import { Entity } from '@minecraft/server';
import { Player } from '../Player/Player';
import { KingdomData } from './Kingdom';

// Define interfaces for each custom event
interface CustomSpellCastEvent {
  caster: Player;
  spellName: string;
  power: number;
}

interface PlayerLevelUpEvent {
  player: Player;
  newLevel: number;
  oldLevel: number;
}

interface BossSpawnEvent {
  boss: Entity;
  location: { x: number; y: number; z: number };
}

interface KingdomInviteEvent {
  player: Player;
  kingdom: KingdomData;
  date: number;
  inviter: Player;
}

// Define the CustomEventMap using the individual event interfaces
interface CustomEventMap {
  customSpellCast: CustomSpellCastEvent;
  playerLevelUp: PlayerLevelUpEvent;
  bossSpawn: BossSpawnEvent;
  kingdomInvite: KingdomInviteEvent;
}

export {
  CustomEventMap,
  CustomSpellCastEvent,
  PlayerLevelUpEvent,
  BossSpawnEvent,
  KingdomInviteEvent,
};
