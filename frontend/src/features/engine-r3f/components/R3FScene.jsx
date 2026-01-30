/**
 * R3FScene - Main scene component connected to Redux store
 * Renders cards based on the game state
 */

import React, { useState, useCallback, createContext, useContext, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { TableSurface } from './R3FTable';
import { R3FCardFromRedux } from './R3FCardFromRedux';
import { RegionBoundary, isPointInRegion } from '../R3FDragSystem';
import { useFormatGroupId } from '../../engine/hooks/useFormatGroupId';
import { TABLE_WIDTH, TABLE_HEIGHT } from '../utils/cameraUtils';
import { parsePercent, percentToWorld, regionToWorld, calculateInsertionIndex } from '../utils/regionUtils';

// Context to share drag-drop functionality with cards
const DropContext = createContext(null);
export const useDropContext = () => useContext(DropContext);

// Context to share drag state for Trello-style reordering
const DragStateContext = createContext(null);
export const useDragStateContext = () => useContext(DragStateContext);

/**
 * Renders all cards from a specific group
 */
const R3FGroupCards = ({ groupId, region }) => {
  const group = useSelector(state => state?.gameUi?.game?.groupById?.[groupId]);
  const stackById = useSelector(state => state?.gameUi?.game?.stackById);
  const layout = useSelector(state => state?.gameUi?.game?.layout);
  const cardSize = layout?.cardSize || 6;
  const dragStateContext = useDragStateContext();

  if (!group || !group.stackIds) return null;

  // Get drag state for Trello-style reordering
  const draggedStack = dragStateContext?.draggedStack;
  const dragPosition = dragStateContext?.dragPosition;
  const hoveredGroupId = dragStateContext?.hoveredGroupId;
  const pendingDrop = dragStateContext?.pendingDrop;

  // Check if this group is the source (card being dragged from here)
  const isSourceGroup = draggedStack?.sourceGroupId === groupId;
  // Check if this group is currently being hovered over
  const isHoveredGroup = hoveredGroupId === groupId && draggedStack;
  // Check if this is a different group being hovered (for gap creation)
  const isExternalTarget = isHoveredGroup && !isSourceGroup;
  // Check if we're reordering within the same group
  const isInternalReorder = isHoveredGroup && isSourceGroup;

  // Check if there's a pending drop targeting this group
  const hasPendingDropToThisGroup = pendingDrop?.targetGroupId === groupId;
  const hasPendingDropFromThisGroup = pendingDrop?.sourceGroupId === groupId;
  const pendingDropIsExternal = pendingDrop && pendingDrop.sourceGroupId !== pendingDrop.targetGroupId;
  const pendingDropIsInternal = pendingDrop && pendingDrop.sourceGroupId === pendingDrop.targetGroupId;

  // Get the stack being dragged or pending drop
  const activeStackId = draggedStack?.stackId || pendingDrop?.stackId;

  // Check if we should treat this as source group (either active drag or pending drop)
  const isEffectiveSourceGroup = isSourceGroup || hasPendingDropFromThisGroup;

  // Get the index of the dragged/pending stack in this group (if it's the source)
  const draggedStackIndex = isEffectiveSourceGroup
    ? group.stackIds.indexOf(activeStackId)
    : -1;

  // Count of stacks excluding the dragged one (for position calculations)
  // Use effective source group to maintain correct count during pending drop
  const nonDraggedStackCount = isEffectiveSourceGroup
    ? group.stackIds.length - 1
    : group.stackIds.length;

  // Calculate insertion index for target group (both internal reorder and external drop)
  let insertionIndex = -1;
  if (isHoveredGroup && dragPosition && (region.type === 'row' || region.type === 'fan')) {
    insertionIndex = calculateInsertionIndex(
      dragPosition[0],
      region,
      nonDraggedStackCount,
      region.type,
      dragPosition[2] // Z coordinate for vertical regions
    );
  }
  // Use pending drop insertion index if no active drag but pending drop exists
  if (insertionIndex === -1 && hasPendingDropToThisGroup && pendingDrop?.insertionIndex !== null) {
    insertionIndex = pendingDrop.insertionIndex;
  }

  // Check if a cross-region pending drop card is already in this group (Redux has updated)
  // Only applies to cross-region drops - for same-region, the card is always in the group
  const crossRegionDropComplete = hasPendingDropToThisGroup &&
    pendingDropIsExternal &&
    group.stackIds.includes(pendingDrop?.stackId);

  // Should we make room for an incoming card?
  // Don't make room if a cross-region drop is complete (card already in target group)
  const shouldMakeRoom = !crossRegionDropComplete && (
    isExternalTarget || isInternalReorder ||
    (hasPendingDropToThisGroup && pendingDropIsExternal) ||
    (hasPendingDropToThisGroup && pendingDropIsInternal)
  );

  const cards = [];
  let globalCardIndex = 0;
  let positionIndex = 0; // Separate counter for position calculation (skips dragged card)

  group.stackIds.forEach((stackId, stackIndex) => {
    const stack = stackById?.[stackId];
    if (!stack || !stack.cardIds) return;

    // Check if this is the card being dragged or has pending drop
    const isBeingDragged = isEffectiveSourceGroup && stackId === activeStackId;

    // For position calculation, use positionIndex (which skips the dragged card)
    // But still render the dragged card (it will be at its drag position)
    let adjustedStackIndex = positionIndex;

    if (!isBeingDragged) {
      // Only apply Trello-style shifting to non-dragged cards
      if (shouldMakeRoom && insertionIndex >= 0 && positionIndex >= insertionIndex) {
        // Shift cards right to make room for the incoming card
        adjustedStackIndex = positionIndex + 1;
      }
      positionIndex++; // Only increment for non-dragged cards
    }

    stack.cardIds.forEach((cardId, cardIndexInStack) => {
      let position;
      const baseY = 0.1 + globalCardIndex * 0.02; // Slight Y offset to prevent z-fighting

      // For dragged cards, calculate their original position (before drag started)
      // This prevents the card from briefly appearing at wrong position
      const originalStackIndex = isBeingDragged ? draggedStackIndex : adjustedStackIndex;

      if (region.type === 'free') {
        // Free regions: stacks have their own position within the region
        const stackLeft = stack.left || '0%';
        const stackTop = stack.top || '0%';
        position = regionToWorld(region, stackLeft, stackTop, baseY);

        // Offset for cards in the same stack (fan out behind)
        if (cardIndexInStack > 0) {
          position[1] += cardIndexInStack * 0.02;
          position[2] += cardIndexInStack * 1.5; // Fan out in Z direction
        }
      } else if (region.type === 'row') {
        // Row regions: cards arranged with spacing (horizontal or vertical)
        const regionLeft = parsePercent(region.left);
        const regionTop = parsePercent(region.top);
        const regionWidth = parsePercent(region.width);
        const regionHeight = parsePercent(region.height);
        const isVertical = region.direction === 'vertical';

        // Card dimensions - when landscape, visual width is cardHeight
        const CARD_WIDTH = 6;
        const CARD_HEIGHT = 8.4;
        // For landscape cards, use card height as spacing (cards touching)
        const landscapeCardWidth = CARD_HEIGHT;

        // Calculate effective stack count for spacing
        // Base count excludes the dragged card if this is source group (or has pending drop from here)
        // Add 1 if making room for an incoming card
        const baseStackCount = isEffectiveSourceGroup ? nonDraggedStackCount : group.stackIds.length;
        const effectiveStackCount = shouldMakeRoom ? baseStackCount + 1 : baseStackCount;

        const edgePadding = landscapeCardWidth * 0.5;

        if (isVertical) {
          // Vertical row: cards arranged along Z axis
          const regionHeightWorld = (regionHeight / 100) * TABLE_HEIGHT;
          const regionTopWorld = ((regionTop / 100) - 0.5) * TABLE_HEIGHT;
          const availableHeight = regionHeightWorld - (2 * edgePadding);

          let cardSpacing;
          if (effectiveStackCount <= 1) {
            cardSpacing = landscapeCardWidth * 1.02;
          } else {
            cardSpacing = Math.min(availableHeight / (effectiveStackCount - 1), landscapeCardWidth * 1.02);
          }

          const startZ = regionTopWorld + edgePadding;
          const regionCenterX = ((regionLeft / 100) - 0.5) * TABLE_WIDTH + (regionWidth / 100) * TABLE_WIDTH * 0.5;

          const posIndex = isBeingDragged ? originalStackIndex : adjustedStackIndex;
          position = [regionCenterX, baseY, startZ + posIndex * cardSpacing];

          // Stack cards behind (fan out in X direction for vertical)
          if (cardIndexInStack > 0) {
            position[1] += cardIndexInStack * 0.02;
            position[0] += cardIndexInStack * 1.5;
          }
        } else {
          // Horizontal row: cards arranged along X axis
          const regionWidthWorld = (regionWidth / 100) * TABLE_WIDTH;
          const regionLeftWorld = ((regionLeft / 100) - 0.5) * TABLE_WIDTH;
          const availableWidth = regionWidthWorld - (2 * edgePadding);

          let cardSpacing;
          if (effectiveStackCount <= 1) {
            cardSpacing = landscapeCardWidth * 1.02;
          } else {
            cardSpacing = Math.min(availableWidth / (effectiveStackCount - 1), landscapeCardWidth * 1.02);
          }

          const startX = regionLeftWorld + edgePadding;
          const regionCenterZ = ((regionTop / 100) - 0.5) * TABLE_HEIGHT + (regionHeight / 100) * TABLE_HEIGHT * 0.5;

          const posIndex = isBeingDragged ? originalStackIndex : adjustedStackIndex;
          position = [startX + posIndex * cardSpacing, baseY, regionCenterZ];

          // Stack cards behind
          if (cardIndexInStack > 0) {
            position[1] += cardIndexInStack * 0.02;
            position[2] += cardIndexInStack * 1.5;
          }
        }
      } else if (region.type === 'pile') {
        // Pile regions: all cards at same position, stacked
        const regionLeft = parsePercent(region.left);
        const regionTop = parsePercent(region.top);
        const regionWidth = parsePercent(region.width);
        const regionHeight = parsePercent(region.height);

        // Center of the region
        const centerX = ((regionLeft + regionWidth / 2) / 100 - 0.5) * TABLE_WIDTH;
        const centerZ = ((regionTop + regionHeight / 2) / 100 - 0.5) * TABLE_HEIGHT;

        position = [centerX, baseY + cardIndexInStack * 0.02, centerZ + cardIndexInStack * 0.05];
      } else if (region.type === 'fan') {
        // Fan regions: cards arranged in a spread (typically portrait orientation)
        const regionLeft = parsePercent(region.left);
        const regionTop = parsePercent(region.top);
        const regionWidth = parsePercent(region.width);
        const regionHeight = parsePercent(region.height);
        const isVertical = region.direction === 'vertical';

        // Card dimensions - fan cards are typically portrait
        const CARD_WIDTH = 6;
        const CARD_HEIGHT = 8.4;
        const portraitCardWidth = CARD_WIDTH;

        // Padding from edges - more than half card width for visual appeal
        const edgePadding = portraitCardWidth * 0.8;

        // Calculate effective stack count for spacing
        // Base count excludes the dragged card if this is source group (or has pending drop from here)
        // Add 1 if making room for an incoming card
        const baseStackCount = isEffectiveSourceGroup ? nonDraggedStackCount : group.stackIds.length;
        const effectiveStackCount = shouldMakeRoom ? baseStackCount + 1 : baseStackCount;

        if (isVertical) {
          // Vertical fan: cards arranged along Z axis
          const regionHeightWorld = (regionHeight / 100) * TABLE_HEIGHT;
          const regionTopWorld = ((regionTop / 100) - 0.5) * TABLE_HEIGHT;
          const availableHeight = regionHeightWorld - (2 * edgePadding);

          let cardSpacing;
          if (effectiveStackCount <= 1) {
            cardSpacing = 0;
          } else {
            cardSpacing = availableHeight / (effectiveStackCount - 1);
            const maxSpacing = portraitCardWidth * 0.7;
            cardSpacing = Math.min(cardSpacing, maxSpacing);
          }

          const startZ = regionTopWorld + edgePadding;
          const regionCenterX = ((regionLeft / 100) - 0.5) * TABLE_WIDTH + (regionWidth / 100) * TABLE_WIDTH * 0.5;

          const posIndex = isBeingDragged ? originalStackIndex : adjustedStackIndex;
          position = [regionCenterX, baseY, startZ + posIndex * cardSpacing];

          // Stack cards behind (fan out in X direction for vertical)
          if (cardIndexInStack > 0) {
            position[1] += cardIndexInStack * 0.02;
            position[0] += cardIndexInStack * 1.5;
          }
        } else {
          // Horizontal fan: cards arranged along X axis
          const regionWidthWorld = (regionWidth / 100) * TABLE_WIDTH;
          const regionLeftWorld = ((regionLeft / 100) - 0.5) * TABLE_WIDTH;
          const availableWidth = regionWidthWorld - (2 * edgePadding);

          let cardSpacing;
          if (effectiveStackCount <= 1) {
            cardSpacing = 0;
          } else {
            cardSpacing = availableWidth / (effectiveStackCount - 1);
            const maxSpacing = portraitCardWidth * 0.7;
            cardSpacing = Math.min(cardSpacing, maxSpacing);
          }

          const startX = regionLeftWorld + edgePadding;
          const regionCenterZ = ((regionTop / 100) - 0.5) * TABLE_HEIGHT + (regionHeight / 100) * TABLE_HEIGHT * 0.5;

          const posIndex = isBeingDragged ? originalStackIndex : adjustedStackIndex;
          position = [startX + posIndex * cardSpacing, baseY, regionCenterZ];

          if (cardIndexInStack > 0) {
            position[1] += cardIndexInStack * 0.02;
            position[2] += cardIndexInStack * 1.5;
          }
        }
      } else {
        // Default: use region position
        position = percentToWorld(parsePercent(region.left), parsePercent(region.top), baseY);
      }

      cards.push(
        <R3FCardFromRedux
          key={cardId}
          cardId={cardId}
          stackId={stackId}
          groupId={groupId}
          region={region}
          position={position}
          zIndex={globalCardIndex}
        />
      );
      globalCardIndex++;
    });
  });

  return <>{cards}</>;
};

/**
 * Region boundaries component
 */
const R3FRegionBoundaries = ({ regions, hoveredRegionId }) => {
  const groupById = useSelector(state => state?.gameUi?.game?.groupById);

  return (
    <>
      {Object.entries(regions).map(([regionId, region]) => {
        if (region.visible === false) return null;

        // Get stack count for this region's group (groupId is already formatted)
        const group = groupById?.[region.groupId];
        const stackCount = group?.stackIds?.length || 0;

        return (
          <RegionBoundary
            key={`boundary-${regionId}`}
            region={region}
            isHovered={regionId === hoveredRegionId}
            showLabel={true}
            stackCount={stackCount}
          />
        );
      })}
    </>
  );
};

/**
 * Main scene that renders all regions from layout
 */
export const R3FSceneFromRedux = ({ showRegionBoundaries = true, onCardDrop }) => {
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const formatGroupId = useFormatGroupId();

  // Drag state for Trello-style reordering
  const [draggedStack, setDraggedStack] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);
  const [hoveredGroupId, setHoveredGroupId] = useState(null);
  // Track pending drop to keep card at drop position until Redux updates
  const [pendingDrop, setPendingDrop] = useState(null);
  // Track last known pointer world position for hover detection after drop
  const lastPointerPositionRef = useRef(null);

  const clearDraggedStack = useCallback(() => {
    setDraggedStack(null);
    setDragPosition(null);
    setHoveredGroupId(null);
  }, []);

  const setPendingDropState = useCallback((dropInfo) => {
    setPendingDrop(dropInfo);
  }, []);

  const clearPendingDrop = useCallback(() => {
    setPendingDrop(null);
  }, []);

  const updatePointerPosition = useCallback((position) => {
    lastPointerPositionRef.current = position;
  }, []);

  const getPointerPosition = useCallback(() => {
    return lastPointerPositionRef.current;
  }, []);

  const layout = useSelector(state => {
    const observingPlayerN = state?.playerUi?.observingPlayerN;
    return observingPlayerN
      ? state?.gameUi?.game?.playerData?.[observingPlayerN]?.layout
      : state?.gameUi?.game?.layout;
  });

  // Format regions with proper groupIds (replacing playerN placeholders)
  const formattedRegions = useMemo(() => {
    if (!layout?.regions) return null;

    const result = {};
    for (const [regionId, region] of Object.entries(layout.regions)) {
      const formattedGroupId = region.groupId ? formatGroupId(region.groupId) : null;
      result[regionId] = {
        ...region,
        id: regionId,
        groupId: formattedGroupId,
      };
    }
    return result;
  }, [layout?.regions, formatGroupId]);

  // Get game state for stack counts
  const groupById = useSelector(state => state?.gameUi?.game?.groupById);

  // Function to find which region a point is in
  const findRegionAtPoint = useCallback((x, z) => {
    if (!formattedRegions) return null;

    for (const [regionId, region] of Object.entries(formattedRegions)) {
      if (region.visible === false) continue;
      if (isPointInRegion(x, z, region)) {
        return { regionId, region };
      }
    }
    return null;
  }, [formattedRegions]);

  // Function to calculate insertion index for drop position
  const getInsertionIndex = useCallback((dropX, targetRegion, sourceGroupId, dropZ = 0) => {
    if (!targetRegion || (targetRegion.type !== 'row' && targetRegion.type !== 'fan')) {
      return null;
    }

    const targetGroup = groupById?.[targetRegion.groupId];
    if (!targetGroup) return null;

    // Calculate stack count - exclude dragged card if same group
    let stackCount = targetGroup.stackIds?.length || 0;
    if (sourceGroupId === targetRegion.groupId && draggedStack) {
      stackCount = Math.max(0, stackCount - 1);
    }

    return calculateInsertionIndex(dropX, targetRegion, stackCount, targetRegion.type, dropZ);
  }, [groupById, draggedStack]);

  // Create drop context value - memoized to prevent unnecessary re-renders
  const dropContextValue = useMemo(() => ({
    findRegionAtPoint,
    onCardDrop,
    hoveredRegionId,
    setHoveredRegionId,
    getInsertionIndex,
  }), [findRegionAtPoint, onCardDrop, hoveredRegionId, getInsertionIndex]);

  // Create drag state context value for Trello-style reordering
  const dragStateContextValue = useMemo(() => ({
    draggedStack,
    dragPosition,
    hoveredGroupId,
    pendingDrop,
    setDraggedStack,
    setDragPosition,
    setHoveredGroupId,
    clearDraggedStack,
    setPendingDropState,
    clearPendingDrop,
    updatePointerPosition,
    getPointerPosition,
  }), [draggedStack, dragPosition, hoveredGroupId, pendingDrop, clearDraggedStack, setPendingDropState, clearPendingDrop, updatePointerPosition, getPointerPosition]);

  if (!formattedRegions) {
    return <TableSurface />;
  }

  return (
    <DragStateContext.Provider value={dragStateContextValue}>
      <DropContext.Provider value={dropContextValue}>
        <TableSurface />

        {/* Region boundaries */}
        {showRegionBoundaries && (
          <R3FRegionBoundaries
            regions={formattedRegions}
            hoveredRegionId={hoveredRegionId}
          />
        )}

        {/* Cards in regions */}
        {Object.entries(formattedRegions).map(([regionId, region]) => {
          if (region.visible === false) return null;
          return (
            <R3FGroupCards
              key={regionId}
              groupId={region.groupId}
              region={region}
            />
          );
        })}
      </DropContext.Provider>
    </DragStateContext.Provider>
  );
};

export default R3FSceneFromRedux;
