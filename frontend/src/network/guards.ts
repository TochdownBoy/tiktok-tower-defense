import type { ServerToGameEvent } from "../types/game";
import type {
  ClientsPacket,
  EventLogPacket,
  GameCommandPacket,
  GameStatePacket,
  GiftCatalogPacket,
  ServerToClientMessage,
} from "./types";

export function isServerToGameEvent(
  value: unknown,
): value is ServerToGameEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const event = value as Record<string, unknown>;
  const type = event.type;
  if (
    type === "spawn_tower" ||
    type === "upgrade_tower" ||
    type === "upgrade_random_tower" ||
    type === "spawn_enemy"
  ) {
    return typeof event.payload === "object" && event.payload !== null;
  }
  return type === "clear_enemies";
}

export function isGameCommandPacket(
  value: unknown,
): value is GameCommandPacket {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const packet = value as Record<string, unknown>;
  return packet.type === "game_command" && typeof packet.command === "string";
}

export function isGameStatePacket(value: unknown): value is GameStatePacket {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const packet = value as Record<string, unknown>;
  return packet.type === "game_state" && packet.payload !== null;
}

export function isClientsPacket(value: unknown): value is ClientsPacket {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const packet = value as Record<string, unknown>;
  return packet.type === "clients" && packet.payload !== null;
}

export function isEventLogPacket(value: unknown): value is EventLogPacket {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const packet = value as Record<string, unknown>;
  return packet.type === "event_log" && packet.payload !== null;
}

export function isGiftCatalogPacket(
  value: unknown,
): value is GiftCatalogPacket {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const packet = value as Record<string, unknown>;
  return packet.type === "gift_catalog" && Array.isArray(packet.payload);
}

export function isServerToClientMessage(
  value: unknown,
): value is ServerToClientMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const packet = value as Record<string, unknown>;
  switch (packet.type) {
    case "register_ok":
      return true;
    case "game_command":
      return typeof packet.command === "string";
    case "game_state":
      return typeof packet.payload === "object" && packet.payload !== null;
    case "clients":
      return typeof packet.payload === "object" && packet.payload !== null;
    case "event_log":
      return typeof packet.payload === "object" && packet.payload !== null;
    case "gift_catalog":
      return Array.isArray(packet.payload);
    case "pong":
      return true;
  }
  return isServerToGameEvent(value);
}
