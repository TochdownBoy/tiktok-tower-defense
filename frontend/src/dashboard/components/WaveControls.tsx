const SPEEDS = [1, 2, 4];

interface WaveControlsProps {
  isActive: boolean;
  isPaused: boolean;
  speed: number;
  onStartGame: () => void;
  onNextWave: () => void;
  onFinishGame: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onSetSpeed: (speed: number) => void;
}

export function WaveControls({
  isActive,
  isPaused,
  speed,
  onStartGame,
  onNextWave,
  onFinishGame,
  onPause,
  onResume,
  onRestart,
  onSetSpeed,
}: WaveControlsProps) {
  return (
    <section className="panel">
      <h2 className="panel__title">Match</h2>
      <div className="button-row">
        <button type="button" onClick={onStartGame}>
          Start Game
        </button>
        <button type="button" disabled={!isActive} onClick={onNextWave}>
          Next Wave
        </button>
        <button type="button" disabled={!isActive} onClick={onFinishGame}>
          Finish Game
        </button>
      </div>
      <div className="button-row">
        <button type="button" disabled={isPaused} onClick={onPause}>
          Pause
        </button>
        <button type="button" disabled={!isPaused} onClick={onResume}>
          Resume
        </button>
        <button type="button" onClick={onRestart}>
          Restart
        </button>
      </div>
      <div className="speed-row">
        <span className="field__label">Speed</span>
        {SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            className={value === speed ? "button--active" : undefined}
            onClick={() => onSetSpeed(value)}
          >
            {value}x
          </button>
        ))}
      </div>
    </section>
  );
}
