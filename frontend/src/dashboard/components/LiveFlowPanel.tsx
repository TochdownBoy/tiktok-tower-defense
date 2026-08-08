import { useEffect, useRef, useState } from "react";
import type {
  ConnectionStatus,
  EventLogEntry,
  SimulatedTiktokEvent,
  SimulatedTiktokEventKind,
} from "../../network/types";

export interface LiveFlowPanelProps {
  connection: ConnectionStatus;
  eventLog: EventLogEntry[];
  giftCatalog: string[];
  onSimulate: (event: SimulatedTiktokEvent) => void;
  onClearLog: () => void;
}

const GIFT_META: Record<string, { emoji: string; diamonds: number }> = {
  Rose: { emoji: "🌹", diamonds: 1 },
  Perfume: { emoji: "🧴", diamonds: 10 },
  Doughnut: { emoji: "🍩", diamonds: 100 },
  Tsar: { emoji: "👑", diamonds: 1000 },
  GG: { emoji: "🎁", diamonds: 5 },
  Football: { emoji: "⚽", diamonds: 10 },
  "Finger Heart": { emoji: "🫰", diamonds: 20 },
};

const FALLBACK_GIFTS = [
  "Rose",
  "Perfume",
  "Doughnut",
  "Tsar",
  "GG",
  "Football",
  "Finger Heart",
];

const GIFT_QUANTITIES = [1, 5, 10, 50, 100];
const LIKE_QUICK = [1, 10, 100, 1000, 10000];
const SHARE_QUICK = [1, 10, 100];
const QUICK_COMMENTS = ["hello", "spawn boss", "🔥", "more enemies"];

const KIND_EMOJI: Record<SimulatedTiktokEventKind, string> = {
  gift: "🎁",
  like: "❤️",
  follow: "👤",
  comment: "💬",
  share: "🔄",
  member: "👋",
};

type StressEventKind = "like" | "rose" | "perfume" | "comment" | "share";

const randomSuffix = (): string => Math.random().toString(36).slice(2, 6);

const makeUser = (username: string) => {
  const trimmed = username.trim();
  return {
    uniqueId: `test-${randomSuffix()}`,
    nickname: trimmed.length > 0 ? trimmed : `Test_${randomSuffix()}`,
  };
};

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString("en-GB", { hour12: false });

const toQuantity = (value: string): number =>
  Math.max(1, Math.round(Number(value)) || 1);

export function LiveFlowPanel({
  connection,
  eventLog,
  giftCatalog,
  onSimulate,
  onClearLog,
}: LiveFlowPanelProps) {
  const gifts = giftCatalog.length > 0 ? giftCatalog : FALLBACK_GIFTS;

  const [selectedGift, setSelectedGift] = useState("");
  const [giftQuantity, setGiftQuantity] = useState("1");
  const [likeAmount, setLikeAmount] = useState("100");
  const [followUsername, setFollowUsername] = useState("TestUser");
  const [commentUsername, setCommentUsername] = useState("TestUser");
  const [commentMessage, setCommentMessage] = useState("");
  const [memberUsername, setMemberUsername] = useState("TestViewer");

  const [stressKind, setStressKind] = useState<StressEventKind>("like");
  const [stressAmount, setStressAmount] = useState("100");
  const [stressInterval, setStressInterval] = useState("100");
  const [stressDuration, setStressDuration] = useState("10");
  const [stressRunning, setStressRunning] = useState(false);
  const stressTimerRef = useRef<number | null>(null);

  const quantity = toQuantity(giftQuantity);
  const selected = selectedGift || gifts[0] || "Rose";

  useEffect(() => {
    return () => {
      if (stressTimerRef.current !== null) {
        window.clearInterval(stressTimerRef.current);
      }
    };
  }, []);

  const sendGift = (giftName: string, count: number) => {
    const n = toQuantity(String(count));
    const user = makeUser("");
    onSimulate({
      type: "gift",
      uniqueId: user.uniqueId,
      nickname: user.nickname,
      giftName,
      repeatCount: n,
      diamondCount: (GIFT_META[giftName]?.diamonds ?? 1) * n,
    });
  };

  const sendLikes = (count: number) => {
    const user = makeUser("");
    onSimulate({
      type: "like",
      uniqueId: user.uniqueId,
      nickname: user.nickname,
      likeCount: Math.max(1, count),
    });
  };

  const sendFollow = () => {
    const user = makeUser(followUsername);
    onSimulate({
      type: "follow",
      uniqueId: user.uniqueId,
      nickname: user.nickname,
    });
  };

  const sendComment = () => {
    const user = makeUser(commentUsername);
    onSimulate({
      type: "comment",
      uniqueId: user.uniqueId,
      nickname: user.nickname,
      comment: commentMessage.trim() || "hello",
    });
  };

  const sendShares = (count: number) => {
    for (let i = 0; i < Math.max(1, count); i++) {
      const user = makeUser("");
      onSimulate({
        type: "share",
        uniqueId: user.uniqueId,
        nickname: user.nickname,
      });
    }
  };

  const sendMember = () => {
    const user = makeUser(memberUsername);
    onSimulate({
      type: "member",
      uniqueId: user.uniqueId,
      nickname: user.nickname,
    });
  };

  const emitStressTick = (kind: StressEventKind, amount: number) => {
    for (let i = 0; i < amount; i++) {
      switch (kind) {
        case "like":
          sendLikes(1);
          break;
        case "rose":
          sendGift("Rose", 1);
          break;
        case "perfume":
          sendGift("Perfume", 1);
          break;
        case "comment": {
          const user = makeUser("");
          onSimulate({
            type: "comment",
            uniqueId: user.uniqueId,
            nickname: user.nickname,
            comment:
              QUICK_COMMENTS[Math.floor(Math.random() * QUICK_COMMENTS.length)],
          });
          break;
        }
        case "share":
          sendShares(1);
          break;
      }
    }
  };

  const stopStress = () => {
    if (stressTimerRef.current !== null) {
      window.clearInterval(stressTimerRef.current);
      stressTimerRef.current = null;
    }
    setStressRunning(false);
  };

  const startStress = () => {
    if (stressRunning) return;
    const amount = toQuantity(stressAmount);
    const interval = Math.max(10, Math.round(Number(stressInterval)) || 100);
    const durationMs =
      Math.max(0, Math.round(Number(stressDuration)) || 0) * 1000;
    const endAt = durationMs > 0 ? Date.now() + durationMs : null;
    const tick = () => {
      if (endAt !== null && Date.now() >= endAt) {
        stopStress();
        return;
      }
      emitStressTick(stressKind, amount);
    };
    tick();
    setStressRunning(true);
    stressTimerRef.current = window.setInterval(tick, interval);
  };

  const showsUsername = (entry: EventLogEntry): boolean =>
    entry.kind === "gift" ||
    entry.kind === "follow" ||
    entry.kind === "comment" ||
    entry.kind === "member";

  return (
    <section className="panel live-flow">
      <h2 className="panel__title">LIVE FLOW</h2>
      <div className="live-flow__status">
        <span className="live-flow__status-item">
          <span
            className={`status-dot ${connection.connected ? "status-dot--ok" : "status-dot--err"}`}
          />
          {connection.connected ? "WebSocket Connected" : "Server Disconnected"}
        </span>
        <span className="live-flow__status-item">
          <span
            className={`status-dot ${connection.gameConnected ? "status-dot--ok" : "status-dot--err"}`}
          />
          Game {connection.gameConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="live-flow__grid">
        <section className="panel">
          <h2 className="panel__title">Gifts</h2>
          <div className="gift-list">
            {gifts.map((giftName) => (
              <div key={giftName} className="gift-row">
                <button
                  type="button"
                  className={
                    giftName === selected ? "button--active" : undefined
                  }
                  onClick={() => setSelectedGift(giftName)}
                  title={`${GIFT_META[giftName]?.diamonds ?? 1}💎 each`}
                >
                  {GIFT_META[giftName]?.emoji ?? "🎁"} {giftName}
                </button>
                <button
                  type="button"
                  onClick={() => sendGift(giftName, quantity)}
                >
                  Send
                </button>
              </div>
            ))}
          </div>
          <div className="quantity-row">
            <label className="field__label" htmlFor="live-flow-gift-quantity">
              Quantity
            </label>
            <input
              id="live-flow-gift-quantity"
              type="number"
              min={1}
              value={giftQuantity}
              onChange={(event) => setGiftQuantity(event.target.value)}
            />
            {GIFT_QUANTITIES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setGiftQuantity(String(n))}
              >
                x{n}
              </button>
            ))}
            <button type="button" onClick={() => sendGift(selected, quantity)}>
              Send Gift
            </button>
          </div>
        </section>

        <section className="panel">
          <h2 className="panel__title">Likes</h2>
          <div className="button-row">
            {LIKE_QUICK.map((n) => (
              <button key={n} type="button" onClick={() => sendLikes(n)}>
                +{n.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="quantity-row">
            <label className="field__label" htmlFor="live-flow-like-amount">
              Likes
            </label>
            <input
              id="live-flow-like-amount"
              type="number"
              min={1}
              value={likeAmount}
              onChange={(event) => setLikeAmount(event.target.value)}
            />
            <button type="button" onClick={() => sendLikes(Number(likeAmount))}>
              Send Likes
            </button>
          </div>
        </section>

        <section className="panel">
          <h2 className="panel__title">Follow</h2>
          <label className="field">
            <span className="field__label">Username</span>
            <input
              type="text"
              value={followUsername}
              onChange={(event) => setFollowUsername(event.target.value)}
            />
          </label>
          <button type="button" onClick={sendFollow}>
            Send Follow
          </button>
        </section>

        <section className="panel">
          <h2 className="panel__title">Comment</h2>
          <label className="field">
            <span className="field__label">Username</span>
            <input
              type="text"
              value={commentUsername}
              onChange={(event) => setCommentUsername(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Message</span>
            <input
              type="text"
              value={commentMessage}
              onChange={(event) => setCommentMessage(event.target.value)}
            />
          </label>
          <div className="button-row">
            {QUICK_COMMENTS.map((message) => (
              <button
                key={message}
                type="button"
                onClick={() => setCommentMessage(message)}
              >
                {message}
              </button>
            ))}
          </div>
          <button type="button" onClick={sendComment}>
            Send Comment
          </button>
        </section>

        <section className="panel">
          <h2 className="panel__title">Shares</h2>
          <div className="button-row">
            {SHARE_QUICK.map((n) => (
              <button key={n} type="button" onClick={() => sendShares(n)}>
                +{n} Share{n > 1 ? "s" : ""}
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="panel__title">Viewers</h2>
          <label className="field">
            <span className="field__label">Username</span>
            <input
              type="text"
              value={memberUsername}
              onChange={(event) => setMemberUsername(event.target.value)}
            />
          </label>
          <button type="button" onClick={sendMember}>
            Simulate Join
          </button>
        </section>

        <section className="panel">
          <h2 className="panel__title">Stress Test</h2>
          <div className="stress-row">
            <label className="field">
              <span className="field__label">Event</span>
              <select
                value={stressKind}
                onChange={(event) =>
                  setStressKind(event.target.value as StressEventKind)
                }
              >
                <option value="like">Like</option>
                <option value="rose">Rose gift</option>
                <option value="perfume">Perfume gift</option>
                <option value="comment">Comment</option>
                <option value="share">Share</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Per tick</span>
              <input
                type="number"
                min={1}
                value={stressAmount}
                onChange={(event) => setStressAmount(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Interval (ms)</span>
              <input
                type="number"
                min={10}
                value={stressInterval}
                onChange={(event) => setStressInterval(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Duration (s)</span>
              <input
                type="number"
                min={0}
                value={stressDuration}
                onChange={(event) => setStressDuration(event.target.value)}
              />
            </label>
          </div>
          <div className="button-row">
            <button
              type="button"
              disabled={stressRunning}
              onClick={startStress}
            >
              Start
            </button>
            <button
              type="button"
              disabled={!stressRunning}
              onClick={stopStress}
            >
              Stop
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="log-header">
            <h2 className="panel__title">Live Event Log</h2>
            <button
              type="button"
              onClick={onClearLog}
              disabled={eventLog.length === 0}
            >
              Clear
            </button>
          </div>
          <div className="live-flow__log">
            {eventLog.length === 0 ? (
              <span className="live-flow__log-empty">No events yet</span>
            ) : (
              eventLog.map((entry, index) => (
                <div key={`${entry.timestamp}-${index}`} className="log-entry">
                  <span className="log-entry__time">
                    {formatTime(entry.timestamp)}
                  </span>
                  <span className="log-entry__emoji">
                    {KIND_EMOJI[entry.kind] ?? "📌"}
                  </span>
                  <span className="log-entry__body">
                    {entry.label && (
                      <span className="log-entry__label">{entry.label}</span>
                    )}
                    {showsUsername(entry) && (
                      <span className="log-entry__user">@{entry.username}</span>
                    )}
                    {entry.detail && (
                      <span className="log-entry__detail">{entry.detail}</span>
                    )}
                    {entry.note && (
                      <span className="log-entry__note">({entry.note})</span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
