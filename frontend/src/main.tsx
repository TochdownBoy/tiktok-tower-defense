import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App, type AppMode } from "./app/App";
import { GameProvider } from "./game/GameContext";
import "./main.css";

const getMode = (): AppMode => {
  const raw = new URLSearchParams(window.location.search).get("mode");
  if (raw === "game" || raw === "dashboard") {
    return raw;
  }
  return "dev";
};

const mode = getMode();

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    {mode === "dev" ? (
      <GameProvider>
        <App mode={mode} />
      </GameProvider>
    ) : (
      <App mode={mode} />
    )}
  </StrictMode>,
);
