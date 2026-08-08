import { EventEmitter } from "node:events";
import { TikTokLive } from "@tiktool/live";
import type { ChatEvent, GiftEvent, LikeEvent, MemberEvent, SocialEvent } from "@tiktool/live";

export interface TikTokClientOptions {
  apiKey: string;
  signServerUrl?: string;
  sessionId?: string;
  roomId?: string;
}

interface TikTokConnection {
  on(event: "gift", listener: (data: GiftEvent) => void): void;
  on(event: "like", listener: (data: LikeEvent) => void): void;
  on(event: "social", listener: (data: SocialEvent) => void): void;
  on(event: "member", listener: (data: MemberEvent) => void): void;
  on(event: "chat", listener: (data: ChatEvent) => void): void;
  on(event: "connected", listener: () => void): void;
  on(event: "disconnected", listener: (code: number, reason: string) => void): void;
  on(event: "error", listener: (error: Error) => void): void;
  connect(): Promise<void>;
  disconnect(): void;
}

export function formatTikTokError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

export type TikTokEvent =
  | {
      type: "gift";
      uniqueId: string;
      nickname: string;
      giftName: string;
      diamondCount: number;
      repeatCount: number;
    }
  | {
      type: "like";
      uniqueId: string;
      nickname: string;
      likeCount: number;
    }
  | {
      type: "follow";
      uniqueId: string;
      nickname: string;
    }
  | {
      type: "comment";
      uniqueId: string;
      nickname: string;
      comment: string;
    }
  | {
      type: "share";
      uniqueId: string;
      nickname: string;
    }
  | {
      type: "member";
      uniqueId: string;
      nickname: string;
    };

export class TikTokClient extends EventEmitter {
  private readonly connection: TikTokConnection;

  constructor(
    private readonly username: string,
    options: TikTokClientOptions,
  ) {
    super();
    this.connection = new TikTokLive({
      uniqueId: username,
      apiKey: options.apiKey,
      signServerUrl: options.signServerUrl,
      sessionId: options.sessionId,
      roomId: options.roomId,
    }) as unknown as TikTokConnection;

    this.connection.on("gift", (data) =>
      this.handleEvent({
        type: "gift",
        uniqueId: data.user?.uniqueId ?? "",
        nickname: data.user?.nickname ?? "",
        giftName: data.giftName ?? "",
        diamondCount: data.diamondCount ?? 0,
        repeatCount: data.repeatCount ?? 0,
      }),
    );
    this.connection.on("like", (data) =>
      this.handleEvent({
        type: "like",
        uniqueId: data.user?.uniqueId ?? "",
        nickname: data.user?.nickname ?? "",
        likeCount: data.likeCount ?? 0,
      }),
    );
    this.connection.on("social", (data) =>
      this.handleEvent({
        type: data.action === "share" ? "share" : "follow",
        uniqueId: data.user?.uniqueId ?? "",
        nickname: data.user?.nickname ?? "",
      }),
    );
    this.connection.on("chat", (data) =>
      this.handleEvent({
        type: "comment",
        uniqueId: data.user?.uniqueId ?? "",
        nickname: data.user?.nickname ?? "",
        comment: data.comment ?? "",
      }),
    );
    this.connection.on("member", (data) =>
      this.handleEvent({
        type: "member",
        uniqueId: data.user?.uniqueId ?? "",
        nickname: data.user?.nickname ?? "",
      }),
    );
    this.connection.on("connected", () => console.log(`[tiktok] connected to @${this.username}`));
    this.connection.on("disconnected", (code, reason) =>
      console.log(`[tiktok] disconnected (code ${code})${reason ? `: ${reason}` : ""}`),
    );
    this.connection.on("error", (error) =>
      console.error(`[tiktok] error: ${formatTikTokError(error)}`),
    );
  }

  async connect(): Promise<void> {
    await this.connection.connect();
  }

  disconnect(): void {
    this.connection.disconnect();
  }

  private handleEvent(event: TikTokEvent): void {
    console.log(
      `[tiktok] ${event.type}: @${event.uniqueId} (${event.nickname})${this.describe(event)}`,
    );
    this.emit(event.type, event);
  }

  private describe(event: TikTokEvent): string {
    switch (event.type) {
      case "gift":
        return ` sent ${event.giftName} x${event.repeatCount} (${event.diamondCount} diamonds)`;
      case "like":
        return ` liked x${event.likeCount}`;
      case "follow":
        return " followed";
      case "comment":
        return `: ${event.comment}`;
      case "share":
        return " shared";
      case "member":
        return " joined";
    }
  }
}
