import { TikTokClient } from "./tiktok/TikTokClient.js";
import { WebSocketServer } from "./websocket/WebSocketServer.js";
import { DEFAULT_GIFT_CATALOG_CONFIG, GiftCatalog } from "./gift/GiftCatalog.js";
import { GiftRouter } from "./gift/GiftRouter.js";
import { GiftProcessor } from "./gift/GiftProcessor.js";
import { EnemyGiftHandler } from "./gift/EnemyGiftHandler.js";
import { TowerGiftHandler } from "./gift/TowerGiftHandler.js";
import { ViewerStateService } from "./gift/ViewerStateService.js";
import { MatchStateService } from "./gift/MatchStateService.js";
import type { GiftEventSender } from "./gift/types.js";

const main = (): void => {
  const port = Number(process.env.PORT ?? 3000);
  const username = process.env.TIKTOK_USERNAME;

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

  webSocketServer.on("message", (packet) => {
    if (packet.event === "start_game") {
      matchState.startMatch();
    } else if (packet.event === "finish_game") {
      matchState.finishMatch();
    }
  });

  console.log("Server started");
  if (username === undefined) {
    console.log("TIKTOK_USERNAME not set, skipping TikTok connection");
    return;
  }

  const tiktok = new TikTokClient(username);
  void tiktok.connect().catch((error: unknown) => {
    console.error(`Failed to connect to TikTok: ${String(error)}`);
  });
  tiktok.on("gift", (event) => giftProcessor.handleGift(event));
  tiktok.on("like", (event) => giftProcessor.handleLike(event));
};

main();
