import React, { useEffect, useState } from "react";
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

export const Table = React.memo(({onDragEnd}) => {
  const gameDef = useGameDefinition();
  const dispatch = useDispatch();
  const tooltipIds = useSelector(state => state?.playerUi?.tooltipIds);
  const touchMode = useSelector(state => state?.playerUi?.userSettings?.touchMode);
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
      {/* Side panel */}
      <SideBar/>
      {/* Main panel */}
      <div className="w-full">
        <div className="w-full h-full">
          {/* Game menu bar */}
          <div className="bg-gray-600 text-white w-full"
            style={{height: "6%", position: "relative", zIndex: topBarHovered ? Z_INDEX.TopBarHover : "auto"}}
            onMouseEnter={() => setTopBarHovered(true)}
            onMouseLeave={() => setTopBarHovered(false)}>
            <TopBar/>
          </div>
          {/* Table */}
          <div className="relative w-full" style={{height: touchMode ? "82%" : "94%"}}>
            {rendererEngine === 'dnc3d'
              ? <Dnc3DTable
                  tiltDeg={tableAngle}
                  game={game}
                  layoutRegions={layout?.regions}
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
      {/* Card hover view */}
      <GiantCard/>
      {/* One-time offer to switch on touch mode, shown only on touch devices */}
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







