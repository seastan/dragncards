import React from "react";
import { useSelector } from 'react-redux';
import { useGameL10n } from "./hooks/useGameL10n";
import { useDoActionList } from "./hooks/useDoActionList";

export const TopBarViewItem = React.memo(({
  groupId,
}) => {
  const gameL10n = useGameL10n();
  const group = useSelector(state => state?.gameUi?.game?.groupById?.[groupId]);
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const doActionList = useDoActionList();

  const handleMenuClick = (data) => {
    if (!playerN) {
      alert("Please sit at the table first.");
      return;
    } else if (data.action === "look_at") {
      const actionList = [
        ["LOG", "$ALIAS_N", " fanned out ", gameL10n(group.label), "."],
        ["SET", `/playerData/${playerN}/browseGroup/id`, data.groupId],
        ["SET", `/playerData/${playerN}/browseGroup/topN`, "All"],
      ]
      doActionList(actionList, `${playerN} looked at group ${groupId}`);
    } 
  }

  if (!group) return;

  const stackIds = group.stackIds;

  return(
    <li className="relative cursor-pointer" onClick={() => handleMenuClick({action:"look_at",groupId:groupId})} key={groupId}>
      <div className="absolute">
        {gameL10n(group.label)}
      </div>
      <div className="absolute right-2 top-1 select-none">{stackIds.length}</div>
    </li>
  )
})