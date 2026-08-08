import { getWsUrl } from "../network/getWsUrl";
import { GameSocketClient } from "../network/GameSocketClient";
import { GameEngine } from "./GameEngine";

export class GameRuntime {
  private readonly container: HTMLElement;
  private readonly engine = new GameEngine();
  private socket: GameSocketClient | null = null;
  private destroyed = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async init(): Promise<void> {
    await this.engine.init(this.container);
    if (this.destroyed) {
      this.engine.destroy();
      return;
    }
    this.socket = new GameSocketClient(getWsUrl(), this.engine);
    this.socket.connect();
    if (import.meta.env.DEV) {
      window.gameApi = this.engine;
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.socket?.destroy();
    this.socket = null;
    this.engine.destroy();
    if (import.meta.env.DEV && window.gameApi === this.engine) {
      delete window.gameApi;
    }
  }

  getEngine(): GameEngine | null {
    return this.destroyed ? null : this.engine;
  }
}
