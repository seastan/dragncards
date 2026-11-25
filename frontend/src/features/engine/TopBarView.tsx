import React from "react";
import { useDispatch } from "react-redux";
import { Menu, MenuItem, SubMenu } from "../../components/basic/Menu";
import { faKeyboard, faSlidersH, faLayerGroup, faUser } from "@fortawesome/free-solid-svg-icons";
import { TopBarViewItem } from "./TopBarViewItem";
import { setShowHotkeys, setShowModal } from "../store/playerUiSlice";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { usePlayerIList } from "./hooks/usePlayerIList";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { usePlayerN } from "./hooks/usePlayerN";

// Keyboard shortcuts shown in a dropdown menu use muted, right-aligned text
// (the standard menu convention), unlike the boxed keycaps used in the Hotkeys
// help modal.
// menu-shortcut: hidden on the mobile menu's tiles (no keyboard there).
const Shortcut = ({ children }: { children: React.ReactNode }) => (
  <span className="menu-shortcut ml-2 text-xs text-gray-400">{children}</span>
);

export const TopBarView = React.memo(() => {
  const siteL10n = useSiteL10n();
  const dispatch = useDispatch();
  const gameDef = useGameDefinition();
  const playerIList = usePlayerIList();
  const playerN = usePlayerN();
  return (
    <Menu label={siteL10n("view")} disabledReason={playerN ? null : siteL10n("pleaseSit")}>
      <MenuItem icon={faKeyboard} onClick={() => dispatch(setShowHotkeys(true))}>
        <span>{siteL10n("hotkeys")}</span>
        <Shortcut>Tab</Shortcut>
      </MenuItem>
      <MenuItem icon={faSlidersH} onClick={() => dispatch(setShowModal("settings"))}>
        <span>{siteL10n("preferences")}</span>
        <Shortcut>Shift + Tab</Shortcut>
      </MenuItem>

      <SubMenu label={siteL10n("shared")} icon={faLayerGroup}>
        {Object.keys(gameDef?.groups)
          .sort()
          .map((groupId) => {
            if (groupId.startsWith("shared")) return <TopBarViewItem key={groupId} groupId={groupId} />;
            return null;
          })}
      </SubMenu>

      {playerIList.map((playerI: string, playerIndex: number) => (
        <SubMenu key={playerI} label={siteL10n("player") + " " + (playerIndex + 1)} icon={faUser}>
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
