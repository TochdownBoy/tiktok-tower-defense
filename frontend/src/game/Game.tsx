import { useEffect, useRef } from "react";
import { GameEngine } from "./GameEngine";
import { useGame } from "./GameContext";

export function Game() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { store } = useGame();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const engine = new GameEngine();
    let active = true;

    void (async () => {
      await engine.init(container);
      if (!active) {
        engine.destroy();
        return;
      }
      store.attach(engine);
    })();

    return () => {
      active = false;
      store.detach();
      engine.destroy();
    };
  }, [store]);

  return <div ref={containerRef} className="game-container" />;
}
