import type { GameState } from "../../game/GameEngine";

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
          <dd>{state?.wave ?? 0}</dd>
        </div>
        <div className="stat">
          <dt>Gold</dt>
          <dd>{state?.gold ?? 0}</dd>
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
            {state?.isVictory ? "Victory" : state?.isPaused ? "Paused" : "Live"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
