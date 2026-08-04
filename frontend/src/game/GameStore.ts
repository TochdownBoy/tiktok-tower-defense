import type { GameEngine, GameState } from "./GameEngine";

type Listener = () => void;

export class GameStore {
  private engine: GameEngine | null = null;
  private state: GameState | null = null;
  private unsubscribeFromEngine: (() => void) | null = null;
  private readonly listeners = new Set<Listener>();

  attach(engine: GameEngine): void {
    this.detach();
    this.engine = engine;
    this.state = engine.getState();
    this.unsubscribeFromEngine = engine.subscribe((state) => {
      this.state = state;
      this.emit();
    });
    this.emit();
  }

  detach(): void {
    this.unsubscribeFromEngine?.();
    this.unsubscribeFromEngine = null;
    this.engine = null;
    this.state = null;
    this.emit();
  }

  getEngine(): GameEngine | null {
    return this.engine;
  }

  getState(): GameState | null {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
