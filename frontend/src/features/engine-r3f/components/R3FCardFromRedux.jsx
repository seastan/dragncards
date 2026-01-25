/**
 * R3FCardFromRedux - Single card component connected to Redux store
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { DraggableCard } from './R3FCard';
import { useVisibleFaceSrc } from '../../engine/hooks/useVisibleFaceSrc';
import { useCardRotation } from '../../engine/hooks/useCardRotation';
import { useGameDefinition } from '../../engine/hooks/useGameDefinition';
import { getProxiedImageUrl } from '../utils/imageProxy';
import { setActiveCardId, setScreenLeftRight, setDropdownMenu, setCardClicked, setMouseXY, setMouseTopBottom } from '../../store/playerUiSlice';
import { useDropContext, useDragStateContext } from './R3FScene';

/**
 * R3FCardFromRedux - Gets card data from Redux and renders a DraggableCard
 */
export const R3FCardFromRedux = ({ cardId, stackId, groupId, region, position, zIndex = 0 }) => {
  const dispatch = useDispatch();

  // Use the same hook as the 2D engine for getting card images
  const visibleFaceSrc = useVisibleFaceSrc(cardId);
  // Proxy the image URL to add CORS headers for WebGL
  const imageSrc = getProxiedImageUrl(visibleFaceSrc?.src);
  // Get face name for menu title
  const visibleFaceName = visibleFaceSrc?.name;
  // Get card rotation (in degrees: 0, 90, 180, 270)
  const cardRotation = useCardRotation(cardId);

  const card = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]);
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const gameDef = useGameDefinition();

  // Get token data for the card
  const tokens = card?.tokens || {};
  // Proxy token image URLs for CORS support (needed for WebGL textures)
  const tokenDefinitions = useMemo(() => {
    const defs = gameDef?.tokens || {};
    const proxiedDefs = {};
    for (const [key, def] of Object.entries(defs)) {
      proxiedDefs[key] = {
        ...def,
        imageUrl: def.imageUrl ? getProxiedImageUrl(def.imageUrl) : null,
      };
    }
    return proxiedDefs;
  }, [gameDef?.tokens]);
  const activeCardId = useSelector(state => state?.playerUi?.activeCardId);
  const dropContext = useDropContext();
  const dragStateContext = useDragStateContext();

  // Handle drag start - notify context for Trello-style reordering
  const handleDragStart = useCallback(() => {
    if (dragStateContext?.setDraggedStack) {
      dragStateContext.setDraggedStack({
        stackId,
        cardId,
        sourceGroupId: groupId,
        sourceRegion: region,
      });
    }
  }, [dragStateContext, stackId, cardId, groupId, region]);

  // Handle drag end - detect drop target and execute action
  // Must be defined before early return to satisfy hooks rules
  const handleDragEnd = useCallback((finalPosition) => {
    if (!dropContext) return;

    const { findRegionAtPoint, onCardDrop, getInsertionIndex } = dropContext;
    const targetInfo = findRegionAtPoint(finalPosition[0], finalPosition[2]);

    // Calculate insertion index for row/fan regions
    let insertionIndex = null;
    if (targetInfo?.region && getInsertionIndex) {
      insertionIndex = getInsertionIndex(
        finalPosition[0],
        targetInfo.region,
        groupId // source group ID to exclude dragged card from count
      );
    }

    // Debug: log target info to diagnose missing groupId
    console.log('Drop target info:', {
      targetInfo,
      regionId: targetInfo?.regionId,
      region: targetInfo?.region,
      groupId: targetInfo?.region?.groupId,
      insertionIndex,
    });

    if (targetInfo && onCardDrop) {
      // Set pending drop to keep card at drop position until Redux updates
      if (dragStateContext?.setPendingDropState) {
        dragStateContext.setPendingDropState({
          stackId,
          cardId,
          sourceGroupId: groupId,
          targetGroupId: targetInfo.region?.groupId,
          dropPosition: finalPosition,
          insertionIndex,
        });
      }

      onCardDrop({
        stackId,
        cardId,
        sourceGroupId: groupId,
        sourceRegion: region,
        targetGroupId: targetInfo.region?.groupId,
        targetRegion: targetInfo.region,
        position: finalPosition,
        insertionIndex,
      });
    }

    // Clear drag state immediately - pendingDrop will handle position
    if (dragStateContext?.clearDraggedStack) {
      dragStateContext.clearDraggedStack();
    }
  }, [dropContext, dragStateContext, stackId, cardId, groupId, region]);

  // Handle drag move - update hover state and drag position
  const handleDragMove = useCallback((currentPosition) => {
    // Update drag position for Trello-style reordering
    if (dragStateContext?.setDragPosition) {
      dragStateContext.setDragPosition(currentPosition);
    }

    // Track pointer position for hover detection after drop
    if (dragStateContext?.updatePointerPosition) {
      dragStateContext.updatePointerPosition(currentPosition);
    }

    if (!dropContext) return null;

    const { findRegionAtPoint, setHoveredRegionId } = dropContext;
    const targetInfo = findRegionAtPoint(currentPosition[0], currentPosition[2]);

    if (setHoveredRegionId) {
      setHoveredRegionId(targetInfo?.regionId || null);
    }

    // Update hovered group for insertion calculation
    if (dragStateContext?.setHoveredGroupId) {
      dragStateContext.setHoveredGroupId(targetInfo?.region?.groupId || null);
    }

    return targetInfo;
  }, [dropContext, dragStateContext]);

  // Handle hover - set active card ID and screen position for GiantCard
  const handleHover = useCallback((id, event) => {
    dispatch(setActiveCardId(id));
    // Set screen left/right for GiantCard positioning
    // R3F events have clientX on nativeEvent, regular events have it directly
    const clientX = event?.nativeEvent?.clientX ?? event?.clientX;
    if (clientX !== undefined) {
      const screenLeftRight = clientX > (window.innerWidth / 2) ? "right" : "left";
      dispatch(setScreenLeftRight(screenLeftRight));
    }
    // Set top/bottom for token hotkeys based on UV coordinates on the card
    // UV.y > 0.5 = top half of card (add tokens), UV.y < 0.5 = bottom half (subtract)
    // This is rotation-independent since UVs are in the card's local space
    const uv = event?.uv;
    if (uv) {
      const topBottom = uv.y > 0.5 ? "top" : "bottom";
      dispatch(setMouseTopBottom(topBottom));
    }
  }, [dispatch]);

  // Handle hover end - clear active card ID
  const handleHoverEnd = useCallback(() => {
    dispatch(setActiveCardId(null));
  }, [dispatch]);

  // Handle click - open card menu (matches 2D engine behavior)
  const handleClick = useCallback((id, event) => {
    // Get mouse position from event (DOM event from canvas listener)
    const clientX = event?.clientX;
    const clientY = event?.clientY;

    console.log('R3F card click:', { id, clientX, clientY, playerN, event });

    // Set mouse position for dropdown menu positioning
    if (clientX !== undefined && clientY !== undefined) {
      dispatch(setMouseXY({ x: clientX, y: clientY }));
    }

    // Set active card and screen position
    dispatch(setActiveCardId(id));
    if (clientX !== undefined) {
      const screenLeftRight = clientX > (window.innerWidth / 2) ? "right" : "left";
      dispatch(setScreenLeftRight(screenLeftRight));
    }
    dispatch(setCardClicked(true));

    // Open the dropdown menu (only if player is active, not spectating)
    if (playerN) {
      const dropdownMenu = {
        type: "card",
        cardId: id,
        title: visibleFaceName || id,
        visible: true,
      };
      console.log('Dispatching dropdownMenu:', dropdownMenu);
      dispatch(setDropdownMenu(dropdownMenu));
    }
  }, [dispatch, playerN, visibleFaceName]);

  // Check if this card has a pending drop
  const pendingDrop = dragStateContext?.pendingDrop;
  const hasPendingDrop = pendingDrop?.stackId === stackId;

  // Get current stack index in its group to detect when Redux has updated
  const currentGroup = useSelector(state => state?.gameUi?.game?.groupById?.[groupId]);
  const currentStackIndex = currentGroup?.stackIds?.indexOf(stackId) ?? -1;

  // Track the original index when pending drop started
  const originalStackIndex = useRef(currentStackIndex);
  useEffect(() => {
    if (hasPendingDrop) {
      originalStackIndex.current = currentStackIndex;
    }
  }, [hasPendingDrop]);

  // Clear pending drop when card reaches target position
  useEffect(() => {
    if (!hasPendingDrop) return;

    const isInTargetGroup = pendingDrop?.targetGroupId === groupId;
    const isSameGroupReorder = pendingDrop?.sourceGroupId === pendingDrop?.targetGroupId;

    if (isInTargetGroup) {
      let shouldClear = false;

      if (isSameGroupReorder) {
        // For same-group reorder, check if card index has changed from original
        const hasIndexChanged = currentStackIndex !== originalStackIndex.current;
        if (hasIndexChanged) {
          shouldClear = true;
        }
      } else {
        // For cross-group move, just check if card is in target group
        shouldClear = true;
      }

      if (shouldClear) {
        // Set this card as active since it was just dropped (mouse is likely still over it)
        dispatch(setActiveCardId(cardId));

        if (dragStateContext?.clearPendingDrop) {
          dragStateContext.clearPendingDrop();
        }
      }
    }
  }, [hasPendingDrop, pendingDrop, groupId, currentStackIndex, dragStateContext, dispatch, cardId]);

  // Fallback timeout to clear pending drop if something goes wrong
  useEffect(() => {
    if (!hasPendingDrop) return;

    const timeout = setTimeout(() => {
      if (dragStateContext?.clearPendingDrop) {
        dragStateContext.clearPendingDrop();
      }
    }, 2000); // 2 second fallback

    return () => clearTimeout(timeout);
  }, [hasPendingDrop, dragStateContext]);

  if (!card) return null;

  // Get card label (name from face A)
  const label = card.sides?.A?.name || cardId;

  // Generate a color based on cardId for fallback
  const hashCode = cardId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const fallbackColor = `hsl(${Math.abs(hashCode) % 360}, 60%, 40%)`;

  const isActive = activeCardId === cardId;

  // For cross-region drops, pass the drop position so the new component can animate from it
  // IMPORTANT: Only pass to the TARGET card, not the source card (which would try to animate backwards)
  const isCrossRegionDrop = hasPendingDrop && pendingDrop?.sourceGroupId !== pendingDrop?.targetGroupId;
  const isInTargetGroup = groupId === pendingDrop?.targetGroupId;
  const pendingDropPosition = (isCrossRegionDrop && isInTargetGroup) ? [
    pendingDrop.dropPosition[0],
    2, // Lifted Y height
    pendingDrop.dropPosition[2],
  ] : null;

  return (
    <DraggableCard
      position={position}
      color={fallbackColor}
      label={label}
      initialZIndex={zIndex}
      imageSrc={imageSrc}
      rotation={cardRotation}
      tokens={tokens}
      tokenDefinitions={tokenDefinitions}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragMove={handleDragMove}
      onClick={handleClick}
      cardId={cardId}
      onHover={handleHover}
      onHoverEnd={handleHoverEnd}
      isActive={isActive}
      pendingDropPosition={pendingDropPosition}
    />
  );
};

export default R3FCardFromRedux;
