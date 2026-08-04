import { Game } from "./game/Game";
import { Dashboard } from "./dashboard/Dashboard";

export function App() {
  return (
    <div className="app-shell">
      <div className="game-view">
        <Game />
      </div>
      <Dashboard />
    </div>
  );
}
