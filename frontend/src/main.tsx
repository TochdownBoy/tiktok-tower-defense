import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameProvider } from "./game/GameContext";
import { App } from "./App";
import "./main.css";

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);
