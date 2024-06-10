import React, { useState } from "react";
import { useSelector } from 'react-redux';
import { Draggable } from "@seastan/react-beautiful-dnd";
//import { Draggable } from "seastan-react-beautiful-dnd";
import { useLayout } from "./hooks/useLayout";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import store from "../../store";
import { ATTACHMENT_OFFSET, convertToPercentage } from "./functions/common";
import NaturalDragAnimation from 'natural-drag-animation-rbdnd';
import styled from "@emotion/styled";
import { Stack } from "./Stack";
import { getGroupIdAndRegionType } from "./Reorder";
import { useOffsetTotalsAndAmounts } from "./hooks/useOffsetTotalsAndAmounts";
import { usePlayerN } from "./hooks/usePlayerN";

const StackContainerFree = styled.div`
  position: absolute;
  float: left;
  userSelect: none;
  margin: 0vh ${props => props.margin}vh 0vh 0vh;
  left: ${props => props.stackLeft}%;
  top: ${props => props.stackTop}%;
  width: ${props => props.stackWidth}vh;
  height: ${props => props.stackHeight}vh;
  opacity: ${props => props.isGroupedOver ? 0.4 : 1};
`;

export const StackContainerSorted = styled.div`
  position: relative;
  userSelect: none;
  width: ${props => props.stackWidth}vh;
  height: ${props => props.stackHeight}vh;
  margin: 0vh ${props => props.margin}vh 0vh 0vh;
  opacity: ${props => props.isGroupedOver ? 0.4 : 1};
`;
//
//
export const StackDraggable = React.memo(({
    region,
    stackIndex,
    stackId,
    numStacksVisible,
    onDragEnd
  }) => {
    const stack = useSelector(state => state?.gameUi?.game?.stackById[stackId]);
    const numStackIdsInGroup = useSelector(state => state?.gameUi?.game?.groupById?.[region.groupId]?.stackIds.length);
    const tempDragStackId = useSelector(state => state?.playerUi?.tempDragStack?.stackId);
    const thisDrag = useSelector(state => state?.playerUi?.dragging?.stackId == stackId);
    const draggingEnd = useSelector(state => state?.playerUi?.dragging?.end);
    const draggingEndDelay = useSelector(state => state?.playerUi?.dragging?.endDelay);
    const touchMode = useSelector(state => state?.playerUi?.userSettings?.touchMode);
    const zoomFactor = useSelector(state => state?.playerUi?.userSettings?.zoomPercent)/100;
    const isCombined = useSelector(state => ((state?.playerUi?.dragging?.stackId === stackId) && (state?.playerUi?.dragging?.hoverOverStackId !== null)));
    const playerN = usePlayerN();

    const layout = useLayout();
    const rowSpacing = layout?.rowSpacing;
    const cardSize = layout?.cardSize;
    console.log('Rendering Stack in region ', region.groupId);
    var spacingFactor = touchMode ? 1.5 : 1;
    const { height, width } = useWindowDimensions();
    const aspectRatio = width/height;
    const cardIds = stack?.cardIds || [];
    const card0 = store.getState().gameUi.game.cardById[cardIds[0]];
    // Calculate size of stack for proper spacing. Changes base on group type and number of stack in group.
    const {offsetTotals, offsetAmounts} = useOffsetTotalsAndAmounts(stackId);

    if (!stack) return null;

    const numStacksNonZero = Math.max(numStacksVisible, 1);
    const regionWidthPercent = convertToPercentage(region.width);
    const regionWidthInt = parseInt(regionWidthPercent.substring(0, regionWidthPercent.length - 1))
    const fanSpacingHoriz = (regionWidthInt-cardSize/2)*aspectRatio/numStacksNonZero;
    const cardWidth = card0?.sides[card0?.currentSide]?.width;
    const cardHeight = card0?.sides[card0?.currentSide]?.height;
    const stackHeight = (cardHeight*cardSize + ATTACHMENT_OFFSET * (offsetTotals.top + offsetTotals.bottom)) * zoomFactor;
    //const stackWidth = cardWidth*cardSize + ATTACHMENT_OFFSET * (numCards - 1);
    const stackWidth = (cardWidth*cardSize + ATTACHMENT_OFFSET * (offsetTotals.left + offsetTotals.right)) * zoomFactor;
    const stackWidthFan = Math.min(fanSpacingHoriz, cardWidth*cardSize*zoomFactor);
  
    const regionHeightPercent = convertToPercentage(region.height);
    const regionHeightInt = parseInt(regionHeightPercent.substring(0, regionHeightPercent.length - 1))
    const fanSpacingVert = (regionHeightInt-cardSize)/numStacksNonZero;
    const stackHeightFan = Math.min(fanSpacingVert, cardHeight*cardSize*zoomFactor);

    if (tempDragStackId === stackId) {
      return null;
    }

    return (
      <Draggable 
        key={stackId} 
        draggableId={stackId} 
        index={stackIndex}
        isDragDisabled={playerN === null}>
        {(dragProvided, dragSnapshot) => {
          if (!draggingEnd && dragSnapshot.isDropAnimating && onDragEnd) {
            const fromDroppableId = store.getState().playerUi?.dragging?.fromDroppableId;
            const hoverOverStackId = store.getState().playerUi?.dragging?.hoverOverStackId;
            const hoverOverDirection = store.getState().playerUi?.dragging?.hoverOverDirection;
            const hoverOverDroppableId = store.getState().playerUi?.dragging?.hoverOverDroppableId;
            const [toGroupId, toRegionType, toRegionDirection] = getGroupIdAndRegionType(hoverOverDroppableId);
            console.log('onDragEnd hoverOverStackId 2:',{hoverOverStackId, draggingEnd, draggingEndDelay});
            if (hoverOverStackId) {
              const result = {
                "draggableId": "6920565a-6485-4f5b-b0f7-66e36286efee",
                "type": "DEFAULT",
                "source": {
                  "index": stackIndex,
                  "droppableId": fromDroppableId
                },
                "reason": "DROP",
                "mode": "FLUID",
                "destination": null,
                "combine": {
                  "draggableId": hoverOverStackId,
                  "droppableId": hoverOverDroppableId,
                  "direction": hoverOverDirection
                }
              }
              onDragEnd(result);
            } else if (toRegionType == "free") {
              const result = {
                "draggableId": stackId,
                "type": "MANUAL",
                "source": {
                  "index": stackIndex,
                  "droppableId": fromDroppableId
                },
                "reason": "DROP",
                "mode": "FLUID",
                "destination": {
                  "droppableId": hoverOverDroppableId,
                  "index": numStackIdsInGroup
                },
                "combine": null
              }
              onDragEnd(result);
            }
          }
          //const isCombined = Boolean(dragSnapshot.combineTargetFor)
          const draggingToDroppableId = store.getState().playerUi?.dragging?.hoverOverDroppableId;
          var draggingToFree = false;
          if (draggingToDroppableId) {
            const [toGroupId, toRegionType, toRegionDirection] = getGroupIdAndRegionType(draggingToDroppableId);
            draggingToFree = toRegionType === "free";
          }
          return(
            <NaturalDragAnimation
              style={dragProvided.draggableProps.style}
              snapshot={dragSnapshot}
              rotationMultiplier={1}>
              {style => {
                const updatedStyle = {...style}
                if (dragSnapshot.isDropAnimating && draggingToFree) updatedStyle.transitionDuration = "0.0001s";
                //if (isCombined) updatedStyle.zIndex = 0;
                if (updatedStyle.transform && dragSnapshot.isDragging) updatedStyle.transform = updatedStyle.transform + " scale(1.1)";
                if (region.type === "free" && !dragSnapshot.isDragging) updatedStyle.transform = "none";
                // If isInBrowseGroup, add -50% to transform Y
                //if (isInBrowseGroup && dragSnapshot.isDragging) updatedStyle.transform = updatedStyle.transform + " translate(0%, -50vh)";
                updatedStyle.visibility = draggingToFree && ((thisDrag && style.transform === null) || dragSnapshot.isDropAnimating) ? "hidden" : "visible";
                if (region.direction === "horizontal") updatedStyle.display = "inline-block";
                // Check if mouse is within this div

                if (region.type === "free") {
                  return(
                    <StackContainerFree
                      isDragging={dragSnapshot.isDragging}
                      isGroupedOver={isCombined}
                      stackWidth={stackWidth}
                      stackHeight={stackHeight}
                      stackLeft={stack.left}
                      stackTop={stack.top}
                      margin={0}
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      style={updatedStyle}
                    >
                      <Stack
                        stackId={stackId}
                        isDragging={dragSnapshot.isDragging}
                      />
                    </StackContainerFree>
                  )
                } else {
                  return(
                    <StackContainerSorted
                      isDragging={dragSnapshot.isDragging}
                      isGroupedOver={isCombined}
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      stackWidth={(region.type === "fan" && region.direction == "horizontal") ? stackWidthFan : stackWidth}
                      stackHeight={(region.type === "fan" && region.direction == "vertical") ? stackHeightFan : stackHeight}
                      margin={region.type === "row" ? rowSpacing : 0}
                      style={updatedStyle}
                    >
                      <Stack
                        stackId={stackId}
                        isDragging={dragSnapshot.isDragging}
                      />
                    </StackContainerSorted>
                  )
                }
              }}
            </NaturalDragAnimation>
          )
        }}
      </Draggable>
    );
  })