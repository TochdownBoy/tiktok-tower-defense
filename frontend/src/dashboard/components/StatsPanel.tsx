import type { GameState } from "../../game/GameEngine";
import { formatTimer } from "../../utils/formatTime";

interface StatsPanelProps {
  state: GameState | null;
}

export function StatsPanel({ state }: StatsPanelProps) {
  return (
    <section className="panel">
      <h2 className="panel__title">Live Stats</h2>
      <dl className="stats">
        <div className="stat">
          <dt>Wave</dt>
          <dd>
            {state?.currentWave ?? 0} / {state?.totalWaves ?? 10}
          </dd>
        </div>
        <div className="stat">
          <dt>Wave Time</dt>
          <dd>{state ? formatTimer(state.remainingWaveSeconds) : "00:00"}</dd>
        </div>
        <div className="stat">
          <dt>HP</dt>
          <dd>{state?.hp ?? 0}</dd>
        </div>
        <div className="stat">
          <dt>Towers</dt>
          <dd>{state?.towers ?? 0}</dd>
        </div>
        <div className="stat">
          <dt>Enemies</dt>
          <dd>{state?.enemies ?? 0}</dd>
        </div>
        <div className="stat">
          <dt>FPS</dt>
          <dd>{state?.fps ?? 0}</dd>
        </div>
        <div className="stat">
          <dt>Speed</dt>
          <dd>{state?.speed ?? 1}x</dd>
        </div>
        <div className="stat">
          <dt>Status</dt>
          <dd>
            {state?.isVictory
              ? "Victory"
              : state?.isPaused
                ? "Paused"
                : state?.isActive
                  ? "Live"
                  : "Idle"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
