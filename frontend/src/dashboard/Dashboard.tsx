import type { ReactNode } from "react";
import type { GameState } from "../types/game";
import type { ConnectionStatus } from "../network/types";
import type { DashboardController } from "./controllers";
import { StatsPanel } from "./components/StatsPanel";
import { TowerControls } from "./components/TowerControls";
import { EnemyControls } from "./components/EnemyControls";
import { WaveControls } from "./components/WaveControls";
import { ConnectionPanel } from "./components/ConnectionPanel";
import "./dashboard.css";

interface DashboardProps {
  controller: DashboardController | null;
  state: GameState | null;
  connection?: ConnectionStatus;
  liveFlow?: ReactNode;
}

export function Dashboard({
  controller,
  state,
  connection,
  liveFlow,
}: DashboardProps) {
  return (
    <main className="dashboard">
      <h1 className="dashboard__title">Dashboard</h1>
      {connection && <ConnectionPanel connection={connection} />}
      <div className="dashboard__grid">
        <StatsPanel state={state} />
        <TowerControls
          onSpawnTower={(type, spot) => controller?.placeTower(type, spot)}
          onSellTower={(spot) => controller?.sellTower(spot)}
          onUpgradeTower={(spot) => controller?.upgradeTower(spot)}
        />
        <EnemyControls
          onSpawnEnemy={(type) => controller?.spawnEnemy(type)}
          onClearEnemies={() => controller?.clearEnemies()}
        />
        <WaveControls
          isActive={state?.isActive ?? false}
          isPaused={state?.isPaused ?? false}
          speed={state?.speed ?? 1}
          onStartGame={() => controller?.startGame()}
          onNextWave={() => controller?.startNextWave()}
          onFinishGame={() => controller?.finishGame()}
          onPause={() => controller?.pause()}
          onResume={() => controller?.resume()}
          onRestart={() => controller?.restart()}
          onSetSpeed={(speed) => controller?.setSpeed(speed)}
        />
      </div>
      {liveFlow}
    </main>
  );
}
