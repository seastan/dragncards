import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faComment, faTimes, faEye, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import Dnc3DTable from "../engine-dnc3d/Dnc3DTable";
import { MenuBar } from "../../components/basic/Menu";
import { TopBarMenu } from "./TopBarMenu";
import { TopBarView } from "./TopBarView";
import { TopBarBuilder } from "./TopBarBuilder";
import { TopBarShared } from "./TopBarShared";
import { TopBarUser } from "./TopBarUser";
import MessageBox from "../messages/MessageBox";
import { useLayout } from "./hooks/useLayout";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useDoActionList } from "./hooks/useDoActionList";
import { usePlayerIList } from "./hooks/usePlayerIList";
import { useFormatGroupId } from "./hooks/useFormatGroupId";
import { useGameL10n } from "./hooks/useGameL10n";
import { useBrowseTopN } from "./hooks/useBrowseTopN";
import useProfile from "../../hooks/useProfile";
import { setDropdownMenu } from "../store/playerUiSlice";
import { Z_INDEX } from "./functions/common";

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
const PILE_ROW_H = 72;   // the drawer shows 4 rows before it scrolls

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

// Menu / View / Builder, dropped down from ☰ over the top of the table.
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
    </MenuBar>
  </div>
);

// ── Hidden piles ───────────────────────────────────────────────────────────

const PileIconButton = ({ icon, onClick }) => (
  <div
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    style={{
      ...tapStyle,
      width: 34,
      height: 30,
      borderRadius: 6,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(255,255,255,0.1)",
      color: "rgba(255,255,255,0.85)",
      fontSize: 14,
    }}>
    <FontAwesomeIcon icon={icon}/>
  </div>
);

const HiddenPileRow = ({ groupId, onDone }) => {
  const dispatch = useDispatch();
  const gameL10n = useGameL10n();
  const browseTopN = useBrowseTopN();
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const group = useSelector(state => state?.gameUi?.game?.groupById?.[groupId]);
  const count = group?.stackIds?.length || 0;
  if (!group || count === 0) return null;   // empty piles stay hidden
  const label = gameL10n(group.label);
  return (
    <div style={{
      height: PILE_ROW_H,
      flexShrink: 0,
      boxSizing: "border-box",
      padding: "6px 8px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 8, background: "rgba(255,255,255,0.15)" }}>{count}</span>
      </div>
      {playerN &&
        <div style={{ display: "flex", gap: 6 }}>
          <PileIconButton icon={faEye} onClick={() => { browseTopN(groupId, "All"); onDone(); }}/>
          <PileIconButton icon={faBars} onClick={() => {
            dispatch(setDropdownMenu({ type: "group", group, title: label }));
            onDone();
          }}/>
        </div>
      }
    </div>
  );
};

const HiddenPilesDrawer = ({ open, onClose }) => {
  const layout = useLayout();
  const formatGroupId = useFormatGroupId();
  const groupById = useSelector(state => state?.gameUi?.game?.groupById);
  const groupIds = (layout?.hiddenPiles || []).map(formatGroupId);
  const nonEmpty = groupIds.filter(id => groupById?.[id]?.stackIds?.length > 0);
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: 0,
        bottom: 8,
        width: "33.333%",
        minWidth: 128,
        maxHeight: PILE_ROW_H * 4,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        display: "flex",
        flexDirection: "column",
        background: "rgba(24,24,30,0.97)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderLeft: "none",
        borderRadius: "0 12px 12px 0",
        boxShadow: "6px 0 20px rgba(0,0,0,0.6)",
        color: "white",
        transform: open ? "translateX(0)" : "translateX(-105%)",
        transition: "transform 0.2s ease-out",
        visibility: open ? "visible" : "hidden",
        zIndex: Z_INDEX.ChatHover,
      }}>
      {nonEmpty.length === 0
        ? <div style={{ padding: 12, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>No hidden piles have cards.</div>
        : nonEmpty.map(id => <HiddenPileRow key={id} groupId={id} onDone={onClose}/>)}
    </div>
  );
};

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
  const [pilesOpen, setPilesOpen] = useState(false);

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
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {/* Flat: on a phone the tilt only costs space and sharpness. */}
        <Dnc3DTable
          tiltDeg={0}
          game={game}
          layoutRegions={layout?.regions}
          layoutTextBoxes={layout?.textBoxes}
          layoutTableButtons={layout?.tableButtons}
          gameDef={gameDef}
          language={language}
          doActionList={doActionList}
        />
        {menuOpen && <MenuRow/>}
        <HiddenPilesDrawer open={pilesOpen} onClose={() => setPilesOpen(false)}/>
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
