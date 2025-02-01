import React from "react";
import { useSelector } from 'react-redux';
import { Group } from "./Group";
import { DEFAULT_CARD_Z_INDEX, convertToPercentage } from "./functions/common";
import { usePlayerN } from "./hooks/usePlayerN";
import { useLayout } from "./hooks/useLayout";


export const TableRegion = React.memo(({
  region,
  onDragEnd
}) => {
  console.log("Rendering TableRegion", region);
  const playerN = usePlayerN();
  const layout = useLayout();
  const browseGroupId = useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.browseGroup?.id);
  const hideGroup = (region.groupId === browseGroupId);
  const draggingStackId = useSelector(state => state?.playerUi?.dragging?.stackId);
  const droppableId = region.groupId + "--" + region.type + "--" + region.direction; 
  const draggingFromThisDroppableId = useSelector(state => state?.playerUi?.dragging?.fromDroppableId === droppableId);
  var zIndex = undefined;
  if (region.layerIndex > 0) zIndex = DEFAULT_CARD_Z_INDEX * region.layerIndex + 2;
  // if (draggingFromThisDroppableId == droppableId) zIndex = 10*DEFAULT_CARD_Z_INDEX + 2;
  console.log("TableRegion 1", draggingStackId);
  const regionStyle = {
    ...region?.style,
    top: convertToPercentage(region.top),
    left: convertToPercentage(region.left),
    width: convertToPercentage(region.width),
    height: convertToPercentage(region.height),
    zIndex: zIndex,
  }
  if (layout?.testBorders) {
    regionStyle.border = "1px solid red";
  }
  return (
    <div
      className="absolute"
      //onMouseEnter={(e) => {e.stopPropagation();}}
      style={regionStyle}
    >
      {hideGroup ? null :
        <Group
          groupId={region.groupId}
          region={region}
          onDragEnd={onDragEnd}
        />
      }
    </div>
  )
})