/**
 * R3FScene - Main scene component connected to Redux store
 * Renders stacks based on the game state (stack-based dragging)
 */

import React, { useState, useCallback, createContext, useContext, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { TableSurface } from './R3FTable';
import { R3FStack } from './R3FStack';
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
 * Renders all stacks from a specific group
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

  const isSourceGroup = draggedStack?.sourceGroupId === groupId;
  const isHoveredGroup = hoveredGroupId === groupId && draggedStack;
  const isExternalTarget = isHoveredGroup && !isSourceGroup;
  const isInternalReorder = isHoveredGroup && isSourceGroup;

  const hasPendingDropToThisGroup = pendingDrop?.targetGroupId === groupId;
  const hasPendingDropFromThisGroup = pendingDrop?.sourceGroupId === groupId;
  const pendingDropIsExternal = pendingDrop && pendingDrop.sourceGroupId !== pendingDrop.targetGroupId;
  const pendingDropIsInternal = pendingDrop && pendingDrop.sourceGroupId === pendingDrop.targetGroupId;

  const activeStackId = draggedStack?.stackId || pendingDrop?.stackId;
  const isEffectiveSourceGroup = isSourceGroup || hasPendingDropFromThisGroup;

  const draggedStackIndex = isEffectiveSourceGroup
    ? group.stackIds.indexOf(activeStackId)
    : -1;

  const nonDraggedStackCount = isEffectiveSourceGroup
    ? group.stackIds.length - 1
    : group.stackIds.length;

  let insertionIndex = -1;
  if (isHoveredGroup && dragPosition && (region.type === 'row' || region.type === 'fan')) {
    insertionIndex = calculateInsertionIndex(
      dragPosition[0],
      region,
      nonDraggedStackCount,
      region.type,
      dragPosition[2]
    );
  }
  if (insertionIndex === -1 && hasPendingDropToThisGroup && pendingDrop?.insertionIndex !== null) {
    insertionIndex = pendingDrop.insertionIndex;
  }

  const crossRegionDropComplete = hasPendingDropToThisGroup &&
    pendingDropIsExternal &&
    group.stackIds.includes(pendingDrop?.stackId);

  const shouldMakeRoom = !crossRegionDropComplete && (
    isExternalTarget || isInternalReorder ||
    (hasPendingDropToThisGroup && pendingDropIsExternal) ||
    (hasPendingDropToThisGroup && pendingDropIsInternal)
  );

  const stacks = [];
  let globalCardIndex = 0;
  let positionIndex = 0;

  group.stackIds.forEach((stackId, stackIndex) => {
    const stack = stackById?.[stackId];
    if (!stack || !stack.cardIds) return;

    const isBeingDragged = isEffectiveSourceGroup && stackId === activeStackId;
    let adjustedStackIndex = positionIndex;

    if (!isBeingDragged) {
      if (shouldMakeRoom && insertionIndex >= 0 && positionIndex >= insertionIndex) {
        adjustedStackIndex = positionIndex + 1;
      }
      positionIndex++;
    }

    // Calculate parent card position (index 0) — only need one position per stack
    let stackPosition;
    const baseY = 0.1 + globalCardIndex * 0.02;
    const originalStackIndex = isBeingDragged ? draggedStackIndex : adjustedStackIndex;

    if (region.type === 'free') {
      const stackLeft = stack.left || '0%';
      const stackTop = stack.top || '0%';
      stackPosition = regionToWorld(region, stackLeft, stackTop, baseY);
    } else if (region.type === 'row') {
      const regionLeft = parsePercent(region.left);
      const regionTop = parsePercent(region.top);
      const regionWidth = parsePercent(region.width);
      const regionHeight = parsePercent(region.height);
      const isVertical = region.direction === 'vertical';

      const CARD_HEIGHT = 8.4;
      const landscapeCardWidth = CARD_HEIGHT;

      const baseStackCount = isEffectiveSourceGroup ? nonDraggedStackCount : group.stackIds.length;
      const effectiveStackCount = shouldMakeRoom ? baseStackCount + 1 : baseStackCount;

      const edgePadding = landscapeCardWidth * 0.5;

      if (isVertical) {
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

        stackPosition = [regionCenterX, baseY, startZ + originalStackIndex * cardSpacing];
      } else {
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

        stackPosition = [startX + originalStackIndex * cardSpacing, baseY, regionCenterZ];
      }
    } else if (region.type === 'pile') {
      const regionLeft = parsePercent(region.left);
      const regionTop = parsePercent(region.top);
      const regionWidth = parsePercent(region.width);
      const regionHeight = parsePercent(region.height);

      const centerX = ((regionLeft + regionWidth / 2) / 100 - 0.5) * TABLE_WIDTH;
      const centerZ = ((regionTop + regionHeight / 2) / 100 - 0.5) * TABLE_HEIGHT;

      stackPosition = [centerX, baseY, centerZ];
    } else if (region.type === 'fan') {
      const regionLeft = parsePercent(region.left);
      const regionTop = parsePercent(region.top);
      const regionWidth = parsePercent(region.width);
      const regionHeight = parsePercent(region.height);
      const isVertical = region.direction === 'vertical';

      const CARD_WIDTH = 6;
      const portraitCardWidth = CARD_WIDTH;
      const edgePadding = portraitCardWidth * 0.8;

      const baseStackCount = isEffectiveSourceGroup ? nonDraggedStackCount : group.stackIds.length;
      const effectiveStackCount = shouldMakeRoom ? baseStackCount + 1 : baseStackCount;

      if (isVertical) {
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

        stackPosition = [regionCenterX, baseY, startZ + originalStackIndex * cardSpacing];
      } else {
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

        stackPosition = [startX + originalStackIndex * cardSpacing, baseY, regionCenterZ];
      }
    } else {
      stackPosition = percentToWorld(parsePercent(region.left), parsePercent(region.top), baseY);
    }

    stacks.push(
      <R3FStack
        key={stackId}
        stackId={stackId}
        groupId={groupId}
        region={region}
        position={stackPosition}
        baseZIndex={globalCardIndex}
        isBeingDragged={isBeingDragged}
      />
    );

    // Advance globalCardIndex by the number of cards in this stack
    globalCardIndex += stack.cardIds.length;
  });

  return <>{stacks}</>;
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
  const [pendingDrop, setPendingDrop] = useState(null);
  const lastPointerPositionRef = useRef(null);

  // Attachment hover state
  const [hoverOverStackId, setHoverOverStackId] = useState(null);
  const [hoverOverDirection, setHoverOverDirection] = useState(null);
  const [hoverOverAttachmentAllowed, setHoverOverAttachmentAllowed] = useState(true);

  // Stack position registry for attachment zone detection
  const stackPositionsRef = useRef(new Map());

  const registerStackPosition = useCallback((stackId, posData) => {
    stackPositionsRef.current.set(stackId, posData);
  }, []);

  const unregisterStackPosition = useCallback((stackId) => {
    stackPositionsRef.current.delete(stackId);
  }, []);

  const getStackPositionsForGroup = useCallback((groupId, excludeStackId) => {
    const result = [];
    for (const [sId, data] of stackPositionsRef.current) {
      if (data.groupId === groupId && sId !== excludeStackId) {
        result.push({ stackId: sId, ...data });
      }
    }
    return result;
  }, []);

  const clearDraggedStack = useCallback(() => {
    setDraggedStack(null);
    setDragPosition(null);
    setHoveredGroupId(null);
    setHoverOverStackId(null);
    setHoverOverDirection(null);
    setHoverOverAttachmentAllowed(true);
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

  const groupById = useSelector(state => state?.gameUi?.game?.groupById);

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

  const getInsertionIndex = useCallback((dropX, targetRegion, sourceGroupId, dropZ = 0) => {
    if (!targetRegion || (targetRegion.type !== 'row' && targetRegion.type !== 'fan')) {
      return null;
    }

    const targetGroup = groupById?.[targetRegion.groupId];
    if (!targetGroup) return null;

    let stackCount = targetGroup.stackIds?.length || 0;
    if (sourceGroupId === targetRegion.groupId && draggedStack) {
      stackCount = Math.max(0, stackCount - 1);
    }

    return calculateInsertionIndex(dropX, targetRegion, stackCount, targetRegion.type, dropZ);
  }, [groupById, draggedStack]);

  const dropContextValue = useMemo(() => ({
    findRegionAtPoint,
    onCardDrop,
    hoveredRegionId,
    setHoveredRegionId,
    getInsertionIndex,
  }), [findRegionAtPoint, onCardDrop, hoveredRegionId, getInsertionIndex]);

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
    hoverOverStackId,
    hoverOverDirection,
    hoverOverAttachmentAllowed,
    setHoverOverStackId,
    setHoverOverDirection,
    setHoverOverAttachmentAllowed,
    registerStackPosition,
    unregisterStackPosition,
    getStackPositionsForGroup,
  }), [draggedStack, dragPosition, hoveredGroupId, pendingDrop, clearDraggedStack, setPendingDropState, clearPendingDrop, updatePointerPosition, getPointerPosition, hoverOverStackId, hoverOverDirection, hoverOverAttachmentAllowed, registerStackPosition, unregisterStackPosition, getStackPositionsForGroup]);

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

        {/* Stacks in regions */}
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
