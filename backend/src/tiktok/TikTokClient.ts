import { EventEmitter } from "node:events";
import { TikTokLiveConnection } from "tiktok-live-connector";
import type {
  WebcastChatMessage,
  WebcastGiftMessage,
  WebcastLikeMessage,
  WebcastSocialMessage,
} from "tiktok-live-connector";

interface TikTokConnection {
  on(event: "gift", listener: (data: WebcastGiftMessage) => void): void;
  on(event: "like", listener: (data: WebcastLikeMessage) => void): void;
  on(event: "follow" | "share", listener: (data: WebcastSocialMessage) => void): void;
  on(event: "chat", listener: (data: WebcastChatMessage) => void): void;
  on(event: "connected", listener: () => void): void;
  on(event: "disconnected", listener: (data: { code: number; reason?: string }) => void): void;
  on(event: "error", listener: (data: unknown) => void): void;
  connect(): Promise<unknown>;
  disconnect(): Promise<void>;
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
    };

export class TikTokClient extends EventEmitter {
  private readonly connection: TikTokConnection;

  constructor(private readonly username: string) {
    super();
    this.connection = new TikTokLiveConnection(username, {}) as unknown as TikTokConnection;
  }

  async connect(): Promise<void> {
    this.connection.on("gift", (data) =>
      this.handleEvent({
        type: "gift",
        uniqueId: data.user?.displayId ?? "",
        nickname: data.user?.nickname ?? "",
        giftName: data.gift?.name ?? "",
        diamondCount: data.gift?.diamondCount ?? 0,
        repeatCount: data.repeatCount,
      }),
    );
    this.connection.on("like", (data) =>
      this.handleEvent({
        type: "like",
        uniqueId: data.user?.displayId ?? "",
        nickname: data.user?.nickname ?? "",
        likeCount: data.count,
      }),
    );
    this.connection.on("follow", (data) =>
      this.handleEvent({
        type: "follow",
        uniqueId: data.user?.displayId ?? "",
        nickname: data.user?.nickname ?? "",
      }),
    );
    this.connection.on("chat", (data) =>
      this.handleEvent({
        type: "comment",
        uniqueId: data.user?.displayId ?? "",
        nickname: data.user?.nickname ?? "",
        comment: data.content,
      }),
    );
    this.connection.on("share", (data) =>
      this.handleEvent({
        type: "share",
        uniqueId: data.user?.displayId ?? "",
        nickname: data.user?.nickname ?? "",
      }),
    );
    this.connection.on("connected", () => console.log(`[tiktok] connected to @${this.username}`));
    this.connection.on("disconnected", ({ code }) =>
      console.log(`[tiktok] disconnected (code ${code})`),
    );
    this.connection.on("error", (error) => console.error(`[tiktok] error: ${String(error)}`));

    await this.connection.connect();
  }

  async disconnect(): Promise<void> {
    await this.connection.disconnect();
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
    }
  }
}
