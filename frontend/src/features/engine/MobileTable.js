import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faComment, faTimes } from "@fortawesome/free-solid-svg-icons";
import Dnc3DTable from "../engine-dnc3d/Dnc3DTable";
import { TopBar } from "./TopBar";
import MessageBox from "../messages/MessageBox";
import { useLayout } from "./hooks/useLayout";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useDoActionList } from "./hooks/useDoActionList";
import { usePlayerIList } from "./hooks/usePlayerIList";
import useProfile from "../../hooks/useProfile";
import { setObservingPlayerN } from "../store/playerUiSlice";
import { getPlayerIColor, Z_INDEX } from "./functions/common";

// Phone-first table (mobile UI). Portrait, always on the 3D renderer, driven by
// the plugin's gameDef.mobileLayout (see functions/mobileLayout.js).
//
// The desktop chrome (sidebar, top bar, touch bar, on-table chat) is replaced
// by one slim strip: a menu button that reveals the regular top bar, a chip per
// player that puts their board on screen, and a chat button that slides chat up
// from the bottom. Sizes are in px, not dvh: dvh text on a phone is unreadably
// small, and touch targets need a physical minimum (~44px).

const STRIP_H = 44;

const stripButton = {
  width: STRIP_H,
  height: STRIP_H,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(255,255,255,0.85)",
  fontSize: 18,
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

const PlayerChip = ({ playerI, label, isObserving, isMe }) => {
  const dispatch = useDispatch();
  const color = getPlayerIColor(playerI);
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        // No "started observing" chat line here, unlike the desktop top bar:
        // flipping between boards is routine on a phone and would flood chat.
        dispatch(setObservingPlayerN(playerI));
      }}
      style={{
        flex: "0 1 auto",
        minWidth: 0,
        maxWidth: 140,
        height: 32,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 10px",
        borderRadius: 16,
        border: `2px solid ${isObserving ? color : "transparent"}`,
        background: isObserving ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
        color: "white",
        fontSize: 13,
        fontWeight: isObserving ? 600 : 400,
        whiteSpace: "nowrap",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0 }}/>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}{isMe ? " (you)" : ""}</span>
    </div>
  );
};

const PlayerChips = () => {
  const playerIList = usePlayerIList();
  const playerInfo = useSelector(state => state?.gameUi?.playerInfo);
  const observingPlayerN = useSelector(state => state?.playerUi?.observingPlayerN);
  const myUserId = useProfile()?.id;
  if (playerIList.length <= 1) return <div style={{ flex: 1 }}/>;
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 6, alignItems: "center", overflowX: "auto", scrollbarWidth: "none" }}>
      {playerIList.map((playerI, i) => {
        const sitting = playerInfo?.[playerI];
        return (
          <PlayerChip
            key={playerI}
            playerI={playerI}
            label={sitting?.alias || `P${i + 1}`}
            isObserving={observingPlayerN === playerI}
            isMe={!!sitting?.id && sitting.id === myUserId}
          />
        );
      })}
    </div>
  );
};

export const MobileTable = React.memo(() => {
  const gameDef = useGameDefinition();
  const layout = useLayout();
  const game = useSelector(state => state?.gameUi?.game);
  const tableAngle = useSelector(state => state?.playerUi?.userSettings?.tableAngle ?? 25);
  const language = useProfile()?.language;
  const doActionList = useDoActionList();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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
      {/* Strip */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          height: STRIP_H,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "linear-gradient(180deg, #1c1c23 0%, #15151b 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          position: "relative",
          zIndex: Z_INDEX.TopBarHover,
        }}>
        <div style={stripButton} onClick={() => setMenuOpen(!menuOpen)}>
          <FontAwesomeIcon icon={menuOpen ? faTimes : faBars}/>
        </div>
        <PlayerChips/>
        <div style={stripButton} onClick={() => setChatOpen(!chatOpen)}>
          <FontAwesomeIcon icon={chatOpen ? faTimes : faComment}/>
        </div>
      </div>
      {/* The regular top bar (menus, counters, seats), on demand. */}
      {menuOpen &&
        <div className="bg-gray-600 text-white w-full" style={{ height: 48, flexShrink: 0, position: "relative", zIndex: Z_INDEX.TopBarHover, fontSize: 12 }}>
          <TopBar/>
        </div>
      }
      {/* Table */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <Dnc3DTable
          tiltDeg={tableAngle}
          game={game}
          layoutRegions={layout?.regions}
          layoutTextBoxes={layout?.textBoxes}
          layoutTableButtons={layout?.tableButtons}
          gameDef={gameDef}
          language={language}
          doActionList={doActionList}
        />
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
    </div>
  );
});
