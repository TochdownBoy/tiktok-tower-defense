/// <reference types="vite/client" />

import type { GameEngine } from "./game/GameEngine";

declare global {
  interface Window {
    gameApi?: GameEngine;
  }
}

export {};
