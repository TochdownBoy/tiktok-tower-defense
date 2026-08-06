const DEFAULT_WS_PORT = 3000;

export function getWsUrl(): string {
  const configured = import.meta.env.VITE_WS_URL;
  if (typeof configured === "string" && configured.length > 0) {
    return configured;
  }
  return `ws://${window.location.hostname}:${DEFAULT_WS_PORT}`;
}
