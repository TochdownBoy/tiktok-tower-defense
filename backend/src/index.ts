import { TikTokClient, formatTikTokError } from "./tiktok/TikTokClient.js";
import { WebSocketServer, type SimulateTiktokEventPacket } from "./websocket/WebSocketServer.js";
import { DEFAULT_GIFT_CATALOG_CONFIG, GiftCatalog } from "./gift/GiftCatalog.js";
import { GiftRouter } from "./gift/GiftRouter.js";
import { GiftProcessor } from "./gift/GiftProcessor.js";
import { EnemyGiftHandler } from "./gift/EnemyGiftHandler.js";
import { TowerGiftHandler } from "./gift/TowerGiftHandler.js";
import { ViewerStateService } from "./gift/ViewerStateService.js";
import { MatchStateService } from "./gift/MatchStateService.js";
import type { GiftEventSender } from "./gift/types.js";
import { createTikTokEventDispatcher, isTikTokEvent } from "./live/TikTokEventDispatcher.js";

const main = (): void => {
  const port = Number(process.env.PORT ?? 3000);
  const username = process.env.TIKTOK_USERNAME?.trim() ?? "";

  const webSocketServer = new WebSocketServer(port);

  const catalog = new GiftCatalog(DEFAULT_GIFT_CATALOG_CONFIG);
  const viewerState = new ViewerStateService();
  const matchState = new MatchStateService(viewerState, catalog.maxTowers, catalog.likeThreshold);
  const towerHandler = new TowerGiftHandler(viewerState, matchState);
  const enemyHandler = new EnemyGiftHandler(catalog.enemyWeights);
  const router = new GiftRouter(catalog);
  const sender: GiftEventSender = {
    sendEvent: (event) => webSocketServer.broadcastEvent(event),
  };
  const giftProcessor = new GiftProcessor(router, enemyHandler, towerHandler, matchState, sender);

  const dispatch = createTikTokEventDispatcher({
    giftProcessor,
    matchState,
    log: (entry) => {
      webSocketServer.broadcastToDashboards({
        type: "event_log",
        payload: { timestamp: Date.now(), ...entry },
      });
    },
  });

  webSocketServer.on("message", (packet) => {
    if (packet.event === "start_game") {
      matchState.startMatch();
    } else if (packet.event === "finish_game") {
      matchState.finishMatch();
    }
  });

  webSocketServer.on("game_disconnected", () => {
    matchState.finishMatch();
  });

  webSocketServer.on("simulate_tiktok_event", (packet: SimulateTiktokEventPacket) => {
    if (isTikTokEvent(packet.event)) {
      dispatch(packet.event);
    } else {
      console.warn("[live] invalid simulate_tiktok_event payload");
    }
  });

  webSocketServer.on("dashboard_registered", () => {
    webSocketServer.broadcastToDashboards({
      type: "gift_catalog",
      payload: catalog.getGiftNames(),
    });
  });

  console.log("Server started");
  if (username === "") {
    console.log("TIKTOK_USERNAME not set, skipping TikTok connection");
    return;
  }
  if (!process.env.TIKTOOL_API_KEY?.trim()) {
    console.log(
      "TIKTOOL_API_KEY not set, skipping TikTok connection. Get a free key at https://tik.tools",
    );
    return;
  }

  const tiktok = connectWithRetry(username);
  tiktok.on("gift", dispatch);
  tiktok.on("like", dispatch);
  tiktok.on("follow", dispatch);
  tiktok.on("comment", dispatch);
  tiktok.on("share", dispatch);
  tiktok.on("member", dispatch);
};

const RETRY_BASE_DELAY_MS = 30_000;
const RETRY_MAX_DELAY_MS = 5 * 60_000;
const RETRY_BACKOFF_FACTOR = 2;

const connectWithRetry = (username: string): TikTokClient => {
  const apiKey = process.env.TIKTOOL_API_KEY?.trim() ?? "";
  const tiktok = new TikTokClient(username, {
    apiKey,
    signServerUrl: process.env.TIKTOOL_SIGN_SERVER_URL?.trim() || undefined,
    sessionId: process.env.TIKTOOL_SESSION_ID?.trim() || undefined,
    roomId: process.env.TIKTOOL_ROOM_ID?.trim() || undefined,
  });

  const tryConnect = (attempt: number): void => {
    tiktok.connect().catch((error: unknown) => {
      console.error(
        `[tiktok] connection attempt ${attempt} failed for @${username}:\n${formatTikTokError(error)}`,
      );
      const delay = Math.min(
        RETRY_BASE_DELAY_MS * RETRY_BACKOFF_FACTOR ** (attempt - 1),
        RETRY_MAX_DELAY_MS,
      );
      console.log(`[tiktok] retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1})...`);
      setTimeout(() => tryConnect(attempt + 1), delay);
    });
  };

  tryConnect(1);
  return tiktok;
};

main();
