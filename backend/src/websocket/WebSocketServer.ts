import { EventEmitter } from "node:events";
import { WebSocket, WebSocketServer as WsServer, type RawData } from "ws";
import type { ServerToClientEvent } from "../gift/types.js";

export interface Packet {
  event: string;
  [key: string]: unknown;
}

export class WebSocketServer extends EventEmitter {
  private readonly wss: WsServer;
  private readonly clients = new Set<WebSocket>();

  constructor(port: number) {
    super();
    this.wss = new WsServer({ port });
    this.wss.on("connection", (socket) => this.handleConnection(socket));
    console.log(`WebSocket server listening on port ${port}`);
  }

  private handleConnection(socket: WebSocket): void {
    this.clients.add(socket);
    console.log(`Client connected (${this.clients.size} connected)`);
    socket.on("message", (data) => this.handleMessage(socket, data));
    socket.on("close", () => this.handleDisconnection(socket));
  }

  private handleDisconnection(socket: WebSocket): void {
    this.clients.delete(socket);
    console.log(`Client disconnected (${this.clients.size} connected)`);
  }

  private handleMessage(socket: WebSocket, data: RawData): void {
    const packet = this.parse(data);
    if (packet === null) {
      return;
    }
    if (packet.event === "ping") {
      this.send(socket, { event: "pong" });
    }
    this.emit("message", packet, socket);
  }

  private parse(data: RawData): Packet | null {
    const text = Array.isArray(data)
      ? Buffer.concat(data).toString()
      : Buffer.from(data).toString();
    try {
      const parsed: unknown = JSON.parse(text);
      if (isPacket(parsed)) {
        return parsed;
      }
    } catch {
      // Malformed JSON packets are ignored.
    }
    return null;
  }

  send(socket: WebSocket, packet: Packet): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(packet));
    }
  }

  broadcast(packet: Packet): void {
    this.broadcastRaw(JSON.stringify(packet));
  }

  broadcastEvent(event: ServerToClientEvent): void {
    this.broadcastRaw(JSON.stringify(event));
  }

  private broadcastRaw(message: string): void {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  close(): void {
    this.wss.close();
  }
}

const isPacket = (value: unknown): value is Packet => {
  return typeof value === "object" && value !== null && typeof (value as Packet).event === "string";
};
