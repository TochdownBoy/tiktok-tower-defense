import { useCallback, useEffect, useRef, useState } from "react";
import { getWsUrl } from "../network/getWsUrl";
import { DashboardSocketClient } from "../network/DashboardSocketClient";
import {
  INITIAL_CONNECTION_STATUS,
  type ConnectionStatus,
  type EventLogEntry,
  type GameCommand,
  type SimulatedTiktokEvent,
} from "../network/types";
import type { GameState } from "../types/game";

const MAX_EVENT_LOG = 100;

export function useDashboardSocket() {
  const socketRef = useRef<DashboardSocketClient | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>({
    ...INITIAL_CONNECTION_STATUS,
  });
  const [state, setState] = useState<GameState | null>(null);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [giftCatalog, setGiftCatalog] = useState<string[]>([]);

  useEffect(() => {
    const socket = new DashboardSocketClient(getWsUrl());
    socketRef.current = socket;
    const unsubscribeState = socket.onState(() => setState(socket.getState()));
    const unsubscribeConnection = socket.onConnection(() =>
      setConnection(socket.getConnection()),
    );
    const unsubscribeEventLog = socket.onEventLog((entry) =>
      setEventLog((previous) => [
        ...previous.slice(-(MAX_EVENT_LOG - 1)),
        entry,
      ]),
    );
    const unsubscribeGiftCatalog = socket.onGiftCatalog((names) =>
      setGiftCatalog(names),
    );
    socket.connect();
    return () => {
      unsubscribeState();
      unsubscribeConnection();
      unsubscribeEventLog();
      unsubscribeGiftCatalog();
      socket.destroy();
      socketRef.current = null;
    };
  }, []);

  const sendSimulateEvent = useCallback((event: SimulatedTiktokEvent) => {
    socketRef.current?.sendSimulateEvent(event);
  }, []);

  const sendCommand = useCallback((command: GameCommand) => {
    socketRef.current?.sendCommand(command);
  }, []);

  const clearEventLog = useCallback(() => setEventLog([]), []);

  return {
    socketRef,
    connection,
    state,
    eventLog,
    giftCatalog,
    sendSimulateEvent,
    sendCommand,
    clearEventLog,
  };
}
