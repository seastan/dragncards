import React from "react";
import { useDispatch } from "react-redux";
import { Menu, MenuItem } from "../../components/basic/Menu";
import { setShowModal } from "../store/playerUiSlice";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useSiteL10n } from "../../hooks/useSiteL10n";

export const TopBarBuilder = React.memo(() => {
  const siteL10n = useSiteL10n();
  const dispatch = useDispatch();
  const gameDef = useGameDefinition();
  const deckbuilder = gameDef.deckbuilder;
  return (
    <Menu label={siteL10n("builder")}>
      <MenuItem
        onClick={() =>
          deckbuilder
            ? dispatch(setShowModal("custom_decks"))
            : alert("Deckbuilder for this game is currently unsupported.")
        }
      >
        {siteL10n("customDecks")}
      </MenuItem>
      <MenuItem onClick={() => dispatch(setShowModal("custom_content"))}>
        {siteL10n("customContent")}
      </MenuItem>
    </Menu>
  );
});
