import type { GameEngine, GameState } from "../game/GameEngine";
import { handleGameEvent } from "../game/GameEventRouter";
import { handleGameCommand } from "../game/GameCommandRouter";
import {
  isGameCommandPacket,
  isServerToClientMessage,
  isServerToGameEvent,
} from "./guards";

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
    console.log(`[ws] game connected to ${this.url}`);
    this.reconnectTimer = null;
    this.send({ type: "register", role: "game" });
    this.wasActive = this.engine.getState().isActive;
    if (this.wasActive) {
      this.send({ type: "start_game" });
    }
    this.send({ type: "game_state", payload: this.engine.getState() });
  }

  private handleMessage(message: MessageEvent): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(message.data));
    } catch {
      return;
    }
    if (!isServerToClientMessage(parsed)) {
      return;
    }
    if (isGameCommandPacket(parsed)) {
      handleGameCommand(this.engine, parsed);
      return;
    }
    if (isServerToGameEvent(parsed)) {
      const result = handleGameEvent(this.engine, parsed);
      if (!result.success) {
        console.warn(
          `[ws] ${parsed.type} skipped: ${String(result.reason ?? "unknown")}`,
        );
      }
    }
  }

  private handleStateChange(state: GameState): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.wasActive = state.isActive;
      return;
    }
    if (state.isActive && !this.wasActive) {
      this.send({ type: "start_game" });
    } else if (!state.isActive && this.wasActive) {
      this.send({ type: "finish_game" });
    }
    this.wasActive = state.isActive;
    this.send({ type: "game_state", payload: state });
  }

  private handleClose(): void {
    this.socket = null;
    if (this.closedByUser || this.destroyed) {
      return;
    }
    console.log(
      `[ws] game disconnected, reconnecting in ${RECONNECT_DELAY_MS}ms`,
    );
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, RECONNECT_DELAY_MS);
  }

  private send(message: Record<string, unknown>): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}
