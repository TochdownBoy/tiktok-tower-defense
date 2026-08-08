import { EventEmitter } from "node:events";
import { WebSocket, WebSocketServer as WsServer, type RawData } from "ws";
import { ClientManager, type ClientRole } from "./clients.js";
import type { ServerToClientEvent } from "../gift/types.js";

export interface ControlPacket {
  event: string;
}

export interface RegisterPacket {
  type: "register";
  role: ClientRole;
}

export interface GameCommandPacket {
  type: "game_command";
  command: string;
  payload?: unknown;
}

export interface GameStatePacket {
  type: "game_state";
  payload: unknown;
}

export interface SimulateTiktokEventPacket {
  type: "simulate_tiktok_event";
  event: unknown;
}

export interface MatchControlPacket {
  type: "start_game" | "finish_game";
}

export type ClientMessage =
  | RegisterPacket
  | GameCommandPacket
  | GameStatePacket
  | SimulateTiktokEventPacket
  | MatchControlPacket
  | ControlPacket
  | { type: "ping" };

export class WebSocketServer extends EventEmitter {
  private readonly wss: WsServer;
  private readonly clients = new ClientManager();

  constructor(port: number) {
    super();
    this.wss = new WsServer({ port });
    this.wss.on("connection", (socket) => this.handleConnection(socket));
    console.log(`WebSocket server listening on port ${port}`);
  }

  private handleConnection(socket: WebSocket): void {
    this.clients.add(socket);
    socket.on("message", (data) => this.handleMessage(socket, data));
    socket.on("close", () => {
      const wasGame = this.clients.getRole(socket) === "game";
      this.clients.remove(socket);
      if (wasGame) {
        console.log("Game client disconnected");
        this.emit("game_disconnected");
        this.notifyClients();
      }
      console.log(`Client disconnected (${this.clients.size} connected)`);
    });
    this.notifyClients();
  }

  private handleMessage(socket: WebSocket, data: RawData): void {
    const packet = this.parse(data);
    if (packet === null) {
      return;
    }
    if ("type" in packet) {
      if (packet.type === "register") {
        this.handleRegister(socket, packet);
        return;
      }
      if (packet.type === "game_command") {
        this.handleGameCommand(socket, packet);
        return;
      }
      if (packet.type === "game_state") {
        this.handleGameState(socket, packet);
        return;
      }
      if (packet.type === "simulate_tiktok_event") {
        if (this.clients.getRole(socket) === "dashboard") {
          this.emit("simulate_tiktok_event", packet);
        } else {
          console.warn("[ws] ignored simulate_tiktok_event from non-dashboard client");
        }
        return;
      }
      if (packet.type === "ping") {
        this.send(socket, { type: "pong" });
        return;
      }
      if (packet.type === "start_game" || packet.type === "finish_game") {
        this.emit("message", { event: packet.type }, socket);
        return;
      }
      console.warn(`[ws] unknown message: ${JSON.stringify(packet)}`);
      return;
    }
    this.handleControl(socket, packet);
  }

  private handleRegister(socket: WebSocket, packet: RegisterPacket): void {
    if (packet.role !== "game" && packet.role !== "dashboard") {
      console.warn(`[ws] invalid register role: ${String(packet.role)}`);
      return;
    }
    if (packet.role === "game") {
      const previous = this.clients.getGameSocket();
      if (previous !== null && previous !== socket) {
        console.log("[ws] replacing previous game client");
        previous.close();
        this.clients.remove(previous);
      }
    }
    this.clients.setRole(socket, packet.role);
    console.log(`[ws] client registered as ${packet.role} (${this.clients.size} connected)`);
    this.send(socket, { type: "register_ok", role: packet.role });
    this.notifyClients();
    if (packet.role === "dashboard") {
      this.emit("dashboard_registered");
    }
  }

  private handleGameCommand(socket: WebSocket, packet: GameCommandPacket): void {
    if (this.clients.getRole(socket) !== "dashboard") {
      console.warn("[ws] ignored game_command from non-dashboard client");
      return;
    }
    const sent = this.clients.sendToGame(JSON.stringify(packet));
    if (!sent) {
      console.warn(`[ws] no game client connected; dropped command "${packet.command}"`);
    }
  }

  private handleGameState(socket: WebSocket, packet: GameStatePacket): void {
    if (this.clients.getRole(socket) !== "game") {
      return;
    }
    this.clients.broadcastToDashboards(
      JSON.stringify({ type: "game_state", payload: packet.payload }),
    );
  }

  private handleControl(socket: WebSocket, packet: ControlPacket): void {
    if (packet.event === "start_game" || packet.event === "finish_game") {
      this.emit("message", packet, socket);
      return;
    }
    if (packet.event === "ping") {
      this.send(socket, { type: "pong" });
      return;
    }
    console.warn(`[ws] unknown message: ${JSON.stringify(packet)}`);
  }

  private parse(data: RawData): ClientMessage | null {
    const text = Array.isArray(data)
      ? Buffer.concat(data).toString()
      : Buffer.from(data).toString();
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as ClientMessage;
      }
    } catch {
      // Malformed JSON packets are ignored.
    }
    return null;
  }

  send(socket: WebSocket, packet: Record<string, unknown>): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(packet));
    }
  }

  broadcastEvent(event: ServerToClientEvent): void {
    const sent = this.clients.sendToGame(JSON.stringify(event));
    if (!sent) {
      console.warn(`[ws] no game client connected; dropped event "${event.type}"`);
    }
  }

  broadcastToDashboards(packet: Record<string, unknown>): void {
    this.clients.broadcastToDashboards(JSON.stringify(packet));
  }

  private notifyClients(): void {
    const presence = {
      type: "clients",
      payload: {
        gameConnected: this.clients.getGameSocket() !== null,
        dashboardCount: this.clients.getDashboards().length,
      },
    };
    this.clients.broadcastToDashboards(JSON.stringify(presence));
  }

  close(): void {
    this.wss.close();
  }
}
