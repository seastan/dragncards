/**
 * R3FScene - Main scene component connected to Redux store
 * Renders stacks based on the game state (stack-based dragging)
 */

import React, { useState, useCallback, useEffect, createContext, useContext, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TableSurface } from './R3FTable';
import { R3FStack } from './R3FStack';
import { RegionBoundary, isPointInRegion } from '../R3FDragSystem';
import { useFormatGroupId } from '../../engine/hooks/useFormatGroupId';
import { useTableDimensions } from '../contexts/TableDimensionsContext';
import { parsePercent, percentToWorld, regionToWorld, calculateInsertionIndex } from '../utils/regionUtils';
import { getStackBounds } from '../utils/attachmentUtils';
import { useBrowseRegion } from '../../engine/Browse';
import { Html } from '@react-three/drei';
import { R3FGroupOverlay } from './R3FGroupOverlay';

// Context to share drag-drop functionality with cards
const DropContext = createContext(null);
export const useDropContext = () => useContext(DropContext);

// Context to share drag state for Trello-style reordering
const DragStateContext = createContext(null);
export const useDragStateContext = () => useContext(DragStateContext);

/**
 * Renders all stacks from a specific group
 */
const R3FGroupCards = ({ groupId, region, selectedStackIndices }) => {
  const { tableWidth, tableHeight } = useTableDimensions();
  const group = useSelector(state => state?.gameUi?.game?.groupById?.[groupId]);
  const stackById = useSelector(state => state?.gameUi?.game?.stackById);
  const cardById = useSelector(state => state?.gameUi?.game?.cardById);
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
  const BASE_CARD_SIZE = 10;
  const STACK_GAP = 0.5; // Small gap between stacks in world units

  // Helper: compute rendered card dimensions for a given stack's top card.
  // Mirrors the same aspect-ratio logic used in R3FCardFromRedux / R3FStack.
  const getStackCardDims = (sid) => {
    const s = stackById?.[sid];
    const card = cardById?.[s?.cardIds?.[0]];
    const sideData = card?.sides?.[card?.currentSide];
    const rawW = sideData?.width;
    const rawH = sideData?.height;
    const aspect = rawW && rawH ? rawW / rawH : 0.714;
    const landscape = aspect > 1;
    return {
      cardWidth:  landscape ? BASE_CARD_SIZE : BASE_CARD_SIZE * aspect,
      cardHeight: landscape ? BASE_CARD_SIZE / aspect : BASE_CARD_SIZE,
    };
  };

  // Build layout slots: each visible (non-dragged) stack gets a slot based on its actual bounds.
  // If shouldMakeRoom, an extra slot is inserted at insertionIndex for the incoming card.
  const layoutSlots = []; // { stackId, width, height, isGap }
  const stackBoundsMap = {};
  group.stackIds.forEach((sid) => {
    const s = stackById?.[sid];
    if (s) {
      const { cardWidth, cardHeight } = getStackCardDims(sid);
      stackBoundsMap[sid] = getStackBounds(s, cardById, cardWidth, cardHeight);
    }
  });

  // Gap slot uses the dimensions of the card being dragged in
  const gapDims = activeStackId
    ? getStackCardDims(activeStackId)
    : { cardWidth: BASE_CARD_SIZE * 0.714, cardHeight: BASE_CARD_SIZE };

  // Build the ordered slots (excluding dragged stack)
  let slotIndex = 0;
  group.stackIds.forEach((sid) => {
    const s = stackById?.[sid];
    if (!s || !s.cardIds) return;
    const isDragged = isEffectiveSourceGroup && sid === activeStackId;
    if (isDragged) return;

    // Insert gap slot for incoming card
    if (shouldMakeRoom && insertionIndex >= 0 && slotIndex === insertionIndex) {
      layoutSlots.push({ stackId: '__gap__', width: gapDims.cardWidth, height: gapDims.cardHeight, parentOffsetX: 0, parentOffsetZ: 0, isGap: true });
    }

    const bounds = stackBoundsMap[sid] || { width: gapDims.cardWidth, height: gapDims.cardHeight, parentOffsetX: 0, parentOffsetZ: 0 };
    layoutSlots.push({ stackId: sid, width: bounds.width, height: bounds.height, parentOffsetX: bounds.parentOffsetX || 0, parentOffsetZ: bounds.parentOffsetZ || 0, isGap: false });
    slotIndex++;
  });
  // Gap at end
  if (shouldMakeRoom && insertionIndex >= 0 && insertionIndex >= slotIndex) {
    layoutSlots.push({ stackId: '__gap__', width: gapDims.cardWidth, height: gapDims.cardHeight, parentOffsetX: 0, parentOffsetZ: 0, isGap: true });
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
    const MAX_GAP = 3.0; // world units max between stacks
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

  const isPileGroup = region.type === 'pile';
  const isDraggingTopStack = isPileGroup && isEffectiveSourceGroup && activeStackId === group.stackIds[0];

  group.stackIds.forEach((stackId, stackIndex) => {
    if (selectedStackIndices && !selectedStackIndices.includes(stackIndex)) return;

    // For piles, only render the top stack. When the top stack is being dragged,
    // also show the second stack as a non-interactive peek.
    if (isPileGroup && stackIndex > 0) {
      if (stackIndex > 1 || !isDraggingTopStack) return;
    }

    const stack = stackById?.[stackId];
    if (!stack || !stack.cardIds) return;

    const isBeingDragged = isEffectiveSourceGroup && stackId === activeStackId;

    // Calculate parent card position (index 0) — only need one position per stack
    let stackPosition;
    const layerOffset = (region.layerIndex || 0) * 0.5;
    const baseY = 0.1 + globalCardIndex * 0.02 + layerOffset;

    if (region.type === 'free') {
      const stackLeft = stack.left || '0%';
      const stackTop = stack.top || '0%';
      stackPosition = regionToWorld(region, stackLeft, stackTop, baseY, tableWidth, tableHeight);
    } else if (region.type === 'row') {
      const regionLeft = parsePercent(region.left);
      const regionTop = parsePercent(region.top);
      const regionWidth = parsePercent(region.width);
      const regionHeight = parsePercent(region.height);
      const isVertical = region.direction === 'vertical';


      if (isVertical) {
        const regionHeightWorld = (regionHeight / 100) * tableHeight;
        const regionTopWorld = ((regionTop / 100) - 0.5) * tableHeight;
        const regionCenterX = ((regionLeft / 100) - 0.5) * tableWidth + (regionWidth / 100) * tableWidth * 0.5;

        const { centers, totalSpan } = computeCumulativePositions(layoutSlots, true, regionHeightWorld);
        const scaleFactor = totalSpan > regionHeightWorld ? regionHeightWorld / totalSpan : 1;
        // Left-align (top-align for vertical): start from region top edge
        const groupOffset = regionTopWorld;

        if (isBeingDragged) {
          const draggedBounds = stackBoundsMap[stackId] || { height: getStackCardDims(stackId).cardHeight };
          stackPosition = [regionCenterX, baseY, groupOffset + draggedBounds.height / 2];
        } else {
          const centerPos = centers[stackId] ?? 0;
          stackPosition = [regionCenterX, baseY, groupOffset + centerPos * scaleFactor];
        }
      } else {
        const regionWidthWorld = (regionWidth / 100) * tableWidth;
        const regionLeftWorld = ((regionLeft / 100) - 0.5) * tableWidth;

        const { centers, totalSpan } = computeCumulativePositions(layoutSlots, false, regionWidthWorld);
        const scaleFactor = totalSpan > regionWidthWorld ? regionWidthWorld / totalSpan : 1;
        // Left-align: start from region left edge
        const groupOffset = regionLeftWorld;
        const regionCenterZ = ((regionTop / 100) - 0.5) * tableHeight + (regionHeight / 100) * tableHeight * 0.5;

        if (isBeingDragged) {
          const draggedBounds = stackBoundsMap[stackId] || { width: getStackCardDims(stackId).cardWidth };
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

      const centerX = ((regionLeft + regionWidth / 2) / 100 - 0.5) * tableWidth;
      const centerZ = ((regionTop + regionHeight / 2) / 100 - 0.5) * tableHeight;

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
        const regionHeightWorld = (regionHeight / 100) * tableHeight;
        const regionTopWorld = ((regionTop / 100) - 0.5) * tableHeight;
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
        const regionCenterX = ((regionLeft / 100) - 0.5) * tableWidth + (regionWidth / 100) * tableWidth * 0.5;

        stackPosition = [regionCenterX, baseY, startZ + fanAdjustedIndex * cardSpacing];
      } else {
        const regionWidthWorld = (regionWidth / 100) * tableWidth;
        const regionLeftWorld = ((regionLeft / 100) - 0.5) * tableWidth;
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
        const regionCenterZ = ((regionTop / 100) - 0.5) * tableHeight + (regionHeight / 100) * tableHeight * 0.5;

        stackPosition = [startX + fanAdjustedIndex * cardSpacing, baseY, regionCenterZ];
      }
    } else {
      stackPosition = percentToWorld(parsePercent(region.left), parsePercent(region.top), baseY, tableWidth, tableHeight);
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
        stackIndex={stackIndex}
        isNonInteractive={isPileGroup && stackIndex === 1}
      />
    );

    // Advance globalCardIndex by the number of cards in this stack
    globalCardIndex += stack.cardIds.length;
  });

  // "(Top)" label for the browse region's horizontal fan
  let topLabel = null;
  if (region.id === 'browse' && region.type === 'fan' && region.direction !== 'vertical') {
    const regionLeft = parsePercent(region.left);
    const regionTop = parsePercent(region.top);
    const regionHeight = parsePercent(region.height);
    const portraitCardWidth = 6;
    const edgePadding = portraitCardWidth * 0.8;
    const startX = ((regionLeft / 100) - 0.5) * tableWidth + edgePadding;
    const regionCenterZ = ((regionTop / 100) - 0.5) * tableHeight + (regionHeight / 100) * tableHeight * 0.5;
    const layerOffset = (region.layerIndex || 0) * 0.5;
    topLabel = (
      <group position={[startX - portraitCardWidth * 0.6, 0.1 + layerOffset + 0.05, regionCenterZ]}>
        <Html
          center
          style={{ pointerEvents: 'none' }}
          zIndexRange={[0, 0]}
        >
          <div style={{
            color: '#fff',
            fontSize: '13px',
            fontFamily: 'system-ui',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            background: 'rgba(0,0,0,0.65)',
            padding: '3px 7px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.25)',
            transform: 'rotate(-90deg)',
            userSelect: 'none',
          }}>
            Top
          </div>
        </Html>
      </group>
    );
  }

  return <>{topLabel}{stacks}</>;
};

/**
 * Tracks pointer position at the canvas DOM level (not Three.js mesh events) so
 * region hover is detected even when cards are on top of the region plane.
 * Intersects the pointer ray with the Y=0 world plane and calls findRegionAtPoint.
 */
const RegionPointerTracker = ({ findRegionAtPoint, setPointerHoveredRegionId }) => {
  const { camera, gl } = useThree();
  const findRegionRef = useRef(findRegionAtPoint);
  const leaveTimeoutRef = useRef(null);

  useEffect(() => { findRegionRef.current = findRegionAtPoint; }, [findRegionAtPoint]);

  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    const ndc = new THREE.Vector2();

    const onPointerMove = (e) => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
        const hit = findRegionRef.current(intersection.x, intersection.z);
        setPointerHoveredRegionId(hit ? hit.regionId : null);
      } else {
        setPointerHoveredRegionId(null);
      }
    };

    // Delay clearing on leave so the Html label's onMouseEnter can cancel it
    const onPointerLeave = () => {
      leaveTimeoutRef.current = setTimeout(() => {
        setPointerHoveredRegionId(null);
      }, 120);
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, [camera, gl, setPointerHoveredRegionId]);

  return null;
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
export const R3FSceneFromRedux = ({ showRegionBoundaries = true, onCardDrop, browseFilteredStackIndices }) => {
  const { tableWidth, tableHeight } = useTableDimensions();
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [pointerHoveredRegionId, setPointerHoveredRegionId] = useState(null);
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

  // Browse region support
  const browseRegion = useBrowseRegion();

  // Format regions with proper groupIds (replacing playerN placeholders)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Inject browse region when active
    if (browseRegion.groupId) {
      result['browse'] = {
        ...browseRegion,
        id: 'browse',
        groupId: formatGroupId(browseRegion.groupId),
        // Override dvh-based values with percentages suitable for 3D
        height: '30%',
        top: '35%',
        left: '5%',
        width: '90%',
      };
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout?.regions, formatGroupId, browseRegion.groupId]);

  const groupById = useSelector(state => state?.gameUi?.game?.groupById);

  const findRegionAtPoint = useCallback((x, z) => {
    if (!formattedRegions) return null;

    let best = null;
    let bestLayer = -1;
    for (const [regionId, region] of Object.entries(formattedRegions)) {
      if (region.visible === false) continue;
      if (isPointInRegion(x, z, region, tableWidth, tableHeight)) {
        const layer = region.layerIndex || 0;
        if (layer > bestLayer) {
          best = { regionId, region };
          bestLayer = layer;
        }
      }
    }
    return best;
  }, [formattedRegions, tableWidth, tableHeight]);

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

    return calculateInsertionIndex(dropX, targetRegion, stackCount, targetRegion.type, dropZ, tableWidth, tableHeight);
  }, [groupById, draggedStack, tableWidth, tableHeight]);

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

        {/* Canvas-level pointer tracker for region hover (works through cards) */}
        <RegionPointerTracker
          findRegionAtPoint={findRegionAtPoint}
          setPointerHoveredRegionId={setPointerHoveredRegionId}
        />

        {/* Region boundaries */}
        {showRegionBoundaries && (
          <R3FRegionBoundaries
            regions={formattedRegions}
            hoveredRegionId={hoveredRegionId}
          />
        )}

        {/* Group overlays (hover-to-reveal labels + eye/menu buttons) */}
        {Object.entries(formattedRegions).map(([regionId, region]) => {
          if (region.visible === false || !region.groupId) return null;
          return (
            <R3FGroupOverlay
              key={`overlay-${regionId}`}
              region={region}
              groupId={region.groupId}
              isHovered={pointerHoveredRegionId === regionId}
            />
          );
        })}

        {/* Stacks in regions */}
        {Object.entries(formattedRegions).map(([regionId, region]) => {
          if (region.visible === false) return null;
          return (
            <R3FGroupCards
              key={regionId}
              groupId={region.groupId}
              region={region}
              selectedStackIndices={regionId === 'browse' ? browseFilteredStackIndices : undefined}
            />
          );
        })}
      </DropContext.Provider>
    </DragStateContext.Provider>
  );
};

export default R3FSceneFromRedux;
