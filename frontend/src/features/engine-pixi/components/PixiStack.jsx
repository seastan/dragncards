/**
 * PixiStack - Drag + animation owner for a stack of cards in the PixiJS view.
 *
 * Owns drag handling, position springs, and renders PixiCardFromRedux
 * for each card in the stack.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Container } from '@pixi/react';
import { useSelector } from 'react-redux';
import { PixiCardFromRedux } from './PixiCardFromRedux';
import { useDropContext, useDragStateContext } from './PixiScene';
import { findAttachmentTarget, isAttachmentAllowed, getAttachmentLocalOffset } from '../../engine-r3f/utils/attachmentUtils';
import { useGameDefinition } from '../../engine/hooks/useGameDefinition';
import { getCardDimsPx } from '../utils/regionUtils';
import { useVisibleSide } from '../../engine/hooks/useVisibleSide';
import { screenToCanvas } from '../utils/perspectiveUtils';

// Global drag counter for z-ordering
let globalDragCounter = 0;
const DRAG_THRESHOLD = 5; // px

// Simple spring-like position interpolation via requestAnimationFrame
const LERP_SPEED = 0.18;

export const PixiStack = ({
  stackId,
  groupId,
  region,
  targetX,
  targetY,
  tableWidth,
  tableHeight,
  baseZIndex = 0,
  isBeingDragged: isBeingDraggedProp = false,
  stackIndex = 0,
  isNonInteractive = false,
  tiltDeg = 0,
  perspPx = 1200,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [posX, setPosX] = useState(targetX);
  const [posY, setPosY] = useState(targetY);

  const pointerDownRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const dragStartedRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragCounterRef = useRef(0);

  const animFrameRef = useRef(null);
  const currentPosRef = useRef({ x: targetX, y: targetY });

  const stack = useSelector(state => state?.gameUi?.game?.stackById?.[stackId]);
  const cardById = useSelector(state => state?.gameUi?.game?.cardById);
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const gameDef = useGameDefinition();

  const topCardId = stack?.cardIds?.[0];
  const topCardSide = useVisibleSide(topCardId);
  const topCardSideData = cardById?.[topCardId]?.sides?.[topCardSide];
  const { cardWidth, cardHeight } = useMemo(
    () => getCardDimsPx(topCardSideData, tableHeight),
    [topCardSideData, tableHeight]
  );

  const dropContext = useDropContext();
  const dragStateContext = useDragStateContext();

  // Animate position toward targetX/targetY with spring-like lerp
  useEffect(() => {
    if (isDragging) return; // Don't override drag position with spring

    const animate = () => {
      const dx = targetX - currentPosRef.current.x;
      const dy = targetY - currentPosRef.current.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        currentPosRef.current = { x: targetX, y: targetY };
        setPosX(targetX);
        setPosY(targetY);
        return;
      }
      currentPosRef.current.x += dx * LERP_SPEED;
      currentPosRef.current.y += dy * LERP_SPEED;
      setPosX(currentPosRef.current.x);
      setPosY(currentPosRef.current.y);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetX, targetY, isDragging]);

  const handlePointerDown = useCallback((e) => {
    if (isNonInteractive) return;
    if (e.data) e.data.originalEvent?.preventDefault?.();
    else e.preventDefault?.();

    pointerDownRef.current = true;
    dragStartedRef.current = false;

    const global = e.global || e.data?.global;
    if (!global) return;
    pointerStartRef.current = { x: global.x, y: global.y };
    dragOffsetRef.current = {
      x: currentPosRef.current.x - global.x,
      y: currentPosRef.current.y - global.y,
    };

    // Add canvas-level move/up listeners
    const canvas = e.currentTarget?.parent?.parent?.stage?.renderer?.view
      || document.querySelector('canvas');
    if (!canvas) return;

    const onMove = (moveEvent) => {
      if (!pointerDownRef.current) return;
      const point = moveEvent.touches ? moveEvent.touches[0] : moveEvent;
      const rect = canvas.getBoundingClientRect();
      const corrected = screenToCanvas(point.clientX, point.clientY, rect, tiltDeg, perspPx, tableWidth, tableHeight);
      const cx = corrected.x;
      const cy = corrected.y;

      if (!dragStartedRef.current) {
        const dx = cx - pointerStartRef.current.x;
        const dy = cy - pointerStartRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

        // Start drag
        dragStartedRef.current = true;
        dragCounterRef.current = ++globalDragCounter;
        setIsDragging(true);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        dragStateContext?.setDraggedStack({
          stackId,
          groupId,
          sourceGroupId: groupId,
          region,
        });
      }

      if (dragStartedRef.current) {
        const newX = cx + dragOffsetRef.current.x;
        const newY = cy + dragOffsetRef.current.y;
        currentPosRef.current = { x: newX, y: newY };
        setPosX(newX);
        setPosY(newY);

        // Update drag position for Trello-style reordering
        dragStateContext?.setDragPosition({ x: newX, y: newY });

        // Find hovered region
        if (dropContext?.findRegionAtPoint) {
          const hit = dropContext.findRegionAtPoint(cx, cy);
          const newGroupId = hit?.region?.groupId || null;
          dragStateContext?.setHoveredGroupId(newGroupId);
        }

        // Check attachment zones
        if (dragStateContext?.getStackPositionsForGroup) {
          const targetGroupId = dragStateContext?.hoveredGroupId || groupId;
          const otherStacks = dragStateContext.getStackPositionsForGroup(targetGroupId, stackId);
          const { stackId: attachTarget, direction } = findAttachmentTarget(
            newX, newY, otherStacks, cardWidth, region
          );

          if (attachTarget) {
            const allowed = isAttachmentAllowed(stackId, attachTarget, gameDef, playerN, region);
            dragStateContext?.setHoverOverStackId(allowed ? attachTarget : null);
            dragStateContext?.setHoverOverDirection(allowed ? direction : null);
            dragStateContext?.setHoverOverAttachmentAllowed(allowed);
          } else {
            dragStateContext?.setHoverOverStackId(null);
            dragStateContext?.setHoverOverDirection(null);
            dragStateContext?.setHoverOverAttachmentAllowed(true);
          }
        }
      }
    };

    const onUp = (upEvent) => {
      cleanup();
      if (!pointerDownRef.current) return;
      pointerDownRef.current = false;

      if (!dragStartedRef.current) return; // was a click, handled by onClick

      dragStartedRef.current = false;
      setIsDragging(false);

      const point = upEvent.changedTouches ? upEvent.changedTouches[0] : upEvent;
      const rect = canvas.getBoundingClientRect();
      const corrected = screenToCanvas(point.clientX, point.clientY, rect, tiltDeg, perspPx, tableWidth, tableHeight);
      const cx = corrected.x;
      const cy = corrected.y;

      // Find drop target
      const hit = dropContext?.findRegionAtPoint?.(cx, cy);
      const combineStackId = dragStateContext?.hoverOverStackId;
      const combineDirection = dragStateContext?.hoverOverDirection;

      dragStateContext?.clearDraggedStack();

      if (dropContext?.onCardDrop) {
        const targetRegion = hit?.region || region;
        const targetGroupId = targetRegion?.groupId || groupId;

        let insertionIndex = null;
        if (hit?.region && dropContext?.getInsertionIndex) {
          insertionIndex = dropContext.getInsertionIndex(
            currentPosRef.current.x,
            currentPosRef.current.y,
            hit.region,
            groupId,
          );
        }

        dropContext.onCardDrop({
          stackId,
          sourceGroupId: groupId,
          targetGroupId,
          targetRegion,
          positionPx: { x: currentPosRef.current.x, y: currentPosRef.current.y },
          tableWidth,
          tableHeight,
          insertionIndex,
          combineStackId,
          combineDirection,
        });
      }
    };

    const cleanup = () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
    };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);
  }, [
    isNonInteractive, stackId, groupId, region, cardWidth,
    tableWidth, tableHeight, dropContext, dragStateContext, gameDef, playerN,
    tiltDeg, perspPx,
  ]);

  // Register/unregister stack position for attachment zone detection
  useEffect(() => {
    if (dragStateContext?.registerStackPosition) {
      dragStateContext.registerStackPosition(stackId, {
        groupId,
        x: currentPosRef.current.x,
        y: currentPosRef.current.y,
        cardWidth,
        cardHeight,
        edges: { left: 0, right: 0, top: 0, bottom: 0 },
      });
    }
    return () => {
      dragStateContext?.unregisterStackPosition?.(stackId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stackId, groupId, cardWidth, cardHeight]);

  // Keep registered position up to date
  useEffect(() => {
    if (dragStateContext?.registerStackPosition) {
      dragStateContext.registerStackPosition(stackId, {
        groupId,
        x: posX,
        y: posY,
        cardWidth,
        cardHeight,
        edges: { left: 0, right: 0, top: 0, bottom: 0 },
      });
    }
  }, [posX, posY, cardWidth, cardHeight, groupId, stackId, dragStateContext]);

  if (!stack || !stack.cardIds) return null;

  const isAttachmentTarget = dragStateContext?.hoverOverStackId === stackId;
  // Scale factor: converts R3F world units to PixiJS pixels
  // R3F TABLE_HEIGHT = 56.25 world units; PixiJS tableHeight is in pixels
  const WORLD_TO_PX = tableHeight / (100 * (9 / 16));

  return (
    <Container x={0} y={0} sortableChildren={true} zIndex={isDragging ? 999 + dragCounterRef.current : baseZIndex}>
      {stack.cardIds.map((cardId, cardIndex) => {
        let attachLocalX = 0;
        let attachLocalY = 0;
        if (cardIndex > 0) {
          const [ox, , oz] = getAttachmentLocalOffset(cardIndex, cardById, stack);
          attachLocalX = ox * WORLD_TO_PX;
          attachLocalY = oz * WORLD_TO_PX;
        }

        return (
          <PixiCardFromRedux
            key={cardId}
            cardId={cardId}
            stackId={stackId}
            groupId={groupId}
            region={region}
            x={posX + attachLocalX}
            y={posY + attachLocalY}
            cardIndexInStack={cardIndex}
            baseZIndex={baseZIndex + cardIndex}
            isDragging={isDragging && cardIndex === 0}
            onPointerDownForDrag={cardIndex === 0 ? handlePointerDown : undefined}
            isAttachmentHover={isAttachmentTarget && cardIndex === 0}
            tableHeight={tableHeight}
          />
        );
      })}
    </Container>
  );
};

export default PixiStack;
