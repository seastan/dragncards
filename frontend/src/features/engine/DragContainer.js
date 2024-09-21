
import React, { useCallback, useEffect, useState } from "react";
import { DragDropContext } from "@seastan/react-beautiful-dnd";
import { useSelector, useDispatch } from 'react-redux';
import { setStackIds, setCardIds, setGroupById } from "../store/gameUiSlice";
import { getGroupIdAndRegionType, reorderGroupStackIds } from "./Reorder";
import store from "../../store";
import { setDraggingEnd, setDraggingEndDelay, setDraggingStackId, setTempDragStack, setDraggingMouseCurrentX, setDraggingMouseCurrentY, setDraggingMouseDownX, setDraggingMouseDownY, setDraggingStackRectangles, setDraggingGroupRectangle, setDraggingDefault, setDraggingHoverOverStackId, setDraggingHoverOverDirection, setDraggingHoverOverDroppableId, setDraggingFromDroppableId, setStatusText, setDraggingPrevStackId, setDragStep } from "../store/playerUiSlice";
import { Table } from "./Table";
import { useDoActionList } from "./hooks/useDoActionList";
import { ArcherContainer } from 'react-archer';
import { getVisibleFace } from "./functions/common";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { usePlayerN } from "./hooks/usePlayerN";
import { useHoverStackIdAndDirection } from "./hooks/useHoverStackIdAndDirection";
import { useGetRegionFromId } from "./hooks/useGetRegionFromId";

let draggableClientRect = null;

const getAfterDragName = (game, stackId, destGroupId, allowFlip) => {
  const stack = game.stackById[stackId];
  const cardIds = stack?.cardIds;
  if (!cardIds || cardIds.length === 0) return;
  const cardId = cardIds[0];
  const card = game.cardById[cardId];

  if (!allowFlip) return card?.sides?.[card?.currentSide]?.name;
  
  const destGroup = game.groupById[destGroupId];
  const destGroupCurrentSide = destGroup?.onCardEnter?.currentSide;
  
  if (destGroupCurrentSide) {
    return card?.sides?.[destGroupCurrentSide]?.name;
  }
  return card?.sides?.[card?.currentSide]?.name;
}

const getXY = (e) => {
  let clientX, clientY;
  if (e.type.startsWith('mouse')) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else if (e.type.startsWith('touch')) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  }
  return {clientX, clientY};
}


export const DragContainer = React.memo(({}) => {
  console.log("Rendering DragContainer");
  const dispatch = useDispatch();
  const gameDef = useGameDefinition();
  const doActionList = useDoActionList();
  const playerN = usePlayerN();
  const [isDragging, setIsDragging] = useState(false);
  const getRegionFromId = useGetRegionFromId();
  const hoverStackIdAndDirection = useHoverStackIdAndDirection();

  const updateMousePosition = (e) => {
    const draggingStackId = store.getState()?.playerUi?.dragging?.stackId;  
    const hoverOverDroppableId = store.getState()?.playerUi?.dragging?.hoverOverDroppableId;
    const hoverOverRegion = getRegionFromId(hoverOverDroppableId);  
    const draggableNode = document.querySelector(`[data-rbd-draggable-id="${draggingStackId}"]`);
    const draggableRect = draggableNode?.getBoundingClientRect();
    if (!draggableRect) return;
    draggableRect.stackId = draggingStackId;
    const centerX = draggableRect.left + draggableRect.width / 2;
    const centerY = draggableRect.top + draggableRect.height / 2;

    const stackRectangles = store.getState()?.playerUi?.dragging?.stackRectangles;
    const groupRectangle = store.getState()?.playerUi?.dragging?.groupRectangle;
    const hoverData = hoverStackIdAndDirection(centerX, centerY, draggableRect, stackRectangles, groupRectangle, hoverOverDroppableId);

    if (hoverData.stackId && hoverOverRegion.disableDroppableAttachments !== true) {

      const draggingTopCardId = store.getState()?.gameUi?.game?.stackById[draggingStackId]?.cardIds[0];
      const draggingTopCard = store.getState()?.gameUi?.game?.cardById[draggingTopCardId];
      const draggingTopFace = getVisibleFace(draggingTopCard, playerN);
      const draggingTopCardType = draggingTopFace?.type;
      const hoverOverStackId = hoverData.stackId;
      const canOnlyAttachToTypes = gameDef?.cardTypes?.[draggingTopCardType]?.canOnlyAttachToTypes;

      const hoverOverTopCardId = store.getState()?.gameUi?.game?.stackById[hoverOverStackId]?.cardIds[0];
      const hoverOverTopCard = store.getState()?.gameUi?.game?.cardById[hoverOverTopCardId];
      const hoverOverTopFace = getVisibleFace(hoverOverTopCard, playerN);
      const hoverOverTopCardType = hoverOverTopFace?.type;
      const canOnlyHaveAttachmentsOfTypes = gameDef?.cardTypes?.[hoverOverTopCardType]?.canOnlyHaveAttachmentsOfTypes;
      console.log("hoverData", hoverData, {canOnlyAttachToTypes, canOnlyHaveAttachmentsOfTypes, hoverOverTopCardType, draggingTopCardType})

      if (canOnlyAttachToTypes && !canOnlyAttachToTypes.includes(hoverOverTopCardType)) {
        dispatch(setDraggingHoverOverStackId(null));
        dispatch(setDraggingHoverOverDirection(null));
        return;
      }
      if (canOnlyHaveAttachmentsOfTypes && !canOnlyHaveAttachmentsOfTypes.includes(draggingTopCardType)) {
        dispatch(setDraggingHoverOverStackId(null));
        dispatch(setDraggingHoverOverDirection(null));
        return;
      }

      dispatch(setDraggingHoverOverStackId(hoverData.stackId));
      dispatch(setDraggingHoverOverDirection(hoverData.direction));
    } else {
      dispatch(setDraggingHoverOverStackId(null));
      dispatch(setDraggingHoverOverDirection(null));
    }
    const {clientX, clientY} = getXY(e);
    dispatch(setDraggingMouseCurrentX(clientX));
    dispatch(setDraggingMouseCurrentY(clientY));
    // dispatch(setDraggingMouseCurrentX(centerX));
    // dispatch(setDraggingMouseCurrentY(centerY));
    //setMousePosition({ x: ev.clientX, y: ev.clientY });
  };

  const updateMouseDown = (e) => {
    const {clientX, clientY} = getXY(e);
    const rect = e.target.parentElement.parentElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    console.log(`Relative mouse position: ${x}, ${y}`);
    dispatch(setDraggingMouseDownX(x));
    dispatch(setDraggingMouseDownY(y));
    //setMouseDownPosition({ x: x, y: y });
  }

  const onBeforeDragStart = (result) => {
    const droppableId = result.source.droppableId;
    dispatch(setDraggingFromDroppableId(droppableId));
    dispatch(setDraggingStackId(result.draggableId));
    dispatch(setTempDragStack(null));
    dispatch(setDragStep("beforeDragStart"));

    if (!result?.draggableId || !result?.source?.droppableId) return;
    updateDraggingUi(result.draggableId, result.source.droppableId);

    setIsDragging(true);
  }

  const updateDraggingUi = (draggableId, droppableId) => {
    const region = getRegionFromId(droppableId);
    console.log("updateDraggingUi", droppableId, region)
    const destGroupId = region?.groupId;
    //const [destGroupId, destRegionType, destRegionDirection] = getGroupIdAndRegionType(droppableId);

    dispatch(setDraggingHoverOverDroppableId(droppableId));

    if (destGroupId) {
      const destStackIds = store.getState()?.gameUi?.game?.groupById[destGroupId]?.stackIds;
      setTimeout(() => {
        const rects = [];
        destStackIds.forEach(stackId => {
          if (stackId === draggableId) return;
          const stackNode = document.querySelector(`[data-rbd-draggable-id="${stackId}"]`);
          if (stackNode) {
            const stackRect = stackNode.getBoundingClientRect();
            stackRect.stackId = stackId;
            rects.push(stackRect);
          }
        })
        dispatch(setDraggingStackRectangles(rects));
        const groupRectangle = document.querySelector(`[data-rbd-droppable-id="${droppableId}"]`).getBoundingClientRect();
        dispatch(setDraggingGroupRectangle(groupRectangle));
      }, 200);
    }
  }

  const onDragUpdate = (result) => {
    if (!result?.draggableId || !result?.destination?.droppableId) return;
    updateDraggingUi(result.draggableId, result.destination.droppableId);
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", updateMousePosition);
      document.addEventListener('touchmove', updateMousePosition);
    }

    return () => {
      if (isDragging) {
        document.removeEventListener("mousemove", updateMousePosition);
        document.removeEventListener('touchmove', updateMousePosition);
      }
    };
  }, [isDragging]);

  useEffect(() => {
    document.addEventListener("mousedown", updateMouseDown);
    document.addEventListener('touchstart', updateMouseDown);

    return () => {
      document.removeEventListener("mousedown", updateMouseDown);
      document.removeEventListener('touchstart', updateMouseDown);
    };
  }, []);

  const onDragEnd = (result) => {
    console.log("onDragEnd", result);
    if (!isDragging) return;
    setIsDragging(false);
    const game = store.getState()?.gameUi.game;
    const keypressShift = store.getState()?.playerUi?.keypress?.Shift;
    const groupById = game.groupById;
    const orig = result.source;
    const origDroppableId = orig.droppableId;

    const origRegion = getRegionFromId(origDroppableId);
    const origGroupId = origRegion.groupId;
    //const [origGroupId, origRegionType, origRegionDirection] = getGroupIdAndRegionType(origDroppableId);
    const origGroup = groupById[origGroupId];
    const origGroupStackIds = origGroup.stackIds;
    const origStackId = origGroupStackIds[orig.index];    
    const allowFlip = keypressShift ? false : true; 
    var dest = result.combine ? result.combine : result.destination;
    if (!dest) {
      dest = {...orig};
    }
    const destDroppableId = dest?.droppableId;
    const destRegion = getRegionFromId(destDroppableId);
    const destGroupId = destRegion.groupId;
    const destRegionType = destRegion.type;
    const afterDragName = getAfterDragName(game, origStackId, destGroupId, allowFlip);

    const destGroup = groupById[destGroupId];
    const destGroupStackIds = destGroup.stackIds;
    
    // Combine
    if (result.combine) {
      const destStackId = result.combine.draggableId;
      const destStack = game.stackById[destStackId];
      const destStackCardIds = destStack.cardIds;
      const card0 = game.cardById[destStackCardIds[0]];
      const stackIndex = card0.stackIndex;
      const controlPressed = store.getState()?.playerUi?.keypress?.Control;
      if (controlPressed) result.combine.direction = "behind";
      doActionList([
        ["LOG", "$ALIAS_N", " attached ", afterDragName, " from ", "$GAME.groupById."+origGroupId+".label", " to ", ["FACEUP_NAME_FROM_STACK_ID", destStackId], "."],
        ["MOVE_STACK", origStackId, destGroupId, stackIndex, {"combine": result.combine.direction, "allowFlip": allowFlip}],
      ])
    }
    
    // Dragged somewhere
    else {
      // Dropped nowhere
      if (!result.destination) {
        return;
      }
      if (destRegionType === "free") {
        dest.index = destGroupStackIds.length;
      }
      if (destRegionType === "pile") {
        dest.index = 0; // Fix placement bug when a pile region is wide and a card is placed to the right of the top card
      }

      const newGroupById = reorderGroupStackIds(groupById, origGroupId, orig.index, destGroupId, dest.index);
      const stackLeft = store.getState()?.playerUi?.tempDragStack?.left;
      const stackTop = store.getState()?.playerUi?.tempDragStack?.top;
      doActionList([
        ["LOG", "$ALIAS_N", " moved ", afterDragName, " from ", "$GAME.groupById."+origGroupId+".label", " to ", "$GAME.groupById."+destGroupId+".label", "."],
        ["MOVE_STACK", origStackId, destGroupId, dest.index, {"allowFlip": allowFlip}],
        ["COND",
          ["DEFINED", `$GAME.stackById.${origStackId}`],
          [
            ["SET", `/stackById/${origStackId}/left`, stackLeft],
            ["SET", `/stackById/${origStackId}/top`, stackTop]
          ]
        ]
      ])
      dispatch(setGroupById(newGroupById));
    }

  }

  return(

      <ArcherContainer 
        className="h-full w-full" 
        strokeColor="rgba(255,0,0,0.6)" 
        strokeWidth="15"
        svgContainerStyle={{ 
          zIndex: 2e3,
        }} 
        endShape={{
          arrow: {
            arrowLength: 1,
            arrowThickness: 2,
          }
        }}>
      <DragDropContext onDragEnd={onDragEnd} onBeforeDragStart={onBeforeDragStart} onDragUpdate={onDragUpdate}>
        <Table onDragEnd={onDragEnd}/>
      </DragDropContext>
    </ArcherContainer>
  )
});