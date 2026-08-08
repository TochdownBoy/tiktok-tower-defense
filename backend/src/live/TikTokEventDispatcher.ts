import type { GiftProcessor } from "../gift/GiftProcessor.js";
import type { MatchStateService } from "../gift/MatchStateService.js";
import type { TikTokEvent } from "../tiktok/TikTokClient.js";

export type TikTokEventLogKind = TikTokEvent["type"];

export interface TikTokEventLogEntry {
  kind: TikTokEventLogKind;
  username: string;
  label: string;
  detail: string;
  note?: string;
}

export interface TikTokEventDispatcherOptions {
  giftProcessor: GiftProcessor;
  matchState: MatchStateService;
  log: (entry: TikTokEventLogEntry) => void;
}

/**
 * Routes any TikTokEvent (real or simulated) through the same pipeline.
 * Gifts and likes are forwarded to the GiftProcessor exactly like real
 * TikTok events; the remaining event kinds currently have no game mapping
 * and are only surfaced in the event log.
 */
export function createTikTokEventDispatcher({
  giftProcessor,
  matchState,
  log,
}: TikTokEventDispatcherOptions): (event: TikTokEvent) => void {
  return (event: TikTokEvent): void => {
    switch (event.type) {
      case "gift":
        giftProcessor.handleGift({
          uniqueId: event.uniqueId,
          nickname: event.nickname,
          giftName: event.giftName,
          repeatCount: event.repeatCount,
        });
        logEvent(log, event, matchState.isActive);
        return;
      case "like":
        giftProcessor.handleLike({
          uniqueId: event.uniqueId,
          nickname: event.nickname,
          likeCount: event.likeCount,
        });
        logEvent(log, event, matchState.isActive);
        return;
      case "follow":
      case "comment":
      case "share":
      case "member":
        logEvent(log, event, true);
        return;
    }
  };
}

export function isTikTokEvent(value: unknown): value is TikTokEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const event = value as Record<string, unknown>;
  if (typeof event.uniqueId !== "string" || typeof event.nickname !== "string") {
    return false;
  }
  switch (event.type) {
    case "gift":
      return (
        typeof event.giftName === "string" &&
        typeof event.repeatCount === "number" &&
        typeof event.diamondCount === "number"
      );
    case "like":
      return typeof event.likeCount === "number";
    case "follow":
    case "share":
    case "member":
      return true;
    case "comment":
      return typeof event.comment === "string";
    default:
      return false;
  }
}

function logEvent(
  log: (entry: TikTokEventLogEntry) => void,
  event: TikTokEvent,
  active: boolean,
): void {
  const entry = toLogEntry(event);
  log(active ? entry : { ...entry, note: "ignored: no active match" });
}

function toLogEntry(event: TikTokEvent): TikTokEventLogEntry {
  switch (event.type) {
    case "gift":
      return {
        kind: "gift",
        username: event.nickname,
        label: event.giftName,
        detail: `x${event.repeatCount} (${event.diamondCount}💎)`,
      };
    case "like":
      return {
        kind: "like",
        username: event.nickname,
        label: `+${event.likeCount}`,
        detail: "",
      };
    case "follow":
      return { kind: "follow", username: event.nickname, label: "Followed", detail: "" };
    case "comment":
      return { kind: "comment", username: event.nickname, label: "", detail: event.comment };
    case "share":
      return { kind: "share", username: event.nickname, label: "Shared", detail: "" };
    case "member":
      return { kind: "member", username: event.nickname, label: "Joined", detail: "" };
  }
}
