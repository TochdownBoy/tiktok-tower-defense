import type { GameState } from "../types/game";
import {
  isClientsPacket,
  isEventLogPacket,
  isGameStatePacket,
  isGiftCatalogPacket,
} from "./guards";
import {
  INITIAL_CONNECTION_STATUS,
  type ConnectionStatus,
  type EventLogEntry,
  type GameCommand,
  type SimulatedTiktokEvent,
} from "./types";

const RECONNECT_DELAY_MS = 3000;

type Listener = () => void;
type EventLogListener = (entry: EventLogEntry) => void;
type GiftCatalogListener = (names: string[]) => void;

export class DashboardSocketClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private closedByUser = false;
  private destroyed = false;
  private state: GameState | null = null;
  private connection: ConnectionStatus = { ...INITIAL_CONNECTION_STATUS };
  private readonly stateListeners = new Set<Listener>();
  private readonly connectionListeners = new Set<Listener>();
  private readonly eventLogListeners = new Set<EventLogListener>();
  private readonly giftCatalogListeners = new Set<GiftCatalogListener>();

  constructor(private readonly url: string) {}

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
    this.stateListeners.clear();
    this.connectionListeners.clear();
    this.eventLogListeners.clear();
    this.giftCatalogListeners.clear();
  }

  sendCommand(command: GameCommand): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "game_command",
          command: command.type,
          ...("payload" in command ? { payload: command.payload } : {}),
        }),
      );
    } else {
      console.warn("[ws] dashboard not connected; command not sent");
    }
  }

  sendSimulateEvent(event: SimulatedTiktokEvent): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({ type: "simulate_tiktok_event", event }),
      );
    } else {
      console.warn("[ws] dashboard not connected; simulated event not sent");
    }
  }

  getState(): GameState | null {
    return this.state;
  }

  getConnection(): ConnectionStatus {
    return this.connection;
  }

  onState(listener: Listener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  onConnection(listener: Listener): () => void {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  onEventLog(listener: EventLogListener): () => void {
    this.eventLogListeners.add(listener);
    return () => {
      this.eventLogListeners.delete(listener);
    };
  }

  onGiftCatalog(listener: GiftCatalogListener): () => void {
    this.giftCatalogListeners.add(listener);
    return () => {
      this.giftCatalogListeners.delete(listener);
    };
  }

  private open(): void {
    this.connection = { ...this.connection, connecting: true };
    this.emitConnection();
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
    console.log(`[ws] dashboard connected to ${this.url}`);
    this.reconnectTimer = null;
    this.connection = {
      ...this.connection,
      connected: true,
      connecting: false,
    };
    this.emitConnection();
    this.send({ type: "register", role: "dashboard" });
  }

  private handleMessage(message: MessageEvent): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(message.data));
    } catch {
      return;
    }
    if (isGameStatePacket(parsed)) {
      this.state = parsed.payload;
      this.emitState();
      return;
    }
    if (isClientsPacket(parsed)) {
      const payload = parsed.payload as {
        gameConnected: boolean;
        dashboardCount: number;
      };
      this.connection = {
        ...this.connection,
        gameConnected: payload.gameConnected,
        dashboardCount: payload.dashboardCount,
      };
      this.emitConnection();
      return;
    }
    if (isEventLogPacket(parsed)) {
      for (const listener of this.eventLogListeners) {
        listener(parsed.payload);
      }
      return;
    }
    if (isGiftCatalogPacket(parsed)) {
      for (const listener of this.giftCatalogListeners) {
        listener(parsed.payload);
      }
    }
  }

  private handleClose(): void {
    this.socket = null;
    if (this.closedByUser || this.destroyed) {
      return;
    }
    this.connection = {
      ...this.connection,
      connected: false,
      connecting: false,
    };
    this.emitConnection();
    console.log(
      `[ws] dashboard disconnected, reconnecting in ${RECONNECT_DELAY_MS}ms`,
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

  private emitState(): void {
    for (const listener of this.stateListeners) {
      listener();
    }
  }

  private emitConnection(): void {
    for (const listener of this.connectionListeners) {
      listener();
    }
  }
}
