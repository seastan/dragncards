import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { Z_INDEX } from "./functions/common";
import { MobileModalHeader } from "./MobileModal";
import "../../css/mobile-guide.css";

// The Gesture Guide: how the mobile UI is played with fingers, one card per
// gesture, each with a small looping demo (css/mobile-guide.css). The demos
// use drawn placeholder cards, not a game's card art, so they suit every
// plugin; face-down cards use the plugin's own card back when it has one.
//
// Where it shows up:
//   - by itself, the first time the mobile UI is used on a device;
//   - from the Gesture Guide tile in the ☰ menu, and Settings → This device;
//   - as a banner offering it (not the guide itself) to a player back after a
//     long break, or when GUIDE_VERSION has gone up since they last saw it.
//
// Bump GUIDE_VERSION when the gestures change, so returning players hear of it.

export const GUIDE_VERSION = 2;  // 2: Look, not the panel swipe, switches boards (and hands)
const SEEN_KEY = "dragncards_mobile_guide_seen";      // the GUIDE_VERSION last seen
const LAST_USED_KEY = "dragncards_mobile_last_used";  // ms timestamp
const AWAY_MS = 30 * 24 * 60 * 60 * 1000;
const OPEN_EVENT = "dragncards:gesture-guide";

const readNum = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : Number(raw);
  } catch (e) { return null; }
};
const writeNum = (key, n) => {
  try { window.localStorage.setItem(key, String(n)); } catch (e) { /* session only */ }
};

// Opens the guide from anywhere (the mobile table's GestureGuideHost shows it).
export const openGestureGuide = () => window.dispatchEvent(new Event(OPEN_EVENT));

// ── Demo pieces ─────────────────────────────────────────────────────────────

const Finger = ({ anim }) => <div className={`gg-finger ${anim}`}/>;

const Card = ({ x, y, anim = "", back = null, style }) => (
  <div
    className={`gg-card ${back !== null ? "gg-back" : ""} ${anim}`}
    style={{ left: x, top: y, ...(back ? { backgroundImage: `url(${back})` } : null), ...style }}/>
);

const Token = ({ x, y, anim = "", image, n }) => (
  <div className={`gg-token ${anim}`} style={{ left: x, top: y, ...(image ? { backgroundImage: `url(${image})`, backgroundColor: "transparent", border: "none" } : null) }}>
    {n}
  </div>
);

const Stage = ({ children }) => (
  <div className="gg-stage" aria-hidden="true">
    <div className="gg-scene">{children}</div>
  </div>
);

// ── Demos ───────────────────────────────────────────────────────────────────

const TapCardDemo = () => (
  <Stage>
    <Card x={120} y={40}/>
    <div className="gg-sheet">
      <Card x={20} y={14} style={{ width: 60, height: 84 }}/>
      <div className="gg-sheet-line" style={{ left: 100, top: 22, width: 150 }}/>
      <div className="gg-sheet-line" style={{ left: 100, top: 42, width: 120 }}/>
      <div className="gg-sheet-line" style={{ left: 100, top: 62, width: 135 }}/>
      <div className="gg-sheet-line" style={{ left: 100, top: 82, width: 100 }}/>
    </div>
    <Finger anim="gg-tap-finger"/>
  </Stage>
);

const DragCardDemo = () => (
  <Stage>
    <div className="gg-slot" style={{ left: 20, top: 35, width: 100, height: 80 }}/>
    <div className="gg-slot" style={{ left: 160, top: 35, width: 100, height: 80 }}/>
    <Card x={40} y={47} anim="gg-drag-card"/>
    <Finger anim="gg-drag-finger"/>
  </Stage>
);

const FlingDemo = () => (
  <Stage>
    <div className="gg-slot" style={{ left: 213, top: 45, width: 44, height: 60 }}/>
    <Card x={30} y={47} anim="gg-fling-card"/>
    <Finger anim="gg-fling-finger"/>
  </Stage>
);

const PileDemo = ({ back }) => (
  <Stage>
    <Card x={124} y={54} back={back}/>
    <Card x={122} y={52} back={back}/>
    <Card x={120} y={50} back={back}/>
    <div className="gg-popup">
      <div className="gg-popup-row" style={{ background: "#525357" }}>Select top card</div>
      <div className="gg-popup-row"><span className="gg-sheet-line" style={{ position: "static", width: 80, height: 6, display: "block" }}/></div>
      <div className="gg-popup-row" style={{ marginBottom: 0 }}><span className="gg-sheet-line" style={{ position: "static", width: 60, height: 6, display: "block" }}/></div>
    </div>
    <Finger anim="gg-pile-finger"/>
  </Stage>
);

const RadialDemo = ({ tokenImage }) => (
  <Stage>
    <div className="gg-ring">
      <div className="gg-hub"/>
      {[0, 1, 2, 3, 4].map(i => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        return (
          <div
            key={i}
            className={`gg-bubble ${i === 0 ? "gg-pick" : ""}`}
            style={{ left: 48 * Math.cos(a) - 14, top: 48 * Math.sin(a) - 14, ...(i === 2 && tokenImage ? { backgroundImage: `url(${tokenImage})` } : null) }}/>
        );
      })}
    </div>
    <Finger anim="gg-radial-finger"/>
  </Stage>
);

const PanelDemo = ({ back }) => (
  <Stage>
    <div className="gg-strip">
      <div className="gg-strip-pages">
        <div className="gg-strip-page">Player 1<span className="gg-look">Look</span></div>
        <div className="gg-strip-page">Player 2<span className="gg-look">Look</span></div>
      </div>
    </div>
    <div className="gg-boards">
      <div className="gg-boards-inner">
        {/* Player 1: board, and your own hand below it. */}
        <Card x={30} y={6}/>
        <Card x={80} y={6}/>
        <Card x={130} y={6}/>
        <div className="gg-handband" style={{ left: 0 }}/>
        <Card x={60} y={66}/>
        <Card x={106} y={66}/>
        <Card x={152} y={66}/>
        {/* Player 2: their board and their hand, face down unless they show it. */}
        <Card x={310} y={6}/>
        <Card x={360} y={6}/>
        <div className="gg-handband" style={{ left: 280 }}/>
        <Card x={340} y={66} back={back}/>
        <Card x={386} y={66} back={back}/>
        <Card x={432} y={66} back={back}/>
        <Card x={478} y={66} back={back}/>
      </div>
    </div>
    <Finger anim="gg-panel-finger"/>
  </Stage>
);

const TokenDemo = ({ tokenImage }) => (
  <Stage>
    <Card x={120} y={40}/>
    <Token x={129} y={57} anim="gg-tok-token" image={tokenImage} n={1}/>
    <Finger anim="gg-tok-finger"/>
  </Stage>
);

const SliderDemo = ({ tokenImage }) => (
  <Stage>
    <div className="gg-sl-pill">
      <div className="gg-sl-n gg-sl-n1">+1</div>
      <div className="gg-sl-n gg-sl-n2">+2</div>
      <div className="gg-sl-n gg-sl-n3">+3</div>
    </div>
    <Card x={120} y={62}/>
    <Token x={129} y={79} anim="gg-sl-token" image={tokenImage} n={3}/>
    <Finger anim="gg-sl-finger"/>
  </Stage>
);

const UndoDemo = () => (
  <Stage>
    <div className="gg-cap gg-cap-undo">Tap: undo</div>
    <div className="gg-cap gg-cap-redo">Hold: redo</div>
    <div className="gg-slot" style={{ left: 45, top: 32, width: 50, height: 66 }}/>
    <div className="gg-slot" style={{ left: 185, top: 32, width: 50, height: 66 }}/>
    <Card x={190} y={37} anim="gg-undo-card"/>
    <div className="gg-undo-btn">↶</div>
    <Finger anim="gg-undo-finger"/>
  </Stage>
);

const ReorderDemo = () => (
  <Stage>
    <div className="gg-favbar"/>
    <div className="gg-fav gg-fav1" style={{ left: 90 }}>●</div>
    <div className="gg-fav gg-fav2" style={{ left: 150 }}>▲</div>
    <div className="gg-fav" style={{ left: 210 }}>■</div>
    <div className="gg-fav gg-fav0" style={{ left: 30 }}>★</div>
    <Finger anim="gg-favr-finger"/>
  </Stage>
);

const RowDemo = () => (
  <Stage>
    <div className="gg-row">
      <div className="gg-row-inner">
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <Card key={i} x={10 + 46 * i} y={10}/>)}
      </div>
    </div>
    <Finger anim="gg-row-finger"/>
  </Stage>
);

const DrawerDemo = ({ back }) => (
  <Stage>
    <div className="gg-drawer">
      <div className="gg-label" style={{ left: 8, top: 8 }}>Hidden piles</div>
      <div className="gg-slot" style={{ left: 27, top: 27, width: 46, height: 62 }}/>
    </div>
    <div className="gg-slot" style={{ left: 160, top: 30, width: 100, height: 80 }}/>
    <Card x={30} y={30} anim="gg-drawer-card"/>
    <div className="gg-piles-btn">▤</div>
    <Finger anim="gg-drawer-finger"/>
  </Stage>
);

// ── The guide ───────────────────────────────────────────────────────────────

const GestureCard = ({ title, children, demo }) => (
  <div style={{ background: "#1f2937", borderRadius: 12, padding: 12, marginBottom: 12 }}>
    {demo}
    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>{title}</div>
    <div style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.4, marginTop: 3 }}>{children}</div>
  </div>
);

const Section = ({ title, children }) => (
  <div style={{ marginTop: 18 }}>
    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#9ca3af", textTransform: "uppercase", margin: "0 2px 8px" }}>{title}</div>
    {children}
  </div>
);

export const GestureGuide = ({ onClose }) => {
  const gameDef = useGameDefinition();
  const back = Object.values(gameDef?.cardBacks || {}).find(b => b?.imageUrl)?.imageUrl || "";
  const firstTokenType = (gameDef?.hotkeys?.token || []).find(h => h.tokenType)?.tokenType;
  const tokenImage = gameDef?.tokens?.[firstTokenType]?.imageUrl || null;
  const hasFling = !!gameDef?.cardFling;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z_INDEX.Alert + 20,
        background: "#111827",
        color: "white",
        overflowY: "auto",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        overscrollBehavior: "contain",
      }}>
      <MobileModalHeader title="Gesture Guide" onClose={onClose}/>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "8px 14px 24px" }}>
        <div style={{ fontSize: 14, color: "#d1d5db", lineHeight: 1.4, marginTop: 8 }}>
          The mobile table is played with your fingers. You can come back to this guide at any time
          from <b>Gesture Guide</b> in the ☰ menu.
        </div>

        <Section title="Cards">
          <GestureCard title="Tap a card" demo={<TapCardDemo/>}>
            Opens the card's view: a big image, its tokens to adjust, and its menu and hotkeys.
          </GestureCard>
          <GestureCard title="Drag a card" demo={<DragCardDemo/>}>
            Press on a card and move it anywhere on the table.
          </GestureCard>
          {hasFling &&
            <GestureCard title="Flick a card" demo={<FlingDemo/>}>
              Drag a card and let go while it's moving fast. The game does its flick action with it,
              usually discarding it.
            </GestureCard>}
          <GestureCard title="Scroll a row" demo={<RowDemo/>}>
            When a row or fan has more cards than fit, swipe sideways along it to scroll.
          </GestureCard>
        </Section>

        <Section title="Piles">
          <GestureCard title="Tap the top of a pile" demo={<PileDemo back={back}/>}>
            Opens the pile's menu. Its first option, <i>Select top card</i>, opens that card's view.
          </GestureCard>
          <GestureCard title="Hidden piles" demo={<DrawerDemo back={back}/>}>
            The <b>Piles</b> button at the bottom slides out the piles kept off the table. Drag cards onto
            them and off them.
          </GestureCard>
        </Section>

        <Section title="Favourites and hotkeys">
          <GestureCard title="Press the table for favourites" demo={<RadialDemo tokenImage={tokenImage}/>}>
            Press anywhere on the table away from cards: your favourite hotkeys open in a ring around your
            finger. Slide to one and let go to use it, or come back to the middle to cancel.
          </GestureCard>
          <GestureCard title="Rearrange favourites" demo={<ReorderDemo/>}>
            In the favourites bar (the <b>Favorites</b> button shows it), hold a favourite and drag it along
            the bar. Star or unstar hotkeys in the <b>Hotkeys</b> menu.
          </GestureCard>
          <GestureCard title="Token hotkeys" demo={<TokenDemo tokenImage={tokenImage}/>}>
            Pick a token in the <b>Hotkeys</b> menu (or from your favourites) to switch it on. Then tap a
            card to add a token, and swipe down on a card to remove one. Tap the table to switch it off.
          </GestureCard>
          <GestureCard title="Add or remove several tokens" demo={<SliderDemo tokenImage={tokenImage}/>}>
            With a token switched on, swipe sideways on a card to open a slider. Keep dragging to pick how
            many, right to add and left to remove, and let go.
          </GestureCard>
        </Section>

        <Section title="Players and undo">
          <GestureCard title="Look at another player's board" demo={<PanelDemo back={back}/>}>
            Swipe the player panel at the top right to see each player's stats. Tap <b>Look</b> on a player
            to put their board and hand on the table (cards they haven't shown you stay face down). Tap
            <b> Look</b> on your own panel to come back.
          </GestureCard>
          <GestureCard title="Undo and redo" demo={<UndoDemo/>}>
            Tap <b>Undo</b> at the bottom to take back the last action. Hold it to redo.
          </GestureCard>
        </Section>

        <button
          type="button"
          onClick={onClose}
          className="mobile-sheet-button"
          style={{ width: "100%", marginTop: 12, padding: "14px 0", borderRadius: 10, border: "none", color: "white", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
          Got it
        </button>
      </div>
    </div>
  );
};

// ── Where it shows up ───────────────────────────────────────────────────────

const GuideBanner = ({ text, onOpen, onDismiss }) => (
  <div
    onClick={(e) => e.stopPropagation()}
    style={{
      position: "absolute",
      left: 8,
      right: 8,
      // At the bottom of the table, clear of the ☰ menu strip and of game
      // alerts, which come down from the top (inside the table's own stacking
      // context, so no z-index here could put them above this). Above the
      // table (z-index 0), under the sheets and menus.
      bottom: 8,
      zIndex: 10,
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 6px 8px 12px",
      borderRadius: 10,
      background: "#1d4ed8",
      boxShadow: "0 6px 16px rgba(0,0,0,0.5)",
      color: "white",
      fontSize: 13,
      lineHeight: 1.3,
    }}>
    <div style={{ flex: 1, minWidth: 0 }}>{text}</div>
    <button
      type="button"
      onClick={onOpen}
      style={{ flexShrink: 0, padding: "7px 10px", borderRadius: 8, border: "none", background: "white", color: "#1d4ed8", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
      Gesture Guide
    </button>
    <button
      type="button"
      aria-label="Dismiss"
      onClick={onDismiss}
      style={{ flexShrink: 0, width: 32, height: 32, border: "none", background: "transparent", color: "white", fontSize: 16, cursor: "pointer" }}>
      <FontAwesomeIcon icon={faTimes}/>
    </button>
  </div>
);

// Mounted by the mobile table: opens the guide the first time, offers it to a
// returning player, and shows it whenever openGestureGuide() is called.
export const GestureGuideHost = ({ onOpen }) => {
  const [open, setOpen] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    const seen = readNum(SEEN_KEY);
    const lastUsed = readNum(LAST_USED_KEY);
    if (seen === null) setOpen(true);
    else if (seen < GUIDE_VERSION) setBanner("Some gestures have changed since you last looked.");
    else if (lastUsed && Date.now() - lastUsed > AWAY_MS) setBanner("Welcome back! Need a reminder of the gestures?");
    writeNum(LAST_USED_KEY, Date.now());

    const show = () => { setBanner(null); setOpen(true); };
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  useEffect(() => { if (open && onOpen) onOpen(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const markSeen = () => writeNum(SEEN_KEY, GUIDE_VERSION);
  return (
    <>
      {banner && !open &&
        <GuideBanner
          text={banner}
          onOpen={() => { setBanner(null); setOpen(true); }}
          onDismiss={() => { markSeen(); setBanner(null); }}/>}
      {open && <GestureGuide onClose={() => { markSeen(); setOpen(false); }}/>}
    </>
  );
};
