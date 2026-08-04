import { TikTokClient } from "./tiktok/TikTokClient.js";
import { WebSocketServer } from "./websocket/WebSocketServer.js";

const main = (): void => {
  const port = Number(process.env.PORT ?? 3000);
  const username = process.env.TIKTOK_USERNAME;
  console.log("Server started");
  new WebSocketServer(port);
  if (username === undefined) {
    console.log("TIKTOK_USERNAME not set, skipping TikTok connection");
    return;
  }
  const tiktok = new TikTokClient(username);
  void tiktok.connect().catch((error: unknown) => {
    console.error(`Failed to connect to TikTok: ${String(error)}`);
  });
};

main();
