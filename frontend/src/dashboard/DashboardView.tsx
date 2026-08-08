import { useMemo } from "react";
import { Dashboard } from "./Dashboard";
import type { DashboardController } from "./controllers";
import { LiveFlowPanel } from "./components/LiveFlowPanel";
import { useDashboardSocket } from "./useDashboardSocket";

export function DashboardView() {
  const {
    connection,
    state,
    eventLog,
    giftCatalog,
    sendSimulateEvent,
    sendCommand,
    clearEventLog,
  } = useDashboardSocket();

  const controller = useMemo<DashboardController>(
    () => ({
      startGame: () => sendCommand({ type: "start_game" }),
      finishGame: () => sendCommand({ type: "finish_game" }),
      startNextWave: () => sendCommand({ type: "start_next_wave" }),
      placeTower: (type, spot) =>
        sendCommand({
          type: "place_tower",
          payload: { towerType: type, spotOrder: spot.order },
        }),
      sellTower: (spot) =>
        sendCommand({
          type: "sell_tower",
          payload: { spotOrder: spot.order },
        }),
      upgradeTower: (spot) =>
        sendCommand({
          type: "upgrade_tower",
          payload: { spotOrder: spot.order },
        }),
      spawnEnemy: (type) =>
        sendCommand({
          type: "spawn_enemy",
          payload: { enemyType: type },
        }),
      clearEnemies: () => sendCommand({ type: "clear_enemies" }),
      pause: () => sendCommand({ type: "pause" }),
      resume: () => sendCommand({ type: "resume" }),
      restart: () => sendCommand({ type: "restart" }),
      setSpeed: (speed) =>
        sendCommand({
          type: "set_speed",
          payload: { speed },
        }),
    }),
    [sendCommand],
  );

  return (
    <Dashboard
      controller={controller}
      state={state}
      connection={connection}
      liveFlow={
        <LiveFlowPanel
          connection={connection}
          eventLog={eventLog}
          giftCatalog={giftCatalog}
          onSimulate={sendSimulateEvent}
          onClearLog={clearEventLog}
        />
      }
    />
  );
}
