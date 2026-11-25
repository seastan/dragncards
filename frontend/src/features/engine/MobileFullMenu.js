import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faTimes } from "@fortawesome/free-solid-svg-icons";
import { MenuTilesContext } from "../../components/basic/Menu";
import { TopBarMenu } from "./TopBarMenu";
import { TopBarView } from "./TopBarView";
import { TopBarBuilder } from "./TopBarBuilder";
import { MobileSiteMenu } from "./MobileSiteMenu";
import { Z_INDEX } from "./functions/common";
import "../../css/mobile-menu.css";

// The mobile UI's ☰ menu: the whole screen, with the Menu / View / Builder
// menus and the site's links as sections of big square tiles. A tile with more
// options opens them as a page of their own (back arrow in the header) rather
// than a nested dropdown. The menus are the desktop ones (TopBarMenu etc.),
// rendered as tiles through MenuTilesContext (components/basic/Menu.tsx).
//
// It stays mounted while closed, only hidden: some items (Load O8D, Load game)
// open a file picker whose input and change handler live in TopBarMenu, so
// unmounting it on the tap that opens the picker would lose the file.
export const MobileFullMenu = ({ open, onClose }) => {
  const [stack, setStack] = useState([]);
  const [pageEl, setPageEl] = useState(null);

  // Every opening starts at the top level.
  useEffect(() => { if (!open) setStack([]); }, [open]);

  const tiles = useMemo(() => ({
    stack,
    pageEl,
    push: (page) => setStack(s => [...s, page]),
    close: onClose,
  }), [stack, pageEl, onClose]);

  const top = stack[stack.length - 1];

  return (
    <div
      className="mobile-full-menu"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z_INDEX.DropdownMenu,
        display: open ? "flex" : "none",
        flexDirection: "column",
        background: "#111827",
        color: "white",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
      <div className="mobile-full-menu-header">
        {top
          ? <button type="button" aria-label="Back" className="mobile-full-menu-btn" onClick={() => setStack(s => s.slice(0, -1))}>
              <FontAwesomeIcon icon={faArrowLeft}/>
            </button>
          : <span style={{ width: 12 }}/>}
        <div className="mobile-full-menu-title">
          {top && top.icon && <FontAwesomeIcon icon={top.icon} style={{ marginRight: 8, opacity: 0.8 }}/>}
          {top ? top.title : "Menu"}
        </div>
        <button type="button" aria-label="Close" className="mobile-full-menu-btn" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes}/>
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
        <MenuTilesContext.Provider value={tiles}>
          <ul role="menubar" className="menu-tile-root" style={top ? { display: "none" } : undefined}>
            <MobileSiteMenu/>
            <TopBarMenu/>
            <TopBarView/>
            <TopBarBuilder/>
          </ul>
          <div ref={setPageEl} className="menu-tile-page"/>
        </MenuTilesContext.Provider>
      </div>
    </div>
  );
};
