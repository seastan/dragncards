/**
 * R3FScene - Main scene component connected to Redux store
 * Renders stacks based on the game state (stack-based dragging)
 */

import React, { useState, useCallback, useEffect, createContext, useContext, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { TableSurface } from './R3FTable';
import { R3FStack } from './R3FStack';
import { RegionBoundary, isPointInRegion } from '../R3FDragSystem';
import { useFormatGroupId } from '../../engine/hooks/useFormatGroupId';
import { TABLE_WIDTH, TABLE_HEIGHT } from '../utils/cameraUtils';
import { parsePercent, percentToWorld, regionToWorld, calculateInsertionIndex } from '../utils/regionUtils';
import { getStackBounds } from '../utils/attachmentUtils';

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
  const cardById = useSelector(state => state?.gameUi?.game?.cardById);
  const layout = useSelector(state => state?.gameUi?.game?.layout);
  const cardSize = layout?.cardSize || 6;
  const dragStateContext = useDragStateContext();

  // Get drag state for Trello-style reordering
  const draggedStack = dragStateContext?.draggedStack;
  const dragPosition = dragStateContext?.dragPosition;
  const hoveredGroupId = dragStateContext?.hoveredGroupId;
  const pendingDrop = dragStateContext?.pendingDrop;

  const pendingDropIsExternal = pendingDrop && pendingDrop.sourceGroupId !== pendingDrop.targetGroupId;
  const hasPendingDropToThisGroup = pendingDrop?.targetGroupId === groupId;
  const droppedStackExists = pendingDrop?.stackId && stackById?.[pendingDrop.stackId];
  const crossRegionDropComplete = hasPendingDropToThisGroup &&
    pendingDropIsExternal &&
    (group?.stackIds?.includes(pendingDrop?.stackId) || !droppedStackExists);

  // Clear pendingDrop when the dropped stack was split (e.g., multi-card stack into a fan)
  useEffect(() => {
    if (crossRegionDropComplete && !droppedStackExists && dragStateContext?.clearPendingDrop) {
      dragStateContext.clearPendingDrop();
    }
  }, [crossRegionDropComplete, droppedStackExists, dragStateContext]);

  if (!group || !group.stackIds) return null;

  const isSourceGroup = draggedStack?.sourceGroupId === groupId;
  const isHoveredGroup = hoveredGroupId === groupId && draggedStack;
  const isExternalTarget = isHoveredGroup && !isSourceGroup;
  const isInternalReorder = isHoveredGroup && isSourceGroup;

  const hasPendingDropFromThisGroup = pendingDrop?.sourceGroupId === groupId;
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

  const shouldMakeRoom = !crossRegionDropComplete && (
    isExternalTarget || isInternalReorder ||
    (hasPendingDropToThisGroup && pendingDropIsExternal) ||
    (hasPendingDropToThisGroup && pendingDropIsInternal)
  );

  // Pre-compute per-stack bounds for row/fan spacing
  // Build an ordered list of visible stack widths/heights (excluding dragged stack)
  // to compute cumulative positions. This ensures stacks with attachments take more
  // room while single-card stacks stay compact.
  const BASE_CARD_WIDTH = 7.14;
  const BASE_CARD_HEIGHT = 10;
  const STACK_GAP = 0.5; // Small gap between stacks in world units

  // Build layout slots: each visible (non-dragged) stack gets a slot based on its actual bounds.
  // If shouldMakeRoom, an extra slot is inserted at insertionIndex for the incoming card.
  const layoutSlots = []; // { stackId, width, height, isGap }
  const stackBoundsMap = {};
  group.stackIds.forEach((sid) => {
    const s = stackById?.[sid];
    if (s) {
      stackBoundsMap[sid] = getStackBounds(s, cardById, BASE_CARD_WIDTH, BASE_CARD_HEIGHT);
    }
  });

  // Build the ordered slots (excluding dragged stack)
  let slotIndex = 0;
  group.stackIds.forEach((sid) => {
    const s = stackById?.[sid];
    if (!s || !s.cardIds) return;
    const isDragged = isEffectiveSourceGroup && sid === activeStackId;
    if (isDragged) return;

    // Insert gap slot for incoming card
    if (shouldMakeRoom && insertionIndex >= 0 && slotIndex === insertionIndex) {
      layoutSlots.push({ stackId: '__gap__', width: BASE_CARD_WIDTH, height: BASE_CARD_HEIGHT, parentOffsetX: 0, parentOffsetZ: 0, isGap: true });
    }

    const bounds = stackBoundsMap[sid] || { width: BASE_CARD_WIDTH, height: BASE_CARD_HEIGHT, parentOffsetX: 0, parentOffsetZ: 0 };
    layoutSlots.push({ stackId: sid, width: bounds.width, height: bounds.height, parentOffsetX: bounds.parentOffsetX || 0, parentOffsetZ: bounds.parentOffsetZ || 0, isGap: false });
    slotIndex++;
  });
  // Gap at end
  if (shouldMakeRoom && insertionIndex >= 0 && insertionIndex >= slotIndex) {
    layoutSlots.push({ stackId: '__gap__', width: BASE_CARD_WIDTH, height: BASE_CARD_HEIGHT, parentOffsetX: 0, parentOffsetZ: 0, isGap: true });
  }

  // Compute cumulative positions for each slot.
  // Gaps between stacks expand to fill the available region width (up to a max),
  // so stacks spread across the region rather than clustering in the center.
  const computeCumulativePositions = (slots, isVerticalLayout, availableSpace) => {
    const sizeKey = isVerticalLayout ? 'height' : 'width';
    const offsetKey = isVerticalLayout ? 'parentOffsetZ' : 'parentOffsetX';
    const totalContentSize = slots.reduce((sum, s) => sum + s[sizeKey], 0);
    const numGaps = Math.max(0, slots.length - 1);

    // Dynamic gap: expand to fill available space, capped at a max
    const MAX_GAP = BASE_CARD_WIDTH * 0.4; // ~4.3 world units max between stacks
    let gap;
    if (numGaps === 0) {
      gap = 0;
    } else {
      gap = Math.max(STACK_GAP, Math.min((availableSpace - totalContentSize) / numGaps, MAX_GAP));
    }

    const totalSpan = totalContentSize + numGaps * gap;
    let cursor = 0;
    const centers = {};
    slots.forEach((slot, i) => {
      const bboxCenter = cursor + slot[sizeKey] / 2;
      const parentPos = bboxCenter + (slot[offsetKey] || 0);
      if (!slot.isGap) {
        centers[slot.stackId] = parentPos;
      }
      cursor += slot[sizeKey] + gap;
    });
    return { centers, totalSpan };
  };

  const stacks = [];
  let globalCardIndex = 0;

  group.stackIds.forEach((stackId, stackIndex) => {
    const stack = stackById?.[stackId];
    if (!stack || !stack.cardIds) return;

    const isBeingDragged = isEffectiveSourceGroup && stackId === activeStackId;

    // Calculate parent card position (index 0) — only need one position per stack
    let stackPosition;
    const baseY = 0.1 + globalCardIndex * 0.02;

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

      const { centers, totalSpan } = computeCumulativePositions(layoutSlots, isVertical);

      if (isVertical) {
        const regionHeightWorld = (regionHeight / 100) * TABLE_HEIGHT;
        const regionTopWorld = ((regionTop / 100) - 0.5) * TABLE_HEIGHT;
        const regionCenterX = ((regionLeft / 100) - 0.5) * TABLE_WIDTH + (regionWidth / 100) * TABLE_WIDTH * 0.5;

        const { centers, totalSpan } = computeCumulativePositions(layoutSlots, true, regionHeightWorld);
        const scaleFactor = totalSpan > regionHeightWorld ? regionHeightWorld / totalSpan : 1;
        // Left-align (top-align for vertical): start from region top edge
        const groupOffset = regionTopWorld;

        if (isBeingDragged) {
          const draggedBounds = stackBoundsMap[stackId] || { height: BASE_CARD_HEIGHT };
          stackPosition = [regionCenterX, baseY, groupOffset + draggedBounds.height / 2];
        } else {
          const centerPos = centers[stackId] ?? 0;
          stackPosition = [regionCenterX, baseY, groupOffset + centerPos * scaleFactor];
        }
      } else {
        const regionWidthWorld = (regionWidth / 100) * TABLE_WIDTH;
        const regionLeftWorld = ((regionLeft / 100) - 0.5) * TABLE_WIDTH;

        const { centers, totalSpan } = computeCumulativePositions(layoutSlots, false, regionWidthWorld);
        const scaleFactor = totalSpan > regionWidthWorld ? regionWidthWorld / totalSpan : 1;
        // Left-align: start from region left edge
        const groupOffset = regionLeftWorld;
        const regionCenterZ = ((regionTop / 100) - 0.5) * TABLE_HEIGHT + (regionHeight / 100) * TABLE_HEIGHT * 0.5;

        if (isBeingDragged) {
          const draggedBounds = stackBoundsMap[stackId] || { width: BASE_CARD_WIDTH };
          stackPosition = [groupOffset + draggedBounds.width / 2, baseY, regionCenterZ];
        } else {
          const centerPos = centers[stackId] ?? 0;
          stackPosition = [groupOffset + centerPos * scaleFactor, baseY, regionCenterZ];
        }
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

      // Fans use uniform spacing based on base card width (attachments rare in fans)
      const portraitCardWidth = 6;
      const edgePadding = portraitCardWidth * 0.8;

      const baseStackCount = isEffectiveSourceGroup ? nonDraggedStackCount : group.stackIds.length;
      const effectiveStackCount = shouldMakeRoom ? baseStackCount + 1 : baseStackCount;

      // For fans, need positionIndex-based layout
      // Recompute positionIndex for this stack
      let fanPosIndex = 0;
      let fanAdjustedIndex = 0;
      for (let i = 0; i < group.stackIds.length; i++) {
        const sid = group.stackIds[i];
        if (sid === stackId) {
          fanAdjustedIndex = isBeingDragged ? draggedStackIndex : fanPosIndex;
          if (!isBeingDragged && shouldMakeRoom && insertionIndex >= 0 && fanPosIndex >= insertionIndex) {
            fanAdjustedIndex = fanPosIndex + 1;
          }
          break;
        }
        const isDragged = isEffectiveSourceGroup && sid === activeStackId;
        if (!isDragged) {
          fanPosIndex++;
        }
      }

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

        stackPosition = [regionCenterX, baseY, startZ + fanAdjustedIndex * cardSpacing];
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

        stackPosition = [startX + fanAdjustedIndex * cardSpacing, baseY, regionCenterZ];
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
