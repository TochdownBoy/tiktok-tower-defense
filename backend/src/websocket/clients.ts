import { WebSocket } from "ws";

export type ClientRole = "game" | "dashboard";

export interface ClientEntry {
  socket: WebSocket;
  role: ClientRole | null;
}

export class ClientManager {
  private readonly clients = new Map<WebSocket, ClientEntry>();

  get size(): number {
    return this.clients.size;
  }

  add(socket: WebSocket): void {
    this.clients.set(socket, { socket, role: null });
  }

  remove(socket: WebSocket): void {
    this.clients.delete(socket);
  }

  setRole(socket: WebSocket, role: ClientRole): void {
    const entry = this.clients.get(socket);
    if (entry) {
      entry.role = role;
    }
  }

  getRole(socket: WebSocket): ClientRole | null {
    return this.clients.get(socket)?.role ?? null;
  }

  getGameSocket(): WebSocket | null {
    for (const entry of this.clients.values()) {
      if (entry.role === "game") {
        return entry.socket;
      }
    }
    return null;
  }

  getDashboards(): ClientEntry[] {
    return [...this.clients.values()].filter((entry) => entry.role === "dashboard");
  }

  send(socket: WebSocket, message: string): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }

  sendToGame(message: string): boolean {
    const game = this.getGameSocket();
    if (game === null) {
      return false;
    }
    this.send(game, message);
    return true;
  }

  broadcastToDashboards(message: string): void {
    for (const entry of this.getDashboards()) {
      this.send(entry.socket, message);
    }
  }
}
