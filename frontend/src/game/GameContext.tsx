import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { GameEngine } from "./GameEngine";
import type { GameState } from "./GameEngine";
import { GameStore } from "./GameStore";

export interface GameContextValue {
  engine: GameEngine | null;
  state: GameState | null;
  store: GameStore;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<GameStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = new GameStore();
  }

  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;

    return store.subscribe(() => {
      setState(store.getState());
    });
  }, []);

  return (
    <GameContext.Provider
      value={{
        engine: storeRef.current.getEngine(),
        state,
        store: storeRef.current,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
