/**
 * PixiScene - Main scene for the PixiJS view.
 *
 * Renders all regions and stacks from Redux layout.
 * Mirrors R3FScene.jsx architecture: DragStateContext + DropContext.
 */

import React, {
  useState, useCallback, useMemo, createContext, useContext, useRef
} from 'react';
import { Container, Graphics } from '@pixi/react';
import { useSelector } from 'react-redux';
import { Provider } from 'react-redux';
import store from '../../../store';
import { PluginContext } from '../../../contexts/PluginContext';
import { PixiStack } from './PixiStack';
import { useFormatGroupId } from '../../engine/hooks/useFormatGroupId';
import { TableDimensionsProvider } from '../contexts/TableDimensionsContext';
import {
  parsePercent, getRegionBounds, isPointInRegion, calculateInsertionIndex,
  getBaseCardSize,
} from '../utils/regionUtils';
import { getStackBounds } from '../../engine-r3f/utils/attachmentUtils';
import { useBrowseRegion } from '../../engine/Browse';

// ---- Contexts ----
const DropContext = createContext(null);
export const useDropContext = () => useContext(DropContext);

const DragStateContext = createContext(null);
export const useDragStateContext = () => useContext(DragStateContext);

// ---- Region color map ----
const REGION_COLORS = {
  free: 0x4A90E2,
  row: 0x7ED321,
  pile: 0xF5A623,
  fan: 0xBD10E0,
  default: 0x888888,
};

/** Draws region boundary rectangle */
const RegionBoundary = ({ region, tw, th, isHovered }) => {
  const b = getRegionBounds(region, tw, th);
  const color = REGION_COLORS[region.type] || REGION_COLORS.default;
  const fillAlpha = isHovered ? 0.3 : 0.1;
  const strokeAlpha = isHovered ? 0.8 : 0.35;

  const draw = useCallback((g) => {
    g.clear();
    g.lineStyle(1.5, color, strokeAlpha);
    g.beginFill(color, fillAlpha);
    g.drawRect(b.x, b.y, b.w, b.h);
    g.endFill();
  }, [b.x, b.y, b.w, b.h, color, fillAlpha, strokeAlpha]);

  return <Graphics draw={draw} />;
};

/** Table background */
const TableBackground = ({ tw, th }) => {
  const draw = useCallback((g) => {
    g.clear();
    g.beginFill(0x1a1a2e, 1);
    g.drawRect(0, 0, tw, th);
    g.endFill();
  }, [tw, th]);
  return <Graphics draw={draw} />;
};

/**
 * Compute pixel position for a stack within its region.
 */
const computeStackPosition = (
  stack, stackId, region, group, tw, th,
  shouldMakeRoom, insertionIndex, activeStackId, isBeingDragged,
  layoutSlots, stackBoundsMap
) => {
  const BASE = getBaseCardSize(th);
  const STACK_GAP = BASE * 0.05;
  const MAX_GAP = BASE * 0.3;

  const computeCumulative = (slots, isVert, available) => {
    const sizeKey = isVert ? 'height' : 'width';
    const total = slots.reduce((s, sl) => s + sl[sizeKey], 0);
    const numGaps = Math.max(0, slots.length - 1);
    const gap = numGaps === 0 ? 0 : Math.max(STACK_GAP, Math.min((available - total) / numGaps, MAX_GAP));
    let cursor = 0;
    const centers = {};
    slots.forEach((slot) => {
      if (!slot.isGap) centers[slot.stackId] = cursor + slot[sizeKey] / 2;
      cursor += slot[sizeKey] + gap;
    });
    return { centers, totalSpan: total + numGaps * gap };
  };

  const rLeft = parsePercent(region.left);
  const rTop = parsePercent(region.top);
  const rWidth = parsePercent(region.width);
  const rHeight = parsePercent(region.height);

  if (region.type === 'free') {
    const sl = stack.left || '0%';
    const st = stack.top || '0%';
    const absLeft = rLeft + (parsePercent(sl) / 100) * rWidth;
    const absTop = rTop + (parsePercent(st) / 100) * rHeight;
    return { x: (absLeft / 100) * tw, y: (absTop / 100) * th };
  }

  if (region.type === 'pile') {
    return { x: ((rLeft + rWidth / 2) / 100) * tw, y: ((rTop + rHeight / 2) / 100) * th };
  }

  const isVert = region.direction === 'vertical';

  if (region.type === 'row') {
    if (isVert) {
      const hPx = (rHeight / 100) * th;
      const topPx = (rTop / 100) * th;
      const cx = ((rLeft + rWidth / 2) / 100) * tw;
      const { centers, totalSpan } = computeCumulative(layoutSlots, true, hPx);
      const scale = totalSpan > hPx ? hPx / totalSpan : 1;
      if (isBeingDragged) return { x: cx, y: topPx + (stackBoundsMap[stackId]?.height || BASE) / 2 };
      return { x: cx, y: topPx + (centers[stackId] ?? 0) * scale };
    } else {
      const wPx = (rWidth / 100) * tw;
      const leftPx = (rLeft / 100) * tw;
      const cy = ((rTop + rHeight / 2) / 100) * th;
      const { centers, totalSpan } = computeCumulative(layoutSlots, false, wPx);
      const scale = totalSpan > wPx ? wPx / totalSpan : 1;
      if (isBeingDragged) return { x: leftPx + (stackBoundsMap[stackId]?.width || BASE * 0.714) / 2, y: cy };
      return { x: leftPx + (centers[stackId] ?? 0) * scale, y: cy };
    }
  }

  if (region.type === 'fan') {
    const portraitW = BASE * 0.714;
    const edgePad = portraitW * 0.8;
    const nonDraggedCount = layoutSlots.filter(s => !s.isGap).length;
    const effectiveCount = shouldMakeRoom ? nonDraggedCount + 1 : nonDraggedCount;

    let fanPosIdx = 0;
    let fanAdjIdx = 0;
    for (let i = 0; i < group.stackIds.length; i++) {
      const sid = group.stackIds[i];
      if (sid === stackId) {
        fanAdjIdx = isBeingDragged ? group.stackIds.indexOf(activeStackId) : fanPosIdx;
        if (!isBeingDragged && shouldMakeRoom && insertionIndex >= 0 && fanPosIdx >= insertionIndex) fanAdjIdx = fanPosIdx + 1;
        break;
      }
      if (sid !== activeStackId) fanPosIdx++;
    }

    if (isVert) {
      const hPx = (rHeight / 100) * th;
      const topPx = (rTop / 100) * th;
      const available = hPx - 2 * edgePad;
      const spacing = effectiveCount <= 1 ? 0 : Math.min(available / (effectiveCount - 1), portraitW * 0.7);
      const cx = ((rLeft + rWidth / 2) / 100) * tw;
      return { x: cx, y: topPx + edgePad + fanAdjIdx * spacing };
    } else {
      const wPx = (rWidth / 100) * tw;
      const leftPx = (rLeft / 100) * tw;
      const available = wPx - 2 * edgePad;
      const spacing = effectiveCount <= 1 ? 0 : Math.min(available / (effectiveCount - 1), portraitW * 0.7);
      const cy = ((rTop + rHeight / 2) / 100) * th;
      return { x: leftPx + edgePad + fanAdjIdx * spacing, y: cy };
    }
  }

  return { x: (rLeft / 100) * tw, y: (rTop / 100) * th };
};

/** Renders all stacks for a group */
const PixiGroupCards = ({ groupId, region, selectedStackIndices, tw, th, tiltDeg, perspPx }) => {
  const group = useSelector(state => state?.gameUi?.game?.groupById?.[groupId]);
  const stackById = useSelector(state => state?.gameUi?.game?.stackById);
  const cardById = useSelector(state => state?.gameUi?.game?.cardById);
  const dragStateContext = useDragStateContext();

  if (!group || !group.stackIds) return null;

  const draggedStack = dragStateContext?.draggedStack;
  const dragPosition = dragStateContext?.dragPosition;
  const hoveredGroupId = dragStateContext?.hoveredGroupId;
  const pendingDrop = dragStateContext?.pendingDrop;

  const isSourceGroup = draggedStack?.sourceGroupId === groupId;
  const isHoveredGroup = hoveredGroupId === groupId && draggedStack;
  const isExternalTarget = isHoveredGroup && !isSourceGroup;
  const isInternalReorder = isHoveredGroup && isSourceGroup;
  const hasPendingDropToThisGroup = pendingDrop?.targetGroupId === groupId;
  const pendingDropIsExternal = pendingDrop && pendingDrop.sourceGroupId !== pendingDrop.targetGroupId;
  const pendingDropIsInternal = pendingDrop && pendingDrop.sourceGroupId === pendingDrop.targetGroupId;
  const hasPendingDropFromThisGroup = pendingDrop?.sourceGroupId === groupId;

  const activeStackId = draggedStack?.stackId || pendingDrop?.stackId;
  const isEffectiveSourceGroup = isSourceGroup || hasPendingDropFromThisGroup;
  const nonDraggedStackCount = isEffectiveSourceGroup ? group.stackIds.length - 1 : group.stackIds.length;

  let insertionIndex = -1;
  if (isHoveredGroup && dragPosition && (region.type === 'row' || region.type === 'fan')) {
    insertionIndex = calculateInsertionIndex(dragPosition.x, dragPosition.y, region, nonDraggedStackCount, tw, th);
  }
  if (insertionIndex === -1 && hasPendingDropToThisGroup && pendingDrop?.insertionIndex !== null) {
    insertionIndex = pendingDrop.insertionIndex;
  }

  const shouldMakeRoom = (
    isExternalTarget || isInternalReorder ||
    (hasPendingDropToThisGroup && pendingDropIsExternal) ||
    (hasPendingDropToThisGroup && pendingDropIsInternal)
  );

  const BASE = getBaseCardSize(th);
  const getStackCardDims = (sid) => {
    const s = stackById?.[sid];
    const card = cardById?.[s?.cardIds?.[0]];
    const side = card?.sides?.[card?.currentSide];
    const aspect = side?.width && side?.height ? side.width / side.height : 0.714;
    const landscape = aspect > 1;
    return {
      cardWidth: landscape ? BASE : BASE * aspect,
      cardHeight: landscape ? BASE / aspect : BASE,
    };
  };

  const stackBoundsMap = {};
  group.stackIds.forEach(sid => {
    const s = stackById?.[sid];
    if (s) {
      const { cardWidth, cardHeight } = getStackCardDims(sid);
      stackBoundsMap[sid] = getStackBounds(s, cardById, cardWidth, cardHeight);
    }
  });

  const gapDims = activeStackId ? getStackCardDims(activeStackId) : { cardWidth: BASE * 0.714, cardHeight: BASE };
  const layoutSlots = [];
  let slotIdx = 0;

  group.stackIds.forEach(sid => {
    const s = stackById?.[sid];
    if (!s || !s.cardIds) return;
    if (isEffectiveSourceGroup && sid === activeStackId) return;
    if (shouldMakeRoom && insertionIndex >= 0 && slotIdx === insertionIndex) {
      layoutSlots.push({ stackId: '__gap__', width: gapDims.cardWidth, height: gapDims.cardHeight, isGap: true });
    }
    const bounds = stackBoundsMap[sid] || { width: gapDims.cardWidth, height: gapDims.cardHeight };
    layoutSlots.push({ stackId: sid, width: bounds.width, height: bounds.height, isGap: false });
    slotIdx++;
  });
  if (shouldMakeRoom && insertionIndex >= 0 && insertionIndex >= slotIdx) {
    layoutSlots.push({ stackId: '__gap__', width: gapDims.cardWidth, height: gapDims.cardHeight, isGap: true });
  }

  const isPileGroup = region.type === 'pile';
  const isDraggingTopStack = isPileGroup && isEffectiveSourceGroup && activeStackId === group.stackIds[0];
  let globalCardIdx = 0;

  return (
    <>
      {group.stackIds.map((stackId, stackIndex) => {
        if (selectedStackIndices && !selectedStackIndices.includes(stackIndex)) return null;
        if (isPileGroup && stackIndex > 0 && !(stackIndex === 1 && isDraggingTopStack)) return null;

        const stack = stackById?.[stackId];
        if (!stack || !stack.cardIds) return null;

        const isBeingDragged = isEffectiveSourceGroup && stackId === activeStackId;
        const pos = computeStackPosition(
          stack, stackId, region, group, tw, th,
          shouldMakeRoom, insertionIndex, activeStackId, isBeingDragged,
          layoutSlots, stackBoundsMap
        );

        const el = (
          <PixiStack
            key={stackId}
            stackId={stackId}
            groupId={groupId}
            region={region}
            targetX={pos.x}
            targetY={pos.y}
            tableWidth={tw}
            tableHeight={th}
            baseZIndex={globalCardIdx}
            isBeingDragged={isBeingDragged}
            stackIndex={stackIndex}
            isNonInteractive={isPileGroup && stackIndex === 1}
            tiltDeg={tiltDeg}
            perspPx={perspPx}
          />
        );
        globalCardIdx += stack.cardIds.length;
        return el;
      })}
    </>
  );
};

/**
 * Inner scene - must be rendered inside @pixi/react Stage with Redux Provider.
 */
const PixiSceneInner = ({ onCardDrop, browseFilteredStackIndices, showRegionBoundaries = true, tw, th, tiltDeg = 0, perspPx = 1200 }) => {
  const formatGroupId = useFormatGroupId();
  const [hoveredRegionId, setHoveredRegionId] = useState(null);

  // Drag state
  const [draggedStack, setDraggedStack] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);
  const [hoveredGroupId, setHoveredGroupId] = useState(null);
  const [pendingDrop, setPendingDrop] = useState(null);
  const [hoverOverStackId, setHoverOverStackId] = useState(null);
  const [hoverOverDirection, setHoverOverDirection] = useState(null);
  const [hoverOverAttachmentAllowed, setHoverOverAttachmentAllowed] = useState(true);
  const stackPositionsRef = useRef(new Map());

  const registerStackPosition = useCallback((stackId, data) => {
    stackPositionsRef.current.set(stackId, data);
  }, []);
  const unregisterStackPosition = useCallback((stackId) => {
    stackPositionsRef.current.delete(stackId);
  }, []);
  const getStackPositionsForGroup = useCallback((gId, excludeId) => {
    const result = [];
    for (const [sid, data] of stackPositionsRef.current) {
      if (data.groupId === gId && sid !== excludeId) result.push({ stackId: sid, ...data });
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

  const layout = useSelector(state => {
    const obs = state?.playerUi?.observingPlayerN;
    return obs ? state?.gameUi?.game?.playerData?.[obs]?.layout : state?.gameUi?.game?.layout;
  });

  const browseRegion = useBrowseRegion();
  const groupById = useSelector(state => state?.gameUi?.game?.groupById);

  const formattedRegions = useMemo(() => {
    if (!layout?.regions) return null;
    const result = {};
    for (const [regionId, region] of Object.entries(layout.regions)) {
      const fmtGroupId = region.groupId ? formatGroupId(region.groupId) : null;
      result[regionId] = { ...region, id: regionId, groupId: fmtGroupId };
    }
    if (browseRegion.groupId) {
      result['browse'] = {
        ...browseRegion, id: 'browse',
        groupId: formatGroupId(browseRegion.groupId),
        height: '30%', top: '35%', left: '5%', width: '90%',
      };
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout?.regions, formatGroupId, browseRegion.groupId]);

  const findRegionAtPoint = useCallback((px, py) => {
    if (!formattedRegions) return null;
    let best = null, bestLayer = -1;
    for (const [regionId, region] of Object.entries(formattedRegions)) {
      if (region.visible === false) continue;
      if (isPointInRegion(px, py, region, tw, th)) {
        const layer = region.layerIndex || 0;
        if (layer > bestLayer) { best = { regionId, region }; bestLayer = layer; }
      }
    }
    return best;
  }, [formattedRegions, tw, th]);

  const getInsertionIndex = useCallback((dropX, dropY, targetRegion, sourceGroupId) => {
    if (!targetRegion || (targetRegion.type !== 'row' && targetRegion.type !== 'fan')) return null;
    const targetGroup = groupById?.[targetRegion.groupId];
    if (!targetGroup) return null;
    let count = targetGroup.stackIds?.length || 0;
    if (sourceGroupId === targetRegion.groupId && draggedStack) count = Math.max(0, count - 1);
    return calculateInsertionIndex(dropX, dropY, targetRegion, count, tw, th);
  }, [groupById, draggedStack, tw, th]);

  const dropCtxValue = useMemo(() => ({
    findRegionAtPoint, onCardDrop, hoveredRegionId, setHoveredRegionId, getInsertionIndex,
  }), [findRegionAtPoint, onCardDrop, hoveredRegionId, getInsertionIndex]);

  const dragStateCtxValue = useMemo(() => ({
    draggedStack, dragPosition, hoveredGroupId, pendingDrop,
    setDraggedStack, setDragPosition, setHoveredGroupId,
    clearDraggedStack, setPendingDropState: setPendingDrop, clearPendingDrop: () => setPendingDrop(null),
    hoverOverStackId, hoverOverDirection, hoverOverAttachmentAllowed,
    setHoverOverStackId, setHoverOverDirection, setHoverOverAttachmentAllowed,
    registerStackPosition, unregisterStackPosition, getStackPositionsForGroup,
  }), [
    draggedStack, dragPosition, hoveredGroupId, pendingDrop,
    clearDraggedStack, hoverOverStackId, hoverOverDirection, hoverOverAttachmentAllowed,
    registerStackPosition, unregisterStackPosition, getStackPositionsForGroup,
  ]);

  if (!formattedRegions) return <TableBackground tw={tw} th={th} />;

  return (
    <DragStateContext.Provider value={dragStateCtxValue}>
      <DropContext.Provider value={dropCtxValue}>
        <Container sortableChildren={true}>
          <TableBackground tw={tw} th={th} />

          {showRegionBoundaries && Object.entries(formattedRegions).map(([regionId, region]) => {
            if (region.visible === false) return null;
            return <RegionBoundary key={`b-${regionId}`} region={region} tw={tw} th={th} isHovered={regionId === hoveredRegionId} />;
          })}

          {Object.entries(formattedRegions).map(([regionId, region]) => {
            if (region.visible === false || !region.groupId) return null;
            return (
              <PixiGroupCards
                key={regionId}
                groupId={region.groupId}
                region={region}
                selectedStackIndices={regionId === 'browse' ? browseFilteredStackIndices : undefined}
                tw={tw}
                th={th}
                tiltDeg={tiltDeg}
                perspPx={perspPx}
              />
            );
          })}
        </Container>
      </DropContext.Provider>
    </DragStateContext.Provider>
  );
};

/**
 * Top-level wrapper: provides Redux store, PluginContext, and TableDimensions inside the Stage.
 * @pixi/react uses a separate reconciler root that does NOT inherit outer React contexts
 * (unlike @react-three/fiber which bridges them automatically). We must re-provide here.
 */
export const PixiSceneFromRedux = ({ tw, th, pluginCtx, ...props }) => (
  <Provider store={store}>
    <PluginContext.Provider value={pluginCtx}>
      <TableDimensionsProvider width={tw} height={th}>
        <PixiSceneInner tw={tw} th={th} {...props} />
      </TableDimensionsProvider>
    </PluginContext.Provider>
  </Provider>
);

export default PixiSceneFromRedux;
