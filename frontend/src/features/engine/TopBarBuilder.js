import React from "react";
import { useDispatch } from 'react-redux';
import { setShowModal } from "../store/playerUiSlice";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useSiteL10n } from "../../hooks/useSiteL10n";

export const TopBarBuilder = React.memo(() => {
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