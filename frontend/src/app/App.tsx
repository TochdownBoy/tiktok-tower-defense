import { useMemo } from "react";
import { GameView } from "../game/GameView";
import { useGame } from "../game/GameContext";
import { Dashboard } from "../dashboard/Dashboard";
import { DashboardView } from "../dashboard/DashboardView";
import { LocalDashboardController } from "../dashboard/controllers";
import { LiveFlowPanel } from "../dashboard/components/LiveFlowPanel";
import { useDashboardSocket } from "../dashboard/useDashboardSocket";

export type AppMode = "game" | "dashboard" | "dev";

export function App({ mode }: { mode: AppMode }) {
  if (mode === "game") {
    return (
      <div className="mode-game">
        <GameView />
      </div>
    );
  }
  if (mode === "dashboard") {
    return (
      <div className="mode-dashboard">
        <DashboardView />
      </div>
    );
  }
  return <DevLayout />;
}

function DevLiveFlow() {
  const {
    connection,
    eventLog,
    giftCatalog,
    sendSimulateEvent,
    clearEventLog,
  } = useDashboardSocket();
  return (
    <LiveFlowPanel
      connection={connection}
      eventLog={eventLog}
      giftCatalog={giftCatalog}
      onSimulate={sendSimulateEvent}
      onClearLog={clearEventLog}
    />
  );
}

function DevLayout() {
  const { engine, state, store } = useGame();
  const controller = useMemo(
    () => (engine ? new LocalDashboardController(engine) : null),
    [engine],
  );

  return (
    <div className="app-shell">
      <div className="game-view">
        <GameView store={store} />
      </div>
      <Dashboard
        controller={controller}
        state={state}
        liveFlow={import.meta.env.DEV ? <DevLiveFlow /> : undefined}
      />
    </div>
  );
}
