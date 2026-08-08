import type { EnemyType } from "../types/enemy";
import type { GameState, ServerToGameEvent } from "../types/game";
import type { TowerType } from "../types/tower";

export type ClientRole = "game" | "dashboard";

export type GameCommand =
  | { type: "start_game" }
  | { type: "finish_game" }
  | { type: "start_next_wave" }
  | {
      type: "place_tower";
      payload: { towerType: TowerType; spotOrder: number };
    }
  | { type: "sell_tower"; payload: { spotOrder: number } }
  | { type: "upgrade_tower"; payload: { spotOrder: number } }
  | { type: "spawn_enemy"; payload: { enemyType: EnemyType } }
  | { type: "clear_enemies" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "restart" }
  | { type: "set_speed"; payload: { speed: number } };

export type GameCommandType = GameCommand["type"];

export interface GameCommandPacket {
  type: "game_command";
  command: GameCommandType;
  payload?: unknown;
}

export interface RegisterPacket {
  type: "register";
  role: ClientRole;
}

export interface GameStatePacket {
  type: "game_state";
  payload: GameState;
}

export interface ClientsPacket {
  type: "clients";
  payload: {
    gameConnected: boolean;
    dashboardCount: number;
  };
}

export type SimulatedTiktokEvent =
  | {
      type: "gift";
      uniqueId: string;
      nickname: string;
      giftName: string;
      diamondCount: number;
      repeatCount: number;
    }
  | { type: "like"; uniqueId: string; nickname: string; likeCount: number }
  | { type: "follow"; uniqueId: string; nickname: string }
  | { type: "comment"; uniqueId: string; nickname: string; comment: string }
  | { type: "share"; uniqueId: string; nickname: string }
  | { type: "member"; uniqueId: string; nickname: string };

export type SimulatedTiktokEventKind = SimulatedTiktokEvent["type"];

export interface SimulateTiktokEventPacket {
  type: "simulate_tiktok_event";
  event: SimulatedTiktokEvent;
}

export interface EventLogEntry {
  timestamp: number;
  kind: SimulatedTiktokEventKind;
  username: string;
  label: string;
  detail: string;
  note?: string;
}

export interface EventLogPacket {
  type: "event_log";
  payload: EventLogEntry;
}

export interface GiftCatalogPacket {
  type: "gift_catalog";
  payload: string[];
}

export type ClientToServerMessage =
  | RegisterPacket
  | GameCommandPacket
  | GameStatePacket
  | SimulateTiktokEventPacket
  | { type: "ping" }
  | { type: "start_game" }
  | { type: "finish_game" };

export type ServerToClientMessage =
  | { type: "register_ok"; role: ClientRole }
  | GameCommandPacket
  | GameStatePacket
  | ClientsPacket
  | EventLogPacket
  | GiftCatalogPacket
  | ServerToGameEvent
  | { type: "pong" };

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  gameConnected: boolean;
  dashboardCount: number;
}

export const INITIAL_CONNECTION_STATUS: ConnectionStatus = {
  connected: false,
  connecting: true,
  gameConnected: false,
  dashboardCount: 0,
};
