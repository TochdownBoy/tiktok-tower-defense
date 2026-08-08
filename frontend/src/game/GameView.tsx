import { useEffect, useMemo, useRef } from "react";
import type { GameStore } from "./GameStore";
import { GameRuntime } from "./GameRuntime";

interface GameViewProps {
  store?: GameStore;
}

export function GameView({ store }: GameViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const fixedSize = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    const width = Number(
      search.get("game_width") ?? search.get("width") ?? Number.NaN,
    );
    const height = Number(
      search.get("game_height") ?? search.get("height") ?? Number.NaN,
    );
    return Number.isFinite(width) &&
      width > 0 &&
      Number.isFinite(height) &&
      height > 0
      ? { width, height }
      : undefined;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const runtime = new GameRuntime(container);
    void runtime.init().then(() => {
      const engine = runtime.getEngine();
      if (engine) {
        store?.attach(engine);
      }
    });

    return () => {
      store?.detach();
      runtime.destroy();
    };
  }, [store]);

  return (
    <div ref={containerRef} className="game-container" style={fixedSize} />
  );
}
