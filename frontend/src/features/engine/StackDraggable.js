import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
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
import { setDraggingDefault, setDraggingEndDelay, setDraggingStarted, setDragStep, setStatusText, setTempDragStack } from "../store/playerUiSlice";
import { useGetRegionFromId } from "./hooks/useGetRegionFromId";

const StackContainerFree = styled.div`
  position: absolute;
  float: left;
  userSelect: none;
  margin: 0dvh ${props => props.margin}dvh 0dvh 0dvh;
  left: ${props => props.stackLeft};
  top: ${props => props.stackTop};
  width: ${props => props.stackWidth}dvh;
  height: ${props => props.stackHeight}dvh;
  opacity: ${props => props.isGroupedOver ? 0.4 : 1};
`;

export const StackContainerSorted = styled.div`
  position: relative;
  userSelect: none;
  width: ${props => props.stackWidth}dvh;
  height: ${props => props.stackHeight}dvh;
  margin: 0dvh ${props => props.margin}dvh 0dvh 0dvh;
  opacity: ${props => props.isGroupedOver ? 0.4 : 1};
`;
//
//


function useHandlePropsChange(props, callback, doPrint = false) {
  const previousProps = useRef();

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changesObj = {};
      allKeys.forEach(key => {
        if (previousProps.current[key] !== props[key]) {
          changesObj[key] = {
            from: previousProps.current[key],
            to: props[key]
          };
        }
      });
      if (Object.keys(changesObj).length) {
        if (doPrint) console.log('Changed props:', changesObj);
        callback();
      }
    }
    previousProps.current = props;
  });
}

export const StackDraggable = React.memo(({
    region,
    stackIndex,
    stackId,
    numStacksVisible,
    onDragEnd,
    hideStack,
  }) => {

    const dispatch = useDispatch();
    const stack = useSelector(state => state?.gameUi?.game?.stackById[stackId]);
    const touchMode = useSelector(state => state?.playerUi?.userSettings?.touchMode);

    const isInPileAndAnotherStackIsActive = useSelector((state) => {
      const activeCardId = state?.playerUi?.activeCardId;
      const activeCard = state?.gameUi?.game?.cardById?.[activeCardId];
      const activeStackId = activeCard?.stackId;
      const draggingStackId = state?.playerUi?.dragging?.stackId;
      return ((activeStackId && activeStackId !== stackId) || (draggingStackId !== null && draggingStackId !== stackId)) && region.type === "pile";
    });
    //const absoluteDragStep = useSelector(state => state?.playerUi?.dragging?.dragStep);

    const dragStep = useSelector(state => ( state?.playerUi?.dragging?.stackId === stackId) ? state?.playerUi?.dragging?.dragStep : null);
    const regionCardSizeFactor = region.cardSizeFactor || 1;
    const zoomFactor = useSelector(state => state?.playerUi?.userSettings?.zoomPercent)/100 * regionCardSizeFactor;
    const isCombined = useSelector(state => (
      (state?.playerUi?.dragging?.stackId === stackId) && 
      (state?.playerUi?.dragging?.hoverOverStackId !== null) &&
      (state?.playerUi?.dragging?.hoverOverAttachmentAllowed)
    ));
    const playerN = usePlayerN();
    const getRegionFromId = useGetRegionFromId();

    const layout = useLayout();
    var rowSpacing = layout?.rowSpacing;
    const cardSize = layout?.cardSize;
    if (stackId === store.getState().playerUi?.dragging?.stackId) console.log('Changed props dragStep ', dragStep);
    var spacingFactor = touchMode ? 1.5 : 1;
    const { height, width } = useWindowDimensions();
    const aspectRatio = width/height;
    const cardIds = stack?.cardIds || [];
    const card0 = store.getState().gameUi.game.cardById[cardIds[0]];
    // Calculate size of stack for proper spacing. Changes base on group type and number of stack in group.
    const {offsetTotals, offsetAmounts, stackEdges} = useOffsetTotalsAndAmounts(stackId);

    const handlePositionChange = () => {
      if (dragStep !== null) {
        dispatch(setDraggingDefault())
        dispatch(setTempDragStack(null))
      }
    }

    //useHandlePropsChange({region, stackIndex, stackId, numStacksVisible, onDragEnd, stack, touchMode, dragStep, regionCardSizeFactor, zoomFactor, isCombined, playerN, layout, rowSpacing, cardSize, spacingFactor, aspectRatio, cardIds, card0, offsetTotals, offsetAmounts, stackEdges}, () => {}, dragStep !== null);
    useHandlePropsChange({left: stack?.left, top: stack?.top}, handlePositionChange, dragStep !== null);


    if (!stack) return null;

    const numStacksNonZero = Math.max(numStacksVisible, 1);
    const regionWidthPercent = convertToPercentage(region.width);
    const regionWidthInt = parseInt(regionWidthPercent.substring(0, regionWidthPercent.length - 1))
    const fanSpacingHoriz = (regionWidthInt-cardSize/2)*aspectRatio/numStacksNonZero;
    const cardWidth = card0?.sides[card0?.currentSide]?.width;
    const cardHeight = card0?.sides[card0?.currentSide]?.height;
    const stackHeight = (stackEdges.bottom - stackEdges.top) * zoomFactor;
    const stackTopOffset = stackEdges.top * zoomFactor;
    const stackTop = region.type === "free" ? `calc(${stack.top} + ${stackTopOffset}dvh)` : stack.top;
    var stackWidth = (stackEdges.right - stackEdges.left) * zoomFactor;
    if (isInPileAndAnotherStackIsActive) {
      stackWidth = stackWidth * 0.1;
      rowSpacing = 0;
    }
    const stackWidthFan = Math.min(fanSpacingHoriz, cardWidth*cardSize*zoomFactor);
    const stackLeftOffset = stackEdges.left * zoomFactor;
    const stackLeft = region.type === "free" ? `calc(${stack.left} + ${stackLeftOffset}dvh)` : stack.left;
  
    const regionHeightPercent = convertToPercentage(region.height);
    const regionHeightInt = parseInt(regionHeightPercent.substring(0, regionHeightPercent.length - 1))
    const fanSpacingVert = (regionHeightInt-cardSize)/numStacksNonZero;
    const stackHeightFan = Math.min(fanSpacingVert, cardHeight*cardSize*zoomFactor);

    return (
      <Draggable 
        key={stackId} 
        draggableId={stackId} 
        index={stackIndex}
        isDragDisabled={playerN === null}>
        {(dragProvided, dragSnapshot) => {
          console.log("Rendering StackDraggable dragSnapshot", {dragSnapshot});
          const draggingStackId = store.getState().playerUi?.dragging?.stackId;
          if (dragStep === "beforeDragStart" && dragSnapshot.isDragging) {
            dispatch(setDragStep("dragging"));
          }

          // End of animation
          if (stackId === draggingStackId && dragStep === "dropAnimating" && !dragSnapshot.isDropAnimating) {
            dispatch(setDragStep("doneDropAnimating"));
            //dispatch(setDraggingDefault());
          }
            
          const hoverOverDroppableId = store.getState().playerUi?.dragging?.hoverOverDroppableId;
          const toRegionType = (hoverOverDroppableId === null) ? null : getRegionFromId(hoverOverDroppableId)?.type;
          // Mouse let go
          if (stackId === draggingStackId && dragStep === "dragging" && dragSnapshot.isDropAnimating && onDragEnd) {
            dispatch(setDragStep("dropAnimating"));
            const fromDroppableId = store.getState().playerUi?.dragging?.fromDroppableId;
            const hoverOverStackId = store.getState().playerUi?.dragging?.hoverOverStackId;
            const hoverOverDirection = store.getState().playerUi?.dragging?.hoverOverDirection;
            const hoverOverAttachmentAllowed = store.getState().playerUi?.dragging?.hoverOverAttachmentAllowed;
            //const [toGroupId, toRegionType, toRegionDirection] = getGroupIdAndRegionType(hoverOverDroppableId);
            console.log('onDragEnd hoverOverStackId 2:',{hoverOverStackId, toRegionType});
            if (hoverOverStackId && hoverOverAttachmentAllowed) {
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
              dispatch(setDraggingDefault());
            } else if (toRegionType == "free") {
              // const result = {
              //   "draggableId": stackId,
              //   "type": "MANUAL",
              //   "source": {
              //     "index": stackIndex,
              //     "droppableId": fromDroppableId
              //   },
              //   "reason": "DROP",
              //   "mode": "FLUID",
              //   "destination": {
              //     "droppableId": hoverOverDroppableId,
              //     "index": numStackIdsInGroup
              //   },
              //   "combine": null
              // }

              const destRegion = getRegionFromId(hoverOverDroppableId);
              const destGroupId = destRegion.groupId;
              var newStackLeft = 0;
              var newStackTop = 0;
          
              const playerUiDragging = store.getState()?.playerUi?.dragging;
              const playerUiDroppableRefs = store.getState()?.playerUi?.droppableRefs;
              if (playerUiDroppableRefs?.[destGroupId]) {
                const droppableRect = playerUiDroppableRefs[destGroupId].getBoundingClientRect();
                const xRelative = playerUiDragging.mouseCurrentX - playerUiDragging.mouseDownX - droppableRect.left;
                const yRelative = playerUiDragging.mouseCurrentY - playerUiDragging.mouseDownY - droppableRect.top;
                newStackLeft = xRelative/droppableRect.width*100 + '%';
                newStackTop = yRelative/droppableRect.height*100 + '%';
              }

              dispatch(setTempDragStack({
                stackId: stackId, 
                toGroupId: destGroupId,
                left: newStackLeft,
                top: newStackTop
              }));
              //onDragEnd(result);
            } else {
              //dispatch(setDraggingDefault());
            }
          }

          return(
            <NaturalDragAnimation
              style={dragProvided.draggableProps.style}
              snapshot={dragSnapshot}
              rotationMultiplier={1}>
              {style => {
                var updatedStyle = {...style}
                if (dragSnapshot.isDropAnimating && toRegionType === "free") updatedStyle.transitionDuration = "0.0001s";
                //if (isCombined) updatedStyle.zIndex = 0;
                if (updatedStyle.transform && dragSnapshot.isDragging) updatedStyle.transform = updatedStyle.transform + " scale(1.1)";
                if (region.type === "free" && !dragSnapshot.isDragging) updatedStyle.transform = "none";
                if (isInPileAndAnotherStackIsActive) updatedStyle.opacity = "0";
                if (toRegionType === "free" && (dragStep === "dropAnimating" || dragStep === "doneDropAnimating") ) updatedStyle.opacity = "0.01";
                // if (region.type === "pile" && !thisIsDragging) {
                //   stackWidth = stackWidth * 0.;
                //   rowSpacing = 0;
                // }
                // if (thisIsDragging) updatedStyle.width = "10px";
                // if (thisIsDragging) updatedStyle.opacity = 0.4;
                //if (updatedStyle.transition !== null) updatedStyle.transition = null;
                //if (updatedStyle.zIndex === 4500) updatedStyle = {"transform":"none","transition":null}
                //dispatch(setStatusText(JSON.stringify(dragSnapshot)))
                //if (draggingEnd) updatedStyle.opacity = 0.1;
                // If isInBrowseGroup, add -50% to transform Y
                //if (isInBrowseGroup && dragSnapshot.isDragging) updatedStyle.transform = updatedStyle.transform + " translate(0%, -50dvh)";
                //updatedStyle.visibility = draggingToFree && ((thisDrag && style.transform === null) || dragSnapshot.isDropAnimating) ? "hidden" : "visible";
                if (region.direction === "horizontal") updatedStyle.display = "inline-block";
                //if (tempDragStackIdIsThisStackId) updatedStyle.visibility = "hidden";
                // Check if mouse is within this div

                if (region.type === "free") {
                  return(
                    <StackContainerFree
                      isDragging={dragSnapshot.isDragging}
                      isGroupedOver={isCombined}
                      stackWidth={stackWidth}
                      stackHeight={stackHeight}
                      stackLeft={stackLeft}
                      stackTop={stackTop}
                      margin={0}
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      style={updatedStyle}
                    >
                      <Stack
                        stackId={stackId}
                        isDragging={dragSnapshot.isDragging}
                        stackZoomFactor={zoomFactor}
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
                      margin={region.type === "row" ? rowSpacing*zoomFactor : 0}
                      style={updatedStyle}
                    >
                      <Stack
                        stackId={stackId}
                        isDragging={dragSnapshot.isDragging}
                        stackZoomFactor={zoomFactor}
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