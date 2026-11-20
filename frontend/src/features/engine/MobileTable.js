import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faComment, faTimes, faEye, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import Dnc3DTable from "../engine-dnc3d/Dnc3DTable";
import { MenuBar } from "../../components/basic/Menu";
import { TopBarMenu } from "./TopBarMenu";
import { TopBarView } from "./TopBarView";
import { TopBarBuilder } from "./TopBarBuilder";
import { MobileSiteMenu } from "./MobileSiteMenu";
import { TopBarShared } from "./TopBarShared";
import { TopBarUser } from "./TopBarUser";
import MessageBox from "../messages/MessageBox";
import { useLayout } from "./hooks/useLayout";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useDoActionList } from "./hooks/useDoActionList";
import { usePlayerIList } from "./hooks/usePlayerIList";
import useProfile from "../../hooks/useProfile";
import { Z_INDEX } from "./functions/common";
import { useHiddenPilesGeometry, hiddenPileRegions, HiddenPilesDrawer, SLIDE_MS } from "./MobileHiddenPiles";

// Phone-first table (mobile UI). Portrait, flat (0° tilt) 3D renderer, driven by
// the plugin's gameDef.mobileLayout (see functions/mobileLayout.js).
//
//   top bar    — ☰ (drops down Menu / View / Builder) and the shared counters on
//                the left half; the players on the right half, one at a time,
//                swiped sideways to see the others
//   table      — the mobile layout
//   bottom bar — hidden piles (a drawer of the layout's hiddenPiles) and chat
//
// Sizes are in px, not dvh: dvh text on a phone is unreadably small, and touch
// targets need a physical minimum (~44px).

const TOP_H = 64;
const MENU_ROW_H = 44;
const BOTTOM_H = 52;

const tapStyle = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  cursor: "pointer",
};

const barButton = {
  ...tapStyle,
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(255,255,255,0.85)",
  fontSize: 20,
};

// ── Top bar ────────────────────────────────────────────────────────────────

// One player per page, swiped sideways (native scroll-snap, so it's a real
// finger drag). Opens on your own seat.
const PlayerCarousel = () => {
  const playerIList = usePlayerIList();
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const ref = useRef(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const el = ref.current;
    const i = playerIList.indexOf(playerN);
    if (el && i > 0) el.scrollLeft = i * el.clientWidth;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerN, playerIList.length]);

  const onScroll = () => {
    const el = ref.current;
    if (el && el.clientWidth) setPage(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div style={{ position: "relative", height: "100%", minWidth: 0 }}>
      <div
        ref={ref}
        onScroll={onScroll}
        style={{
          height: "100%",
          display: "flex",
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}>
        {playerIList.map((playerI) => (
          <div key={playerI} style={{ flex: "0 0 100%", height: "100%", scrollSnapAlign: "start", fontSize: 12 }}>
            <TopBarUser playerI={playerI}/>
          </div>
        ))}
      </div>
      {playerIList.length > 1 &&
        <div style={{ position: "absolute", bottom: 2, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4, pointerEvents: "none" }}>
          {playerIList.map((playerI, i) => (
            <span key={playerI} style={{ width: 5, height: 5, borderRadius: 3, background: i === page ? "white" : "rgba(255,255,255,0.3)" }}/>
          ))}
        </div>
      }
    </div>
  );
};

const MobileTopBar = ({ menuOpen, setMenuOpen }) => (
  <div
    onClick={(e) => e.stopPropagation()}
    style={{
      height: TOP_H,
      flexShrink: 0,
      display: "flex",
      background: "#1f2937",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      color: "white",
      position: "relative",
      zIndex: Z_INDEX.TopBarHover,
    }}>
    <div style={{ width: "50%", display: "flex", minWidth: 0 }}>
      <div style={{ ...barButton, width: 40, flexShrink: 0 }} onClick={() => setMenuOpen(!menuOpen)}>
        <FontAwesomeIcon icon={menuOpen ? faTimes : faBars}/>
      </div>
      <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
        <TopBarShared/>
      </div>
    </div>
    <div style={{ width: "50%", minWidth: 0, borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <PlayerCarousel/>
    </div>
  </div>
);

// Menu / View / Builder, plus the site navbar's links (Site), dropped down
// from ☰ over the top of the table.
const MenuRow = () => (
  <div
    onClick={(e) => e.stopPropagation()}
    className="bg-gray-800 text-gray-200"
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: MENU_ROW_H,
      zIndex: Z_INDEX.TopBarHover,
      borderBottom: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 6px 16px rgba(0,0,0,0.5)",
      fontSize: 15,
    }}>
    <MenuBar>
      <TopBarMenu />
      <TopBarView />
      <TopBarBuilder />
      <MobileSiteMenu />
    </MenuBar>
  </div>
);

// ── Hidden piles: see MobileHiddenPiles.js ─────────────────────────────────

// An eye over a deck of cards.
const HiddenPilesIcon = () => (
  <span style={{ position: "relative", display: "inline-flex", width: 26, height: 24 }}>
    <FontAwesomeIcon icon={faLayerGroup} style={{ position: "absolute", left: 1, bottom: 0, width: 22, height: 18, opacity: 0.75 }}/>
    <span style={{
      position: "absolute",
      right: -2,
      top: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      background: "#1f2937",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <FontAwesomeIcon icon={faEye} style={{ width: 11, height: 11 }}/>
    </span>
  </span>
);

// ── Bottom bar ─────────────────────────────────────────────────────────────

const BottomButton = ({ active, onClick, children, label }) => (
  <div
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    style={{
      ...barButton,
      flex: "0 0 64px",
      flexDirection: "column",
      gap: 2,
      background: active ? "rgba(255,255,255,0.12)" : "transparent",
      borderRadius: 8,
    }}>
    {children}
    <span style={{ fontSize: 9, letterSpacing: "0.04em", opacity: 0.7 }}>{label}</span>
  </div>
);

const MobileBottomBar = ({ pilesOpen, setPilesOpen, chatOpen, setChatOpen }) => (
  <div
    onClick={(e) => e.stopPropagation()}
    style={{
      height: BOTTOM_H,
      flexShrink: 0,
      display: "flex",
      alignItems: "stretch",
      gap: 4,
      padding: "3px 6px",
      boxSizing: "border-box",
      background: "#1f2937",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      position: "relative",
      zIndex: Z_INDEX.TopBarHover,
    }}>
    <BottomButton active={pilesOpen} label="PILES" onClick={() => { setPilesOpen(!pilesOpen); setChatOpen(false); }}>
      <HiddenPilesIcon/>
    </BottomButton>
    <div style={{ flex: 1 }}/>
    <BottomButton active={chatOpen} label="CHAT" onClick={() => { setChatOpen(!chatOpen); setPilesOpen(false); }}>
      <FontAwesomeIcon icon={chatOpen ? faTimes : faComment}/>
    </BottomButton>
  </div>
);

// ── Table ──────────────────────────────────────────────────────────────────

export const MobileTable = React.memo(() => {
  const gameDef = useGameDefinition();
  const layout = useLayout();
  const game = useSelector(state => state?.gameUi?.game);
  const language = useProfile()?.language;
  const doActionList = useDoActionList();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // Hidden piles drawer: "closed" → "opening" (sliding in) → "open" (its piles
  // are live table regions) → "closing" (piles gone, sliding out) → "closed".
  // The piles only join the table once the panel is in place, and leave before
  // it slides away: adding or removing regions rebuilds the table, which would
  // otherwise happen mid-slide.
  const [pilesPhase, setPilesPhase] = useState("closed");
  const [pilesSlidIn, setPilesSlidIn] = useState(false);
  const [pilesPage, setPilesPage] = useState(0);
  const pilesOpen = pilesPhase === "opening" || pilesPhase === "open";
  const setPilesOpen = (open) => {
    if (open && (pilesPhase === "closed" || pilesPhase === "closing")) setPilesPhase("opening");
    if (!open && (pilesPhase === "opening" || pilesPhase === "open")) { setPilesPhase("closing"); setPilesSlidIn(false); }
  };
  // Mounted off-screen first, then slid in on the next frame so the transition
  // runs.
  useEffect(() => {
    if (pilesPhase !== "opening") return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPilesSlidIn(true)));
    return () => cancelAnimationFrame(id);
  }, [pilesPhase]);
  // transitionend can be missed (e.g. the panel re-mounts during a table
  // rebuild), so each slide also completes on a timer.
  useEffect(() => {
    if (pilesPhase !== "opening" && pilesPhase !== "closing") return;
    if (pilesPhase === "opening" && !pilesSlidIn) return;
    const t = setTimeout(() => setPilesPhase(pilesPhase === "opening" ? "open" : "closed"), SLIDE_MS + 60);
    return () => clearTimeout(t);
  }, [pilesPhase, pilesSlidIn]);
  const onPilesSlideEnd = () => {
    if (pilesPhase === "opening" && pilesSlidIn) setPilesPhase("open");
    if (pilesPhase === "closing") setPilesPhase("closed");
  };

  // The drawer's piles are table regions positioned in px, so it needs the
  // table area's size.
  const tableRef = useRef(null);
  const [tableSize, setTableSize] = useState(null);
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const measure = () => setTableSize(s => {
      const w = el.clientWidth, h = el.clientHeight;
      return s && s.w === w && s.h === h ? s : { w, h };
    });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pilesGeometry = useHiddenPilesGeometry(pilesPhase !== "closed", tableSize, pilesPage);
  const pilesLive = pilesPhase === "open" ? pilesGeometry : null;
  const pileRegionsKey = JSON.stringify(pilesLive?.rows?.map(r => r.region) || []);
  const tableRegions = useMemo(
    () => (pilesLive ? { ...layout?.regions, ...hiddenPileRegions(pilesLive) } : layout?.regions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout?.regions, pileRegionsKey]
  );

  // Extend under the notch / home indicator so the safe-area padding below has
  // something to do. Only while this table is mounted: the desktop UI doesn't
  // pad for safe areas, so a global viewport-fit=cover would tuck it under the
  // notch on a landscape iPhone.
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const original = meta.getAttribute("content");
    if (!/viewport-fit/.test(original)) meta.setAttribute("content", `${original}, viewport-fit=cover`);
    return () => meta.setAttribute("content", original);
  }, []);

  return (
    <div
      className="select-none"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#111",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}>
      <MobileTopBar menuOpen={menuOpen} setMenuOpen={setMenuOpen}/>
      <div ref={tableRef} style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {/* Flat: on a phone the tilt only costs space and sharpness. */}
        <Dnc3DTable
          tiltDeg={0}
          game={game}
          layoutRegions={tableRegions}
          layoutTextBoxes={layout?.textBoxes}
          layoutTableButtons={layout?.tableButtons}
          gameDef={gameDef}
          language={language}
          doActionList={doActionList}
          tiltOverlay={pilesGeometry &&
            <HiddenPilesDrawer
              geometry={pilesGeometry}
              slidIn={pilesSlidIn}
              setPage={setPilesPage}
              onDone={() => setPilesOpen(false)}
              onSlideEnd={onPilesSlideEnd}
            />}
        />
        {menuOpen && <MenuRow/>}
        {/* Chat / log sheet. Always mounted — MessageBox only collects messages
            while it exists — and slid out of view when closed. */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "55%",
            transform: chatOpen ? "translateY(0)" : "translateY(105%)",
            transition: "transform 0.2s ease-out",
            visibility: chatOpen ? "visible" : "hidden",
            background: "rgba(17,17,22,0.97)",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "12px 12px 0 0",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.6)",
            zIndex: Z_INDEX.ChatHover,
            fontSize: 14,
            overflow: "hidden",
          }}>
          <MessageBox hover={chatOpen}/>
        </div>
      </div>
      <MobileBottomBar pilesOpen={pilesOpen} setPilesOpen={setPilesOpen} chatOpen={chatOpen} setChatOpen={setChatOpen}/>
    </div>
  );
});
