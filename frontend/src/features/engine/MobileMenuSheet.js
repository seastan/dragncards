import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { DropdownMenuCommon } from "./DropdownMenuCommon";
import { useVisibleFaceSrc } from "./hooks/useVisibleFaceSrc";
import { setActiveCardId, setDropdownMenu } from "../store/playerUiSlice";
import { Z_INDEX } from "./functions/common";

// Mobile UI's replacement for the floating card / group menu, which a phone
// screen clips. A full-screen sheet:
//   top 1/2  — the card, as large as it fits (a group menu shows its title)
//   next 1/3 — the menu's options, scrollable
//   last 1/6 — "View table", which closes the sheet
// The options are the regular menus (DropdownMenuCommon) in embedded mode, so
// everything a plugin adds to its card/group menus shows up here unchanged.

const CardImage = ({ cardId }) => {
  const src = useVisibleFaceSrc(cardId);
  if (!src?.src) return null;
  return (
    <img
      alt=""
      src={src.src}
      onError={(e) => { if (src.default && e.currentTarget.src !== src.default) e.currentTarget.src = src.default; }}
      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.7)" }}
    />
  );
};

export const MobileMenuSheet = React.memo(() => {
  const dispatch = useDispatch();
  const dropdownMenu = useSelector(state => state?.playerUi?.dropdownMenu);
  if (!dropdownMenu) return null;

  const close = () => {
    dispatch(setDropdownMenu(null));
    dispatch(setActiveCardId(null));
  };
  const isCard = dropdownMenu.type === "card";

  return (
    <div
      // Taps inside must not reach Table's handleTableClick, which would close
      // the menu before an option's own click handler runs.
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z_INDEX.DropdownMenu,
        display: "flex",
        flexDirection: "column",
        background: "rgba(10,10,14,0.94)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        color: "white",
      }}>
      <div
        onClick={close}
        style={{ flex: "0 0 50%", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
        {isCard
          ? <CardImage cardId={dropdownMenu.cardId}/>
          : <div style={{ fontSize: 22, fontWeight: 600, textAlign: "center" }}>{dropdownMenu.title}</div>}
      </div>
      <div
        style={{
          flex: "0 0 33.333%",
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          background: "#242526",
          fontSize: 16,
        }}>
        <DropdownMenuCommon mouseX={0} mouseY={0} embedded/>
      </div>
      <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 16px" }}>
        <button
          type="button"
          onClick={close}
          style={{
            width: "100%",
            height: "100%",
            maxHeight: 72,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "#1d4ed8",
            color: "white",
            fontSize: 18,
            fontWeight: 600,
            touchAction: "manipulation",
          }}>
          View table
        </button>
      </div>
    </div>
  );
});
