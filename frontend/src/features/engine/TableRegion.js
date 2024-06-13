import React from "react";
import { useSelector } from 'react-redux';
import { Group } from "./Group";
import { DEFAULT_CARD_Z_INDEX, convertToPercentage } from "./functions/common";
import { usePlayerN } from "./hooks/usePlayerN";
import { useFormatGroupId } from "./hooks/useFormatGroupId";


export const TableRegion = React.memo(({
  region,
  onDragEnd
}) => {
  console.log("Rendering TableRegion", region);
  const playerN = usePlayerN();
  const formatGroupId = useFormatGroupId();
  const browseGroupId = useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.browseGroup?.id);
  const formattedGroupId = formatGroupId(region.groupId);
  const extraStyle = useSelector(state => state?.gameUi?.game?.groupById?.[formattedGroupId]?.extraStyle);
  const formattedRegion = {...region, groupId: formattedGroupId};
  const hideGroup = (formattedRegion.groupId === browseGroupId);
  const draggingStackId = useSelector(state => state?.playerUi?.dragging?.stackId);
  const droppableId = region.groupId + "--" + region.type + "--" + region.direction; 
  const draggingFromThisDroppableId = useSelector(state => state?.playerUi?.dragging?.fromDroppableId === droppableId);
  var zIndex = undefined;
  if (region.layerIndex > 0) zIndex = DEFAULT_CARD_Z_INDEX * region.layerIndex + 2;
  // if (draggingFromThisDroppableId == droppableId) zIndex = 10*DEFAULT_CARD_Z_INDEX + 2;
  console.log("TableRegion 1", draggingStackId);
  return (
    <div
      className="absolute"
      //onMouseEnter={(e) => {e.stopPropagation();}}
      style={{
        ...region?.style,
        ...extraStyle,
        top: convertToPercentage(region.top),
        left: convertToPercentage(region.left),
        width: convertToPercentage(region.width),
        height: convertToPercentage(region.height),
        zIndex: zIndex,
      }}>
      {hideGroup ? null :
        <Group
          groupId={formattedGroupId}
          region={formattedRegion}
          onDragEnd={onDragEnd}
        />
      }
    </div>
  )
})