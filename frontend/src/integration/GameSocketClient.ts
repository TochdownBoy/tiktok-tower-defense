import type { GameEngine, GameState } from "../game/GameEngine";
import { handleGameEvent } from "../game/GameEventRouter";
import type { ServerToGameEvent } from "../types/game";

interface ControlPacket {
  event: string;
}

const RECONNECT_DELAY_MS = 3000;

export class GameSocketClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private closedByUser = false;
  private destroyed = false;
  private wasActive: boolean;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly url: string,
    private readonly engine: GameEngine,
  ) {
    this.wasActive = engine.getState().isActive;
    this.unsubscribe = engine.subscribe((state) =>
      this.handleStateChange(state),
    );
  }

  connect(): void {
    if (this.destroyed) return;
    this.closedByUser = false;
    this.open();
  }

  destroy(): void {
    this.destroyed = true;
    this.closedByUser = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.unsubscribe();
  }

  private open(): void {
    try {
      this.socket = new WebSocket(this.url);
    } catch (error) {
      console.error(`[ws] failed to connect to ${this.url}: ${String(error)}`);
      this.scheduleReconnect();
      return;
    }
    this.socket.onopen = () => this.handleOpen();
    this.socket.onmessage = (message) => this.handleMessage(message);
    this.socket.onerror = () => undefined;
    this.socket.onclose = () => this.handleClose();
  }

  private handleOpen(): void {
    console.log(`[ws] connected to ${this.url}`);
    this.reconnectTimer = null;
    this.wasActive = this.engine.getState().isActive;
    if (this.wasActive) {
      this.sendControl({ event: "start_game" });
    }
  }

  private handleMessage(message: MessageEvent): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(message.data));
    } catch {
      return;
    }
    if (!isServerToGameEvent(parsed)) {
      return;
    }
    const result = handleGameEvent(this.engine, parsed);
    if (!result.success) {
      console.warn(
        `[ws] ${parsed.type} skipped: ${String(result.reason ?? "unknown")}`,
      );
    }
  }

  private handleStateChange(state: GameState): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.wasActive = state.isActive;
      return;
    }
    if (state.isActive && !this.wasActive) {
      this.sendControl({ event: "start_game" });
    } else if (!state.isActive && this.wasActive) {
      this.sendControl({ event: "finish_game" });
    }
    this.wasActive = state.isActive;
  }

  private handleClose(): void {
    this.socket = null;
    if (this.closedByUser || this.destroyed) {
      return;
    }
    console.log(`[ws] disconnected, reconnecting in ${RECONNECT_DELAY_MS}ms`);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, RECONNECT_DELAY_MS);
  }

  private sendControl(packet: ControlPacket): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(packet));
    }
  }
}

const isServerToGameEvent = (value: unknown): value is ServerToGameEvent => {
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
};
