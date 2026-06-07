import React from "react";
import { useDispatch } from "react-redux";
import { Menu, MenuItem, SubMenu } from "../../components/basic/Menu";
import { TopBarViewItem } from "./TopBarViewItem";
import { setShowHotkeys, setShowModal } from "../store/playerUiSlice";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { usePlayerIList } from "./hooks/usePlayerIList";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { keysDiv } from "./functions/common";

export const TopBarView = React.memo(() => {
  const siteL10n = useSiteL10n();
  const dispatch = useDispatch();
  const gameDef = useGameDefinition();
  const playerIList = usePlayerIList();
  return (
    <Menu label={siteL10n("view")}>
      <MenuItem onClick={() => dispatch(setShowHotkeys(true))}>
        <span>{siteL10n("hotkeys")}</span>
        {keysDiv("Tab", "ml-2")}
      </MenuItem>
      <MenuItem onClick={() => dispatch(setShowModal("settings"))}>
        <span>{siteL10n("preferences")}</span>
        <span className="flex items-center">
          {keysDiv("Shift", "ml-2")}
          {keysDiv("Tab")}
        </span>
      </MenuItem>

      <SubMenu label={siteL10n("shared")}>
        {Object.keys(gameDef?.groups)
          .sort()
          .map((groupId) => {
            if (groupId.startsWith("shared")) return <TopBarViewItem key={groupId} groupId={groupId} />;
            return null;
          })}
      </SubMenu>

      {playerIList.map((playerI: string, playerIndex: number) => (
        <SubMenu key={playerI} label={siteL10n("player") + " " + (playerIndex + 1)}>
          {Object.keys(gameDef?.groups)
            .sort()
            .map((groupId) => {
              if (groupId.startsWith(playerI)) return <TopBarViewItem key={groupId} groupId={groupId} />;
              return null;
            })}
        </SubMenu>
      ))}
    </Menu>
  );
});
