import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DropdownMenuCommon } from "./DropdownMenuCommon";
import { MobileCardWithTokens } from "./MobileCardTokens";
import { MobileHotkeyList, useCardHotkeyItems, useRunHotkey } from "./MobileHotkeys";
import { setActiveCardId, setDropdownMenu } from "../store/playerUiSlice";
import { Z_INDEX } from "./functions/common";

// Mobile UI's replacement for the floating card / group menu, which a phone
// screen clips. A full-screen sheet:
//   top 1/2  — the card and its token adjusters (MobileCardTokens); a group
//              menu shows its title
//   next 1/3 — the menu's options, scrollable — or, for a card, its hotkeys
//   last 1/6 — Hotkeys / Menu toggle (cards only) and "View table", which
//              closes the sheet
// The options are the regular menus (DropdownMenuCommon) in embedded mode, so
// everything a plugin adds to its card/group menus shows up here unchanged.

const SheetButton = ({ onClick, children, active = false }) => (
  <button
    type="button"
    onClick={onClick}
    className="mobile-sheet-button"
    style={{
      flex: 1,
      height: 48,
      borderRadius: 6,
      border: `1px solid ${active ? "#9ca3af" : "#4b5563"}`,
      color: "#e5e7eb",
      fontSize: 16,
      fontWeight: 500,
      letterSpacing: "0.01em",
      touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
    }}>
    {children}
  </button>
);

export const MobileMenuSheet = React.memo(() => {
  const dispatch = useDispatch();
  const dropdownMenu = useSelector(state => state?.playerUi?.dropdownMenu);
  const cardHotkeys = useCardHotkeyItems();
  const runHotkey = useRunHotkey();
  const [showHotkeys, setShowHotkeys] = useState(false);
  // Each sheet opens on its menu.
  const sheetKey = dropdownMenu ? `${dropdownMenu.type}:${dropdownMenu.cardId || dropdownMenu.group?.id}` : null;
  useEffect(() => { setShowHotkeys(false); }, [sheetKey]);
  if (!dropdownMenu) return null;

  const close = () => {
    dispatch(setDropdownMenu(null));
    dispatch(setActiveCardId(null));
  };
  const isCard = dropdownMenu.type === "card";
  const listingHotkeys = isCard && showHotkeys;

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
        onClick={isCard ? undefined : close}
        style={{ flex: "0 0 50%", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, boxSizing: "border-box" }}>
        {isCard
          ? <MobileCardWithTokens cardId={dropdownMenu.cardId} onImageTap={close}/>
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
        {listingHotkeys
          ? <>
              <div className="menu-title" style={{ padding: "8px 0 4px" }}>{dropdownMenu.title}: hotkeys</div>
              <MobileHotkeyList items={cardHotkeys} onRun={(item) => { runHotkey(item); close(); }}/>
            </>
          : <DropdownMenuCommon mouseX={0} mouseY={0} embedded/>}
      </div>
      {/* Styled like the game's own controls (top bar, Get Up / Look):
          gray-700 on a gray-800 strip, gray-600 border, gray-200 text. */}
      <div style={{
        flex: "1 1 auto",
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "10px 16px",
        background: "#1f2937",
      }}>
        {isCard && cardHotkeys.length > 0 &&
          <SheetButton onClick={() => setShowHotkeys(!showHotkeys)} active={showHotkeys}>
            {showHotkeys ? "Menu" : "Hotkeys"}
          </SheetButton>}
        <SheetButton onClick={close}>View table</SheetButton>
      </div>
    </div>
  );
});
