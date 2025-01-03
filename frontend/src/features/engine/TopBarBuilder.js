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

export const TopBarBuilder = React.memo(({}) => {
  const siteL10n = useSiteL10n();
  const dispatch = useDispatch();
  const gameDef = useGameDefinition(); 
  const deckbuilder = gameDef.deckbuilder; 
  return(
    <li>
      <div className="h-full flex items-center justify-center select-none" href="#">{siteL10n("builder")}</div>
        <ul className="second-level-menu">
          <li key={"decks"} onClick={() => deckbuilder ? dispatch(setShowModal("custom_decks")) : alert("Deckbuilder for this game is currently unsupported.")}>
            {siteL10n("customDecks")}
          </li>
          <li key={"content"} onClick={() => dispatch(setShowModal("custom_content"))}>
            {siteL10n("customContent")}
          </li>
      </ul>
    </li>
  )
})