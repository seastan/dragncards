import React from "react";
import { useDispatch, useSelector } from 'react-redux';
import { TopBarViewItem } from "./TopBarViewItem";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { setShowHotkeys, setShowModal } from "../store/playerUiSlice";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { usePlayerIList } from "./hooks/usePlayerIList";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { keysDiv } from "./functions/common";

export const TopBarView = React.memo(({}) => {
  const siteL10n = useSiteL10n();
  const dispatch = useDispatch();
  const gameDef = useGameDefinition();  
  return(
    <li>
      <div className="h-full flex items-center justify-center select-none" href="#">{siteL10n("view")}</div>
        <ul className="second-level-menu">
          <li key={"hotkeys"} onClick={() => dispatch(setShowHotkeys(true))}>
            {siteL10n("hotkeys")}{keysDiv("Tab", "ml-2")}
          </li>
          <li key={"preferences"} onClick={() => dispatch(setShowModal("settings"))}>
            {siteL10n("preferences")} {keysDiv("Shift", "ml-2")}{keysDiv("Tab")}
          </li>

          <li key={"shared"}>
            
            {siteL10n("shared")}
              <span className="float-right mr-1"><FontAwesomeIcon icon={faChevronRight}/></span>
            
            <ul className="third-level-menu">
              {Object.keys(gameDef?.groups).sort().map((groupId, _index) => {
                if (groupId.startsWith("shared")) return (
                  <TopBarViewItem key={groupId} groupId={groupId}/>
                )
              })}
            </ul>
          </li>
          {usePlayerIList().map((playerI, playerIndex) => (
          <li key={playerI}>
            {siteL10n("player")+" "+(playerIndex+1)}
              <span className="float-right mr-1"><FontAwesomeIcon icon={faChevronRight}/></span>
            <ul className="third-level-menu">
              {Object.keys(gameDef?.groups).sort().map((groupId, _index) => {
                if (groupId.startsWith(playerI)) return (
                  <TopBarViewItem key={groupId} groupId={groupId}/>
                )
              })}
            </ul>
          </li>
          ))}
      </ul>
    </li>
  )
})