import { useGame } from "../game/GameContext";
import type { TowerType } from "../types/tower";
import type { EnemyType } from "../types/enemy";
import type { SpotInfoType } from "../types/spot";
import { StatsPanel } from "./components/StatsPanel";
import { TowerControls } from "./components/TowerControls";
import { EnemyControls } from "./components/EnemyControls";
import { WaveControls } from "./components/WaveControls";
import "./dashboard.css";

export function Dashboard() {
  const { engine, state } = useGame();

  const handleSpawnTower = (type: TowerType, spot: SpotInfoType) => {
    engine?.spawnTower(type, spot);
  };

  const handleSellTower = (spot: SpotInfoType) => {
    engine?.sellTower(spot);
  };

  const handleUpgradeTower = (spot: SpotInfoType) => {
    engine?.upgradeTower(spot);
  };

  const handleSpawnEnemy = (type: EnemyType) => {
    engine?.spawnEnemy(type);
  };

  return (
    <main className="dashboard">
      <h1 className="dashboard__title">Dashboard</h1>
      <div className="dashboard__grid">
        <StatsPanel state={state} />
        <TowerControls
          onSpawnTower={handleSpawnTower}
          onSellTower={handleSellTower}
          onUpgradeTower={handleUpgradeTower}
        />
        <EnemyControls onSpawnEnemy={handleSpawnEnemy} />
        <WaveControls
          isPaused={state?.isPaused ?? false}
          speed={state?.speed ?? 1}
          onStartWave={() => engine?.startWave()}
          onPause={() => engine?.pause()}
          onResume={() => engine?.resume()}
          onRestart={() => void engine?.restart()}
          onSetSpeed={(speed) => engine?.setGameSpeed(speed)}
        />
      </div>
    </main>
  );
}
