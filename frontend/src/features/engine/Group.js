import React, { useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { DroppableRegion } from "./DroppableRegion";
import { faBars, faEye } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useBrowseTopN } from "./hooks/useBrowseTopN"; 
import { setDropdownMenu } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useDoActionList } from "./hooks/useDoActionList";
import { Stack } from "./Stack";
import { DEFAULT_CARD_Z_INDEX } from "./functions/common";

export const Group = React.memo(({
  groupId,
  region,
  onDragEnd
}) => {
  console.log("Rendering Group ",groupId);
  const dispatch = useDispatch();
  const gameL10n = useGameL10n();
  const gameDef = useGameDefinition();
  const group = useSelector(state => state?.gameUi?.game?.groupById?.[groupId]);
  const isPile = region.type === "pile";
  const [isMouseOverPile, setIsMouseOverPile] = useState(false);
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const tempDragStack = useSelector(state => state?.playerUi?.tempDragStack);
  const iconsVisible = playerN && (region.showMenu || (isPile && region.showMenu !== false)) ;
  const regionCardSizeFactor = region.cardSizeFactor || 1.0;
  const browseTopN = useBrowseTopN();
  const doActionList = useDoActionList();
  console.log("Group tempDragStack", tempDragStack)
  // Print a warning to the console if the group is not found
  if (!group) {
    doActionList(["LOG", "Error: Tried to display an unknown group: ", groupId]);
    return null;
  }

  const handleEyeClick = (event) => {
    event.stopPropagation();
    browseTopN(groupId, "All");
  }

  const handleBarsClick = (event) => {
    event.stopPropagation();
    if (!playerN) return;
    const dropdownMenu = {
        type: "group",
        group: group,
        title: gameL10n(group.label),
    }
    console.log("dispatch setDropdownMenu", dropdownMenu)
    if (playerN) dispatch(setDropdownMenu(dropdownMenu));
  }

  if (!group) return null;
  const numStacks = group.stackIds.length;
  const tablename = gameL10n(group.tableLabel);
  return(
    <div 
      className="h-full w-full"
      // onMouseEnter={() => {if (region.type === "pile") setIsMouseOverPile(true); alert("Mouse Enter")}}
      // onMouseLeave={() => {if (region.type === "pile") setIsMouseOverPile(false)}}
      >
      
      <div
        className="relative h-full float-left select-none text-gray-400"
        style={{width:"1.7vh"}}>
          <div className="relative w-full h-full">
          {region.hideTitle ? null :
            <span 
              className="absolute mt-1 px-1 overflow-hidden rounded bg-gray-600-70" 
              style={{
                fontSize: "1.5vh", 
                top: "50%", 
                left: "50%", 
                transform: `translate(${iconsVisible ? "-30%" : "-40%"}, -70%) rotate(90deg)`, 
                whiteSpace: "nowrap", 
                zIndex: DEFAULT_CARD_Z_INDEX+1,
                boxShadow: "0 0 10px 5px rgba(0,0,0,0.6)",
              }}>
                {iconsVisible &&
                  <div className="text-gray-300 w-full h-full flex items-center justify-center" style={{fontSize: "2vh"}}>
                    <div className="w-1/2 flex items-center justify-center py-1 rounded hover:bg-gray-500" onClick={(event) => handleEyeClick(event)}>
                      <FontAwesomeIcon  className="mx-2 -rotate-90" icon={faEye}/>
                    </div>
                    <div className="w-1/2 flex items-center justify-center py-1 rounded hover:bg-gray-500" onClick={(event) => handleBarsClick(event)}>
                      <FontAwesomeIcon className="mx-2 -rotate-90" icon={faBars}/>
                    </div>
                  </div>
                }
                <div className="w-full flex items-center justify-center" >
                {gameL10n(tablename) + (isPile ? " ("+numStacks+")" : "")}
                </div>
            </span>
          }
          </div>
      </div>
      <div className="h-full" style={{marginLeft: "1.7vh", width: region.type === "free" ? "100%" : "calc(100% - 1.7vh)"}}>
        {(region.type === "free" && tempDragStack && tempDragStack?.toGroupId === groupId) &&
          <div style={{
            left: `${tempDragStack.left}%`, 
            top: `${tempDragStack.top}%`, 
            position: "absolute", 
            zIndex: 1e9, 
            marginLeft: "1.7vh"
          }}>
            <Stack
              stackId={tempDragStack.stackId}
              isDragging={false}
              stackZoomFactor={regionCardSizeFactor}
            />
          </div>
        }
        <DroppableRegion
          groupId={groupId}
          region={region}
          selectedStackIndices={[...Array(numStacks).keys()]}
          onDragEnd={onDragEnd}
          isMouseOverPile={isMouseOverPile}
        />

      </div>
    </div>
  )
})