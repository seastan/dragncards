import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faComment, faTimes, faEye, faLayerGroup, faKeyboard, faListOl, faStar } from "@fortawesome/free-solid-svg-icons";
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
import { MobileHotkeyList, HotkeyLabel, hotkeyId, useGameHotkeyItems, useFavoriteHotkeys, useRunHotkey, useHotkeyLabel, useHotkeyTabs, useHotkeyToTouchAction } from "./MobileHotkeys";
import { useTouchAction } from "./hooks/useTouchAction";
import { useSetTouchAction } from "./hooks/useSetTouchAction";
import { useBoardSwipe } from "./MobileBoardSwipe";
import { MobileStepTracker } from "./MobileStepTracker";
import { useHiddenPilesGeometry, hiddenPileRegions, HiddenPilesDrawer, SLIDE_MS, drawerParkedOffset } from "./MobileHiddenPiles";

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

  // Shows whoever's board is on screen (your own seat to begin with), so it
  // follows a swipe between boards.
  const observingPlayerN = useSelector(state => state?.playerUi?.observingPlayerN);
  const shown = observingPlayerN || playerN;
  const firstScroll = useRef(true);
  useEffect(() => {
    const el = ref.current;
    const i = playerIList.indexOf(shown);
    if (!el || i < 0) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: firstScroll.current ? "auto" : "smooth" });
    firstScroll.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, playerIList.length]);

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

// A starred hotkey on the bottom bar: its label (icons included), tap to run.
const FavoriteHotkeyButton = ({ item }) => {
  const runHotkey = useRunHotkey();
  const labelOf = useHotkeyLabel();
  return (
    <div
      onClick={(e) => { e.stopPropagation(); runHotkey(item); }}
      className="mobile-sheet-button"
      style={{
        ...tapStyle,
        flexShrink: 0,
        maxWidth: 104,
        minWidth: 44,
        height: "100%",
        boxSizing: "border-box",
        padding: "0 8px",
        borderRadius: 6,
        border: "1px solid #4b5563",
        color: "#e5e7eb",
        fontSize: 11,
        lineHeight: 1.15,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        overflow: "hidden",
      }}>
      <span style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        <HotkeyLabel text={labelOf(item)} iconSize={18}/>
      </span>
    </div>
  );
};

const MobileBottomBar = ({ pilesOpen, setPilesOpen, chatOpen, setChatOpen, hotkeysOpen, setHotkeysOpen, stepsOpen, setStepsOpen, favBarOpen, setFavBarOpen }) => {
  const only = (which) => {
    setPilesOpen(which === "piles" ? !pilesOpen : false);
    setChatOpen(which === "chat" ? !chatOpen : false);
    setHotkeysOpen(which === "hotkeys" ? !hotkeysOpen : false);
    setStepsOpen(which === "steps" ? !stepsOpen : false);
  };
  return (
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
      <BottomButton active={pilesOpen} label="PILES" onClick={() => only("piles")}>
        <HiddenPilesIcon/>
      </BottomButton>
      <BottomButton active={stepsOpen} label="ROUND" onClick={() => only("steps")}>
        <FontAwesomeIcon icon={stepsOpen ? faTimes : faListOl}/>
      </BottomButton>
      <div style={{ flex: 1 }}/>
      {/* Shows / hides the favourites bar; not a sheet, so it leaves the
          others alone. */}
      <BottomButton active={favBarOpen} label="FAVORITES" onClick={() => setFavBarOpen(!favBarOpen)}>
        <FontAwesomeIcon icon={faStar}/>
      </BottomButton>
      <BottomButton active={hotkeysOpen} label="HOTKEYS" onClick={() => only("hotkeys")}>
        <FontAwesomeIcon icon={hotkeysOpen ? faTimes : faKeyboard}/>
      </BottomButton>
      <BottomButton active={chatOpen} label="CHAT" onClick={() => only("chat")}>
        <FontAwesomeIcon icon={chatOpen ? faTimes : faComment}/>
      </BottomButton>
    </div>
  );
};

// The starred hotkeys, on their own bar just above the bottom bar (toggled by
// the bottom bar's FAVORITES button). Scrolls sideways when they don't fit.
const FAV_BAR_H = 44;
const FavoritesBar = () => {
  const { game, dragn } = useGameHotkeyItems();
  const { favs } = useFavoriteHotkeys();
  const byId = Object.fromEntries([...game, ...dragn].map(item => [hotkeyId(item), item]));
  const favItems = favs.map(id => byId[id]).filter(Boolean);
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        height: FAV_BAR_H,
        flexShrink: 0,
        display: "flex",
        alignItems: "stretch",
        gap: 4,
        padding: "4px 6px",
        boxSizing: "border-box",
        background: "#18202c",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        overflowX: "auto",
        scrollbarWidth: "none",
        position: "relative",
        zIndex: Z_INDEX.TopBarHover,
      }}>
      {favItems.length
        ? favItems.map(item => <FavoriteHotkeyButton key={hotkeyId(item)} item={item}/>)
        : <div style={{ display: "flex", alignItems: "center", padding: "0 6px", fontSize: 12, color: "#9ca3af" }}>
            Star hotkeys in the Hotkeys menu to add them here.
          </div>}
    </div>
  );
};

const FAV_BAR_KEY = "dragncards_mobile_fav_bar";
const readFavBarOpen = () => { try { return window.localStorage.getItem(FAV_BAR_KEY) !== "false"; } catch (e) { return true; } };

// The hotkeys sheet, slid up from the bottom like chat, with a tab per kind:
//   Token / Card — tap one to arm it: it then applies to every card you tap
//                  until you tap the table (touch mode's armed button, shared
//                  through playerData[n].touchAction). An armed token also
//                  responds to swipes on a card: up adds one, down removes one.
//   Game / Dragn — tap one to run it; star it for the favourites bar.
const HOTKEY_TABS = [["token", "Token"], ["card", "Card"], ["game", "Game"], ["dragn", "Dragn"]];

const HotkeysSheet = ({ open, onClose }) => {
  const tabs = useHotkeyTabs();
  const favorites = useFavoriteHotkeys();
  const runHotkey = useRunHotkey();
  const toTouchAction = useHotkeyToTouchAction();
  const setTouchAction = useSetTouchAction();
  const [tab, setTab] = useState("game");
  const armable = tab === "token" || tab === "card";
  const onRun = (item) => {
    if (armable) setTouchAction(toTouchAction(item));
    else runHotkey(item);
    onClose();
  };
  const items = tabs[tab] || [];
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "60%",
        display: "flex",
        flexDirection: "column",
        transform: open ? "translateY(0)" : "translateY(105%)",
        transition: "transform 0.2s ease-out",
        visibility: open ? "visible" : "hidden",
        background: "#242526",
        borderTop: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "12px 12px 0 0",
        boxShadow: "0 -8px 24px rgba(0,0,0,0.6)",
        zIndex: Z_INDEX.ChatHover,
        color: "white",
        overflow: "hidden",
      }}>
      <div style={{ display: "flex", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        {HOTKEY_TABS.map(([id, label]) => (
          <div
            key={id}
            onClick={() => setTab(id)}
            style={{
              ...tapStyle,
              flex: 1,
              textAlign: "center",
              padding: "11px 0 9px",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: tab === id ? "white" : "#9ca3af",
              borderBottom: `2px solid ${tab === id ? "#e5e7eb" : "transparent"}`,
            }}>
            {label}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {armable &&
          <div style={{ padding: "8px 12px 2px", fontSize: 12, color: "#9ca3af" }}>
            {tab === "token"
              ? "Pick a token, then tap cards to add one or swipe up / down on a card to add / remove. Tap the table when done."
              : "Pick an action, then tap the cards to apply it to. Tap the table when done."}
          </div>}
        {items.length
          ? <MobileHotkeyList items={items} onRun={onRun} favorites={armable ? null : favorites}/>
          : <div style={{ padding: 14, fontSize: 13, color: "#9ca3af" }}>No hotkeys of this kind.</div>}
      </div>
    </div>
  );
};

// Replaces the bottom bar while a token or card hotkey is armed.
const ActiveHotkeyBar = ({ touchAction }) => {
  const setTouchAction = useSetTouchAction();
  const isToken = touchAction.actionType === "token";
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        height: BOTTOM_H,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "4px 8px 4px 12px",
        boxSizing: "border-box",
        background: "#14532d",
        borderTop: "1px solid #22c55e",
        color: "white",
        position: "relative",
        zIndex: Z_INDEX.TopBarHover,
      }}>
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          <HotkeyLabel text={touchAction.label || touchAction.id} iconSize={18}/>
        </div>
        <div style={{ fontSize: 10.5, opacity: 0.8 }}>
          {isToken ? "Tap a card: +1 · swipe up / down: + / − · tap the table to stop" : "Tap cards to apply · tap the table to stop"}
        </div>
      </div>
      <div
        onClick={() => setTouchAction(null)}
        style={{ ...tapStyle, flexShrink: 0, width: 36, height: 36, borderRadius: 18, border: "1px solid rgba(255,255,255,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
        <FontAwesomeIcon icon={faTimes}/>
      </div>
    </div>
  );
};

// ── Table ──────────────────────────────────────────────────────────────────

export const MobileTable = React.memo(() => {
  const gameDef = useGameDefinition();
  const layout = useLayout();
  const game = useSelector(state => state?.gameUi?.game);
  const language = useProfile()?.language;
  const doActionList = useDoActionList();
  const [menuOpen, setMenuOpen] = useState(false);
  const touchAction = useTouchAction();
  // An armed token responds to vertical swipes on cards: up +1, down −1. Same
  // rules as touch mode's token taps (useHandleTouchAction): a non-modifier
  // token can't be taken below zero.
  const onCardSwipe = (cardId, direction) => {
    if (touchAction?.actionType !== "token") return;
    const tokenType = touchAction.tokenType;
    const tokenDef = gameDef?.tokens?.[tokenType];
    const card = game?.cardById?.[cardId];
    if (!card || !tokenDef) return;
    const increment = direction === "up" ? 1 : -1;
    if (increment < 0 && !(card.tokens?.[tokenType] > 0) && tokenDef.modifier !== true && !tokenDef.canBeNegative) return;
    doActionList([
      ["DEFINE", "$ACTIVE_CARD_ID", cardId],
      ["LOG", "$ALIAS_N", increment > 0 ? " added " : " removed ", 1, " ", tokenDef.name || tokenDef.label, increment > 0 ? " token to " : " token from ", "$ACTIVE_FACE.name", "."],
      ["INCREASE_VAL", "/cardById/$ACTIVE_CARD_ID/tokens/" + tokenType, increment],
    ], `Swipe ${direction} with token ${tokenType} on card ${cardId}`);
  };
  const [chatOpen, setChatOpen] = useState(false);
  const [hotkeysOpen, setHotkeysOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  // Favourites bar: shown by default; the choice is remembered on this device.
  const [favBarOpen, setFavBarOpenState] = useState(readFavBarOpen);
  const setFavBarOpen = (open) => {
    setFavBarOpenState(open);
    try { window.localStorage.setItem(FAV_BAR_KEY, open ? "true" : "false"); } catch (e) { /* session only */ }
  };
  // Hidden piles drawer. Its piles are table regions for as long as the mobile
  // table is up, parked off-screen (with the drawer panel) while it's closed:
  // opening and closing then only slide things that already exist. Adding or
  // removing regions rebuilds the whole table — ~150ms on a fast laptop, more
  // on a phone — so doing that on every open made the slide start late. It
  // still rebuilds when the drawer's pile list changes (a pile gets its first
  // card, the pager turns), which comes from game actions, not the button.
  const [pilesOpen, setPilesOpen] = useState(false);
  const [pilesPage, setPilesPage] = useState(0);
  const pilesSlidIn = pilesOpen;

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

  const pilesGeometry = useHiddenPilesGeometry(true, tableSize, pilesPage);
  const pilesLive = pilesGeometry;
  const pileSlideX = useMemo(() => {
    if (!pilesGeometry) return null;
    const px = pilesSlidIn ? 0 : -drawerParkedOffset(pilesGeometry);   // same as the panel
    const map = {};
    pilesGeometry.rows.forEach(r => { map[r.groupId] = px; });
    return map;
  }, [pilesGeometry, pilesSlidIn]);
  // Swipe sideways on empty table to change whose board is on screen. Not
  // while something is open over the table.
  const dropdownMenu = useSelector(state => state?.playerUi?.dropdownMenu);
  const boardSwipe = useBoardSwipe({
    tableRef,
    layoutRegions: layout?.regions,
    tableWidth: tableSize?.w || window.innerWidth,
    enabled: !pilesOpen && !chatOpen && !hotkeysOpen && !stepsOpen && !menuOpen && !dropdownMenu,
  });
  const tableSlideX = useMemo(() => ({ ...pileSlideX, ...boardSwipe.slideMap }), [pileSlideX, boardSwipe.slideMap]);
  const pileRegionsKey = JSON.stringify(pilesLive?.rows?.map(r => r.region) || []);
  const tableRegions = useMemo(
    () => ({
      ...layout?.regions,
      // The neighbouring players' boards, parked off-screen for the board swipe.
      ...boardSwipe.ghostRegions,
      ...(pilesLive ? hiddenPileRegions(pilesLive) : {}),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout?.regions, pileRegionsKey, boardSwipe.ghostRegions]
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
      {/* pan-y: horizontal drags here are ours (the board swipe), so the
          browser must not claim them and cancel the pointer partway, which it
          does on any part of the area not covered by the 3D surface's own
          touch-action. Vertical stays native so the sheets inside scroll. */}
      <div ref={tableRef} style={{ position: "relative", flex: 1, minHeight: 0, touchAction: "pan-y" }}>
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
          cardSwipe={touchAction?.actionType === "token"}
          onCardSwipe={onCardSwipe}
          regionSlideX={tableSlideX}
          regionSlideMs={boardSwipe.slideMs ?? SLIDE_MS}
          tiltOverlay={pilesGeometry &&
            <HiddenPilesDrawer
              geometry={pilesGeometry}
              slidIn={pilesSlidIn}
              setPage={setPilesPage}
              onDone={() => setPilesOpen(false)}
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
        <HotkeysSheet open={hotkeysOpen} onClose={() => setHotkeysOpen(false)}/>
        <MobileStepTracker open={stepsOpen}/>
      </div>
      {favBarOpen && <FavoritesBar/>}
      {touchAction ? <ActiveHotkeyBar touchAction={touchAction}/> :
      <MobileBottomBar pilesOpen={pilesOpen} setPilesOpen={setPilesOpen} chatOpen={chatOpen} setChatOpen={setChatOpen} hotkeysOpen={hotkeysOpen} setHotkeysOpen={setHotkeysOpen} stepsOpen={stepsOpen} setStepsOpen={setStepsOpen} favBarOpen={favBarOpen} setFavBarOpen={setFavBarOpen}/>}
    </div>
  );
});
