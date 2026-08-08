import type { ConnectionStatus } from "../../network/types";

interface ConnectionPanelProps {
  connection: ConnectionStatus;
}

export function ConnectionPanel({ connection }: ConnectionPanelProps) {
  const wsLabel = connection.connected
    ? "Connected"
    : connection.connecting
      ? "Connecting"
      : "Disconnected";

  return (
    <section className="panel">
      <h2 className="panel__title">Connection</h2>
      <dl className="stats">
        <div className="stat">
          <dt>Server</dt>
          <dd>{wsLabel}</dd>
        </div>
        <div className="stat">
          <dt>Game</dt>
          <dd>{connection.gameConnected ? "Connected" : "Offline"}</dd>
        </div>
        <div className="stat">
          <dt>Dashboards</dt>
          <dd>{connection.dashboardCount}</dd>
        </div>
      </dl>
    </section>
  );
}
