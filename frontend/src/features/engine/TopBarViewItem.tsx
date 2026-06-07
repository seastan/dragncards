import React from "react";
import { useSelector } from "react-redux";
import { MenuItem } from "../../components/basic/Menu";
import { useGameL10n } from "./hooks/useGameL10n";
import { useDoActionList } from "./hooks/useDoActionList";

export const TopBarViewItem = React.memo(({ groupId }: { groupId: string }) => {
  const gameL10n = useGameL10n();
  const group = useSelector((state: any) => state?.gameUi?.game?.groupById?.[groupId]);
  const playerN = useSelector((state: any) => state?.playerUi?.playerN);
  const doActionList: any = useDoActionList();

  const handleMenuClick = (data: any) => {
    if (!playerN) {
      alert("Please sit at the table first.");
      return;
    } else if (data.action === "look_at") {
      const actionList = [
        ["LOG", "$ALIAS_N", " fanned out ", gameL10n(group.label), "."],
        ["SET", `/playerData/${playerN}/browseGroup/id`, data.groupId],
        ["SET", `/playerData/${playerN}/browseGroup/topN`, "All"],
      ];
      doActionList(actionList, `${playerN} looked at group ${groupId}`);
    }
  };

  if (!group) return null;

  const stackIds = group.stackIds;

  return (
    <MenuItem onClick={() => handleMenuClick({ action: "look_at", groupId: groupId })}>
      <span>{gameL10n(group.label)}</span>
      <span className="opacity-70 tabular-nums">{stackIds.length}</span>
    </MenuItem>
  );
});
