import type { EnemyType } from "../../types/enemy";

const ENEMY_TYPES: EnemyType[] = [
  "Slime1",
  "Slime2",
  "Slime3",
  "Slime4",
  "Slime5",
  "Tank",
];

interface EnemyControlsProps {
  onSpawnEnemy: (type: EnemyType) => void;
}

export function EnemyControls({ onSpawnEnemy }: EnemyControlsProps) {
  return (
    <section className="panel">
      <h2 className="panel__title">Enemies</h2>
      <div className="button-row">
        {ENEMY_TYPES.map((type) => (
          <button key={type} type="button" onClick={() => onSpawnEnemy(type)}>
            Spawn {type}
          </button>
        ))}
      </div>
    </section>
  );
}
