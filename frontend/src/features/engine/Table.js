import React, { useEffect, useMemo, useRef, useState } from "react";
import store from "../../store";
import { Z_INDEX } from "./functions/common";
import { TableLayout } from "./TableLayout";
import Dnc3DTable from "../engine-dnc3d/Dnc3DTable";
import { useLayout } from "./hooks/useLayout";
import { GiantCard } from "./GiantCard";
import { FadeTextPlayer } from "./FadeTextPlayer";
import { TopBar } from "./TopBar";
import { SpawnExistingCardModal } from "./SpawnExistingCardModal";
import { SpawnCustomCardModal } from "./SpawnCustomCardModal";
import { SpawnPrebuiltModal } from "./SpawnPrebuiltModal";
import { SideBar } from "./SideBar";
import { Hotkeys } from "./Hotkeys";
import { DropdownMenu } from "./DropdownMenu";
import { TouchBarBottom } from "./TouchBarBottom";
import { TouchModePrompt } from "./TouchModePrompt";
import { useRadialMenu, RadialMenuOverlay } from "./MobileRadialMenu";
import { ArmedHotkeyPill } from "./DesktopFavorites";
import { useDesktopDrawerGeometry, useDesktopDrawerState, desktopDrawerRegions, desktopDrawerParked,
  desktopDrawerSlideMs, DesktopPilesDrawer } from "./DesktopHiddenPiles";
import { detectTouchDevice } from "../../hooks/useIsTouchDevice";
import { detectStandalone, isIOS } from "../../hooks/useIsStandalone";

import "../../css/custom-dropdown.css";
import { TooltipModal } from "./TooltipModal";
import { setMouseXY, setDropdownMenu, setScreenLeftRight, setTouchAction, setActiveCardId, setShowModal } from "../store/playerUiSlice";
import { useDispatch, useSelector } from "react-redux";
import useProfile from "../../hooks/useProfile";
import BroadcastContext from "../../contexts/BroadcastContext";
import { DeckbuilderModal } from "./DeckbuilderModal";
import { PatreonModal } from "../store/support/PatreonModal";
import DeveloperModal from "./DeveloperModal";
import { usePlayerN } from "./hooks/usePlayerN";
import { pl } from "date-fns/locale";
import { usePreloadCardImages } from "../../hooks/usePreloadCardImages";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { SettingsModal } from "./SettingsModal";
import { AutomationModal } from "./AutomationModal";
import { useIsHost } from "./hooks/useIsHost";
import { useDoActionList } from "./hooks/useDoActionList";
import { useSetTouchAction } from "./hooks/useSetTouchAction";
import { useTouchAction } from "./hooks/useTouchAction";
import { CustomContentModal } from "./CustomContentModal";
import { SpawnPublicDeckModal } from "./SpawnPublicDeckModal";
import { MobileTable } from "./MobileTable";
import { useMobileUIActive } from "./hooks/useMobileUI";

export const Table = React.memo(({onDragEnd}) => {
  const gameDef = useGameDefinition();
  const dispatch = useDispatch();
  const tooltipIds = useSelector(state => state?.playerUi?.tooltipIds);
  const touchMode = useSelector(state => state?.playerUi?.userSettings?.touchMode);
  const mobileUIActive = useMobileUIActive();
  const touchAction = useTouchAction();
  const setTouchAction = useSetTouchAction();
  const showModal = useSelector(state => state?.playerUi?.showModal);
  const loadedADeck = useSelector(state => state?.gameUi?.game?.loadedADeck);
  const userProfile = useProfile();
  const myUserId    = userProfile?.id;
  const language    = userProfile?.language;
  const layout      = useLayout();
  const game        = useSelector(state => state?.gameUi?.game);
  const rendererEngine = useSelector(state => state?.playerUi?.userSettings?.rendererEngine);
  const tableAngle     = useSelector(state => state?.playerUi?.userSettings?.tableAngle ?? 25);
  const isHost = useIsHost();
  const playerN = usePlayerN();
  const doActionList = useDoActionList();
  // In the dnc3d renderer, tall piles near the top of the table can paint up
  // over the TopBar strip (the stage overflows beyond its top edge by design,
  // so lifted/flipping cards can show above the bar). When the pointer is over
  // the TopBar, raise it above the table so those piles don't cover its buttons.
  const [topBarHovered, setTopBarHovered] = useState(false);
  usePreloadCardImages();

  // Regular table: dragging on empty table opens the favourites ring (as
  // pressing does in the mobile UI); a plain click stays a click.
  const desktopTableRef = useRef(null);
  const dropdownMenuOpen = useSelector(state => !!state?.playerUi?.dropdownMenu);
  const radial = useRadialMenu({ tableRef: desktopTableRef, enabled: !mobileUIActive && !dropdownMenuOpen, openOnDrag: true });

  // Regular 3D table: the hidden piles drawer on the right edge
  // (DesktopHiddenPiles). Its piles are extra table regions, slid off past
  // the right edge while it's closed.
  const drawerEnabled = !mobileUIActive && rendererEngine === 'dnc3d' && !!playerN;
  const [tableSize, setTableSize] = useState(null);
  useEffect(() => {
    const el = desktopTableRef.current;
    if (!el) return;
    // The drawer is laid out on the 3D table's surface (.dnc3d-tilt), which a
    // tilted table makes a different size from the box on screen.
    const measure = () => {
      const tilt = el.querySelector(".dnc3d-tilt");
      if (!tilt) return;
      const w = tilt.offsetWidth, h = tilt.offsetHeight;
      // The surface x whose (magnified) bottom edge meets the table box's
      // right edge on screen: perspective scales x about the box's centre.
      const box = el.getBoundingClientRect();
      const proj = tilt.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const planeRight = box.left + tilt.offsetLeft + w;   // unscaled
      const k = (proj.right - cx) / Math.max(1, planeRight - cx);
      const right = Math.round(cx + (box.right - 8 - cx) / Math.max(1, k) - (box.left + tilt.offsetLeft));
      const tiltDeg = store.getState()?.playerUi?.userSettings?.tableAngle ?? 25;
      // The game log's box, when it reaches the right edge: the drawer ends
      // above it (roughly mapped onto the surface, which spans the box's height).
      const chat = el.querySelector(".dnc3d-hud-chat")?.getBoundingClientRect();
      const bottom = chat && chat.height > 0 && chat.right > box.right - 40
        ? Math.round((chat.top - box.top) / box.height * h - 12) : h;
      setTableSize(s => (s && s.w === w && s.h === h && s.right === right && s.tiltDeg === tiltDeg && s.bottom === bottom)
        ? s : { w, h, right, tiltDeg, bottom });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const t = setInterval(measure, 1000);   // the surface resizes with the tilt setting
    return () => { ro.disconnect(); clearInterval(t); };
  }, [mobileUIActive]);
  const [drawerShowAll, setDrawerShowAll] = useState(false);
  const [drawerPage, setDrawerPage] = useState(0);
  const drawer = useDesktopDrawerState({ tableRef: desktopTableRef, enabled: drawerEnabled });
  const drawerGeometry = useDesktopDrawerGeometry({
    enabled: drawerEnabled, tableSize, showAll: drawerShowAll, page: drawerPage, expanded: drawer.expanded,
  });
  const drawerRegionsKey = JSON.stringify(desktopDrawerRegions(drawerGeometry));
  const tableRegions = useMemo(
    () => (drawerGeometry ? { ...(layout?.regions || {}), ...desktopDrawerRegions(drawerGeometry) } : layout?.regions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout?.regions, drawerRegionsKey]
  );
  const drawerSlideX = useMemo(() => {
    if (!drawerGeometry || drawer.open) return drawerGeometry ? Object.fromEntries(drawerGeometry.rows.map(r => [r.groupId, 0])) : null;
    const off = desktopDrawerParked(drawerGeometry);
    return Object.fromEntries(drawerGeometry.rows.map(r => [r.groupId, off]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerRegionsKey, drawer.open]);

  // A phone or tablet in the browser rather than the installed app: the first
  // tap in the room takes the page full screen, hiding the browser's bars
  // (Android; iOS doesn't let pages do this). Once per visit, so leaving full
  // screen sticks.
  useEffect(() => {
    if (!detectTouchDevice() || detectStandalone() || isIOS()) return;
    const el = document.documentElement;
    if (!document.fullscreenEnabled || !el.requestFullscreen) return;
    const goFullscreen = () => {
      window.removeEventListener("pointerup", goFullscreen, true);
      if (!document.fullscreenElement) el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    };
    window.addEventListener("pointerup", goFullscreen, true);
    return () => window.removeEventListener("pointerup", goFullscreen, true);
  }, []);
  console.log('Rendering Table', playerN);

  useEffect(() => {
    if (!loadedADeck && isHost && gameDef?.loadPreBuiltOnNewGame) {
      dispatch(setShowModal("prebuilt_deck"));
    }
  }, [loadedADeck]);

  const handleTableClick = (event) => {
    console.log("cardaction table click", event.target);
    dispatch(setMouseXY(null));
    dispatch(setDropdownMenu(null));
    dispatch(setActiveCardId(null));
    if (touchAction) setTouchAction(null);
  }

  //if (!loaded && isHost) onLoad(options, redoStepsExist, gameBroadcast, chatBroadcast, dispatch);

  // Handle mouse events
  useEffect(() => {
    const handleMouseDown = (event) => {
      dispatch(setMouseXY({
        x: event.clientX,
        y: event.clientY,
      }))
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    }
  })



  return (
    <div className="h-full flex" style={{fontSize: "1.7dvh"}}
      //onTouchStart={(event) => handleTableClick(event)} onMouseUp={(event) => handleTableClick(event)}
      onClick={(event) => handleTableClick(event)}>
      <DropdownMenu/>
      <Hotkeys/>
      {mobileUIActive ? <MobileTable/> : <>
      {/* Side panel */}
      <SideBar/>
      {/* Main panel */}
      {/* min-w-0 is load-bearing: as a flex item this panel defaults to
          min-width:auto, so it can never shrink below its content's min-content
          width. The touch bar's buttons carry a large one (nowrap labels, and
          token icons that don't shrink), all sized in dvh — without this the
          whole panel overflows the viewport once width drops below roughly
          1.5x height, clipping the right of both the table and the bar. */}
      <div className="w-full min-w-0">
        <div className="w-full h-full">
          {/* Game menu bar */}
          <div className="bg-gray-600 text-white w-full"
            style={{height: "6%", position: "relative", zIndex: topBarHovered ? Z_INDEX.TopBarHover : "auto"}}
            onMouseEnter={() => setTopBarHovered(true)}
            onMouseLeave={() => setTopBarHovered(false)}>
            <TopBar/>
          </div>
          {/* Table */}
          <div ref={desktopTableRef} className="relative w-full" style={{height: touchMode ? "82%" : "94%",
            // The closed drawer's piles wait past the right edge: clip them
            // there (only there; cards may still rise above the table).
            ...(drawerEnabled ? { clipPath: "inset(-100vh 0 -100vh -100vw)" } : {})}}>
            {/* What a favourite (panel or ring) switched on; touch mode's bar shows its own. */}
            {touchAction && !touchMode &&
              <ArmedHotkeyPill touchAction={touchAction} onClear={() => setTouchAction(null)}/>}
            <RadialMenuOverlay menu={radial.menu} items={radial.items} showHint={false}/>
            {rendererEngine === 'dnc3d'
              ? <Dnc3DTable
                  tiltDeg={tableAngle}
                  game={game}
                  layoutRegions={tableRegions}
                  regionSlideX={drawerSlideX}
                  regionSlideMs={desktopDrawerSlideMs}
                  tiltOverlay={drawerGeometry &&
                    <DesktopPilesDrawer
                      g={drawerGeometry}
                      open={drawer.open}
                      panelRef={drawer.panelRef}
                      showAll={drawerShowAll}
                      setShowAll={setDrawerShowAll}
                      setPage={setDrawerPage}/>}
                  layoutTextBoxes={layout?.textBoxes}
                  layoutTableButtons={layout?.tableButtons}
                  gameDef={gameDef}
                  language={language}
                  doActionList={doActionList}
                />
              : <TableLayout onDragEnd={onDragEnd}/>
            }
            <FadeTextPlayer/>
          </div>
          {/* Touch Bar */}
          {touchMode && <div className="relative w-full" style={{height: "12%"}}>
              <TouchBarBottom/>
          </div>}
        </div>
      </div>
      </>}
      {/* Card hover view. Not in mobile UI: there's no hover, a tap opens the
          card sheet (MobileMenuSheet) instead, and a stray emulated hover after
          a tap would otherwise blow a card up over the whole table. */}
      {!mobileUIActive && <GiantCard/>}
      {/* One-time offer to switch on touch mode, shown only on touch devices */}
      {/* Touch onboarding: offers the mobile UI, then installing the app (that
          step shows in the mobile UI too, where reclaiming the browser's bars
          matters most). */}
      <TouchModePrompt/>
      {showModal === "card" ? <SpawnExistingCardModal/> : null}
      {showModal === "prebuilt_deck" ? <SpawnPrebuiltModal/> : null}
      {showModal === "public_deck" ? <SpawnPublicDeckModal/> : null}
      {showModal === "settings" ? <SettingsModal/> : null}
{showModal === "automation" ? <AutomationModal/> : null}
      {showModal === "custom" ? <SpawnCustomCardModal/> : null}
      {showModal === "custom_decks" ? <DeckbuilderModal/> : null}
      {showModal === "custom_content" ? <CustomContentModal/> : null}
      {showModal === "developer" ? <DeveloperModal/> : null}
      {showModal === "patreon" ? 
        <PatreonModal isOpen={true} isLoggedIn={myUserId} closeModal={() => dispatch(setShowModal(null))}/> : null}
      {tooltipIds.map((tooltipId) => {
        return(
        <TooltipModal
          tooltipId={tooltipId}
        />)
      })}
    </div>
  );
})







