/**
 * R3FStack - Stack-level draggable unit for the 3D view
 *
 * Owns drag handling, position/scale springs, shadow, pendingDrop,
 * and floating animation. Renders R3FCardFromRedux for each card in the stack.
 * All cards in a stack move together when dragged.
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { useSelector } from 'react-redux';
import { R3FCardFromRedux } from './R3FCardFromRedux';
import { useDropContext, useDragStateContext } from './R3FScene';
import { findAttachmentTarget, isAttachmentAllowed, getAttachmentLocalOffset, getStackBounds } from '../utils/attachmentUtils';
import { useGameDefinition } from '../../engine/hooks/useGameDefinition';

// Global counter to track drag order for z-indexing
let globalDragCounter = 0;

// Minimum distance in pixels the pointer must move before a drag starts
const DRAG_THRESHOLD = 5;

/**
 * R3FStack - Drag + animation owner for a stack of cards
 */
export const R3FStack = ({
  stackId,
  groupId,
  region,
  position = [0, 0, 0],
  baseZIndex = 0,
  isBeingDragged: isBeingDraggedProp = false,
  stackIndex = 0,
  isNonInteractive = false,
}) => {
  const groupRef = useRef();
  const shadowRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const [isLifted, setIsLifted] = useState(false);
  const [hovered] = useState(false);
  const [, setZIndex] = useState(baseZIndex);
  const dragOffsetRef = useRef({ x: 0, z: 0 });
  const isDraggingRef = useRef(false);
  const stackIndexRef = useRef(stackIndex);
  const lastPointerClientRef = useRef({ x: 0, y: 0 });
  const glRef = useRef(null);

  // For distinguishing click vs drag
  const pointerDownRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const dragStartedRef = useRef(false);

  // Track target and drop positions
  const dropPositionRef = useRef(null);
  const justDroppedRef = useRef(false);
  const waitingForPositionUpdateRef = useRef(false);
  const animationInProgressRef = useRef(false);

  const { camera, gl, invalidate } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const tablePlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  // Redux state
  const stack = useSelector(state => state?.gameUi?.game?.stackById?.[stackId]);
  const cardById = useSelector(state => state?.gameUi?.game?.cardById);
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const gameDef = useGameDefinition();

  // Contexts
  const dropContext = useDropContext();
  const dragStateContext = useDragStateContext();

  // Get top card ID for click handling
  const topCardId = stack?.cardIds?.[0];

  // pendingDrop tracking
  const pendingDrop = dragStateContext?.pendingDrop;
  const hasPendingDrop = pendingDrop?.stackId === stackId;

  // Cross-region drop detection
  const isCrossRegionDrop = hasPendingDrop && pendingDrop?.sourceGroupId !== pendingDrop?.targetGroupId;
  const isInTargetGroup = groupId === pendingDrop?.targetGroupId;
  const pendingDropPosition = (isCrossRegionDrop && isInTargetGroup) ? [
    pendingDrop.dropPosition[0],
    2,
    pendingDrop.dropPosition[2],
  ] : null;

  // Cross-region init tracking
  const crossRegionInitializedRef = useRef(!pendingDropPosition);

  // Track current stack index in group for pending drop clearing
  const currentGroup = useSelector(state => state?.gameUi?.game?.groupById?.[groupId]);
  const currentStackIndex = currentGroup?.stackIds?.indexOf(stackId) ?? -1;
  const originalStackIndex = useRef(currentStackIndex);

  useEffect(() => { stackIndexRef.current = stackIndex; }, [stackIndex]);
  useEffect(() => { glRef.current = gl; }, [gl]);

  useEffect(() => {
    if (hasPendingDrop) {
      originalStackIndex.current = currentStackIndex;
    }
  }, [hasPendingDrop]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear pending drop when stack reaches target position
  useEffect(() => {
    if (!hasPendingDrop) return;

    const isInTarget = pendingDrop?.targetGroupId === groupId;
    const isSameGroupReorder = pendingDrop?.sourceGroupId === pendingDrop?.targetGroupId;

    if (isInTarget) {
      let shouldClear = false;

      if (isSameGroupReorder) {
        const hasIndexChanged = currentStackIndex !== originalStackIndex.current;
        if (hasIndexChanged) {
          shouldClear = true;
        }
      } else {
        shouldClear = true;
      }

      if (shouldClear) {
        if (dragStateContext?.clearPendingDrop) {
          dragStateContext.clearPendingDrop();
        }
      }
    }
  }, [hasPendingDrop, pendingDrop, groupId, currentStackIndex, dragStateContext]);

  // Fallback timeout to clear pending drop
  useEffect(() => {
    if (!hasPendingDrop) return;
    const timeout = setTimeout(() => {
      if (dragStateContext?.clearPendingDrop) {
        dragStateContext.clearPendingDrop();
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [hasPendingDrop, dragStateContext]);

  // Attachment hover: this stack is being dragged AND context has a valid attachment target
  const isStackBeingDragged = dragStateContext?.draggedStack?.stackId === stackId;
  const isAttachmentHover = isStackBeingDragged &&
    dragStateContext?.hoverOverStackId != null &&
    dragStateContext?.hoverOverAttachmentAllowed === true;

  // Attachment indicator: this stack is the hover target (not allowed in browse region)
  const attachmentIndicatorDirection =
    (dragStateContext?.hoverOverStackId === stackId &&
      dragStateContext?.hoverOverAttachmentAllowed === true &&
      region?.id !== 'browse')
      ? dragStateContext?.hoverOverDirection
      : null;

  // After a drop animation settles, re-evaluate pointer intersections so that
  // onPointerOver fires naturally if the mouse is still over the card.
  const triggerPointerCheck = useCallback(() => {
    const { x, y } = lastPointerClientRef.current;
    if (!x && !y) return;
    glRef.current?.domElement?.dispatchEvent(new PointerEvent('pointermove', {
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
      pointerType: 'mouse',
    }));
  }, []);

  // Spring for scale
  const [springProps, springApi] = useSpring(() => ({
    scale: pendingDropPosition ? 1.1 : 1,
    config: { tension: 400, friction: 30, clamp: true }
  }));

  // Spring for position
  const [posSpring, posSpringApi] = useSpring(() => ({
    x: pendingDropPosition ? pendingDropPosition[0] : position[0],
    y: pendingDropPosition ? pendingDropPosition[1] : position[1],
    z: pendingDropPosition ? pendingDropPosition[2] : position[2],
    config: { tension: 200, friction: 26, clamp: true }
  }));

  // Update scale on drag or lift state change
  useEffect(() => {
    springApi.start({ scale: (isDragging || isLifted) ? 1.1 : 1 });
    invalidate();
  }, [isDragging, isLifted, springApi]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle cross-region drops
  React.useLayoutEffect(() => {
    if (pendingDropPosition && !animationInProgressRef.current) {
      animationInProgressRef.current = true;
      setIsLifted(true);

      const liftedY = pendingDropPosition[1];
      const newBaseY = position[1];

      if (groupRef.current) {
        groupRef.current.position.x = pendingDropPosition[0];
        groupRef.current.position.y = liftedY;
        groupRef.current.position.z = pendingDropPosition[2];
        groupRef.current.visible = true;
      }

      posSpringApi.set({
        x: pendingDropPosition[0],
        y: liftedY,
        z: pendingDropPosition[2],
      });

      crossRegionInitializedRef.current = true;

      posSpringApi.start({
        x: position[0],
        y: liftedY,
        z: position[2],
        onRest: () => {
          setIsLifted(false);
          posSpringApi.start({
            y: newBaseY,
            onRest: () => {
              animationInProgressRef.current = false;
              triggerPointerCheck();
            },
          });
        },
      });
      invalidate();
    }
  }, [pendingDropPosition, position[0], position[2], posSpringApi]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update position spring when position prop changes (Redux state updates)
  useEffect(() => {
    if (pendingDropPosition) return;
    if (animationInProgressRef.current) return;

    if (!isDraggingRef.current) {
      const restingY = position[1];

      if (justDroppedRef.current && dropPositionRef.current) {
        waitingForPositionUpdateRef.current = true;
        justDroppedRef.current = false;

        const savedDropPos = [...dropPositionRef.current];
        setTimeout(() => {
          if (waitingForPositionUpdateRef.current && !animationInProgressRef.current) {
            animationInProgressRef.current = true;
            waitingForPositionUpdateRef.current = false;
            dropPositionRef.current = null;

            posSpringApi.start({
              x: position[0],
              y: savedDropPos[1],
              z: position[2],
              onRest: () => {
                setIsLifted(false);
                posSpringApi.start({
                  y: restingY,
                  onRest: () => {
                    animationInProgressRef.current = false;
                    triggerPointerCheck();
                  },
                });
              },
            });
            invalidate();
          }
        }, 100);

        return;
      }

      if (waitingForPositionUpdateRef.current && dropPositionRef.current) {
        const dropX = dropPositionRef.current[0];
        const dropZ = dropPositionRef.current[2];
        const positionChanged = Math.abs(position[0] - dropX) > 0.5 || Math.abs(position[2] - dropZ) > 0.5;

        if (!positionChanged) {
          return;
        }

        animationInProgressRef.current = true;
        const liftedY = dropPositionRef.current[1];
        const savedDropPos = [...dropPositionRef.current];
        dropPositionRef.current = null;
        waitingForPositionUpdateRef.current = false;

        posSpringApi.set({
          x: savedDropPos[0],
          y: liftedY,
          z: savedDropPos[2],
        });
        posSpringApi.start({
          x: position[0],
          y: liftedY,
          z: position[2],
          onRest: () => {
            setIsLifted(false);
            posSpringApi.start({
              y: restingY,
              onRest: () => {
                animationInProgressRef.current = false;
                triggerPointerCheck();
              },
            });
          },
        });
      } else if (!waitingForPositionUpdateRef.current) {
        posSpringApi.start({
          x: position[0],
          y: restingY,
          z: position[2],
        });
      }
    }
  }, [position[0], position[1], position[2], posSpringApi, pendingDropPosition]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Drag handling ---

  const getPointerCoords = (event) => {
    const rect = gl.domElement.getBoundingClientRect();
    let clientX, clientY;
    if (event.touches?.length > 0) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
    else if (event.changedTouches?.length > 0) { clientX = event.changedTouches[0].clientX; clientY = event.changedTouches[0].clientY; }
    else { clientX = event.clientX; clientY = event.clientY; }
    if (clientX === undefined) return null;
    return new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  };

  const handlePointerDown = useCallback((event) => {
    event.stopPropagation();

    let clientX, clientY;
    if (event.touches?.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    pointerDownRef.current = true;
    pointerStartRef.current = { x: clientX, y: clientY };
    dragStartedRef.current = false;

    const coords = getPointerCoords(event);
    if (!coords || !groupRef.current) return;
    raycaster.setFromCamera(coords, camera);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(tablePlane, intersectPoint);
    dragOffsetRef.current = { x: groupRef.current.position.x - intersectPoint.x, z: groupRef.current.position.z - intersectPoint.z };

    if (event.target?.setPointerCapture && event.pointerId !== undefined) {
      event.target.setPointerCapture(event.pointerId);
    }

    setPointerIsDown(true);
  }, [gl, camera, raycaster, tablePlane]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = () => {
    if (dragStartedRef.current) return;
    dragStartedRef.current = true;
    isDraggingRef.current = true;
    setIsDragging(true);
    setIsLifted(true);
    posSpringApi.stop();

    // Notify context about drag start
    if (dragStateContext?.setDraggedStack) {
      dragStateContext.setDraggedStack({
        stackId,
        cardId: topCardId,
        sourceGroupId: groupId,
        sourceRegion: region,
      });
    }
  };

  const [pointerIsDown, setPointerIsDown] = useState(false);

  useEffect(() => {
    if (!pointerIsDown) return;
    const canvas = gl.domElement;

    const getClientCoords = (event) => {
      if (event.touches?.length > 0) {
        return { x: event.touches[0].clientX, y: event.touches[0].clientY };
      } else if (event.changedTouches?.length > 0) {
        return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
      }
      return { x: event.clientX, y: event.clientY };
    };

    const moveHandler = (event) => {
      if (!pointerDownRef.current || !groupRef.current) return;

      const { x: clientX, y: clientY } = getClientCoords(event);
      lastPointerClientRef.current = { x: clientX, y: clientY };

      if (!dragStartedRef.current) {
        const dx = clientX - pointerStartRef.current.x;
        const dy = clientY - pointerStartRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= DRAG_THRESHOLD) {
          startDrag();
        } else {
          return;
        }
      }

      const coords = getPointerCoords(event);
      if (!coords) return;
      raycaster.setFromCamera(coords, camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(tablePlane, intersectPoint);

      // Direct position update during drag (no animation)
      groupRef.current.position.x = intersectPoint.x + dragOffsetRef.current.x;
      groupRef.current.position.z = intersectPoint.z + dragOffsetRef.current.z;
      groupRef.current.position.y = 2;

      // Notify about drag position for hover detection
      const currentPosition = [groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z];

      // Update drag position for Trello-style reordering
      if (dragStateContext?.setDragPosition) {
        dragStateContext.setDragPosition(currentPosition);
      }
      if (dragStateContext?.updatePointerPosition) {
        dragStateContext.updatePointerPosition(currentPosition);
      }

      // Region hover detection
      if (dropContext) {
        const { findRegionAtPoint, setHoveredRegionId } = dropContext;
        const targetInfo = findRegionAtPoint(currentPosition[0], currentPosition[2]);

        if (setHoveredRegionId) {
          setHoveredRegionId(targetInfo?.regionId || null);
        }
        if (dragStateContext?.setHoveredGroupId) {
          dragStateContext.setHoveredGroupId(targetInfo?.region?.groupId || null);
        }

        // Attachment zone detection
        const targetGroupId = targetInfo?.region?.groupId;
        const targetRegion = targetInfo?.region;
        if (targetGroupId && dragStateContext?.getStackPositionsForGroup) {
          const stackPositions = dragStateContext.getStackPositionsForGroup(targetGroupId, stackId);
          const { stackId: hoverStackId, direction } = findAttachmentTarget(
            currentPosition[0], currentPosition[2], stackPositions, cardWidth, targetRegion
          );
          if (hoverStackId) {
            const allowed = isAttachmentAllowed(stackId, hoverStackId, gameDef, playerN, targetRegion);
            if (dragStateContext.setHoverOverStackId) dragStateContext.setHoverOverStackId(hoverStackId);
            if (dragStateContext.setHoverOverDirection) dragStateContext.setHoverOverDirection(direction);
            if (dragStateContext.setHoverOverAttachmentAllowed) dragStateContext.setHoverOverAttachmentAllowed(allowed);
          } else {
            if (dragStateContext.setHoverOverStackId) dragStateContext.setHoverOverStackId(null);
            if (dragStateContext.setHoverOverDirection) dragStateContext.setHoverOverDirection(null);
            if (dragStateContext.setHoverOverAttachmentAllowed) dragStateContext.setHoverOverAttachmentAllowed(true);
          }
        } else {
          if (dragStateContext?.setHoverOverStackId) dragStateContext.setHoverOverStackId(null);
          if (dragStateContext?.setHoverOverDirection) dragStateContext.setHoverOverDirection(null);
          if (dragStateContext?.setHoverOverAttachmentAllowed) dragStateContext.setHoverOverAttachmentAllowed(true);
        }
      }

      event.preventDefault();
    };

    const upHandler = (event) => {
      const wasPointerDown = pointerDownRef.current;
      const wasDragging = dragStartedRef.current;

      pointerDownRef.current = false;
      setPointerIsDown(false);

      if (wasPointerDown && !wasDragging) {
        // Non-drag click: R3F will fire onClick on the mesh → handleMeshClick,
        // which dispatches the card menu and calls e.nativeEvent.stopPropagation()
        // to prevent Table.js from clearing the dropdown. Nothing to do here.
        return;
      }

      // We were dragging - handle drop
      isDraggingRef.current = false;
      dragStartedRef.current = false;

      globalDragCounter++;
      const newZIndex = globalDragCounter;

      let finalPosition = null;
      if (groupRef.current) {
        const dropX = groupRef.current.position.x;
        const dropZ = groupRef.current.position.z;
        const liftedY = 2;

        dropPositionRef.current = [dropX, liftedY, dropZ];
        justDroppedRef.current = true;

        finalPosition = [dropX, 0.1 + (newZIndex * 0.02), dropZ];

        posSpringApi.set({
          x: dropX,
          y: liftedY,
          z: dropZ,
        });

        // Fallback: if position never changes (same-group same-index drop),
        // the position useEffect won't fire and the card would freeze lifted.
        // Animate back directly after a short delay in that case.
        const savedDropPos = [dropX, liftedY, dropZ];
        setTimeout(() => {
          if (!justDroppedRef.current || animationInProgressRef.current) return;
          justDroppedRef.current = false;
          waitingForPositionUpdateRef.current = false;
          dropPositionRef.current = null;
          animationInProgressRef.current = true;
          posSpringApi.start({
            x: position[0],
            y: savedDropPos[1],
            z: position[2],
            onRest: () => {
              setIsLifted(false);
              posSpringApi.start({
                y: position[1],
                onRest: () => {
                  animationInProgressRef.current = false;
                  triggerPointerCheck();
                },
              });
            },
          });
        }, 200);
      }

      setIsDragging(false);
      setZIndex(newZIndex);

      // Handle drop target detection and action
      if (finalPosition && dropContext) {
        const { findRegionAtPoint, onCardDrop, getInsertionIndex } = dropContext;
        const targetInfo = findRegionAtPoint(finalPosition[0], finalPosition[2]);

        const combineStackId = dragStateContext?.hoverOverStackId;
        const combineDirection = dragStateContext?.hoverOverDirection;
        const combineAllowed = dragStateContext?.hoverOverAttachmentAllowed;
        const isCombineDrop = combineStackId && combineDirection && combineAllowed;

        let insertionIndex = null;
        if (!isCombineDrop && targetInfo?.region && getInsertionIndex) {
          insertionIndex = getInsertionIndex(
            finalPosition[0],
            targetInfo.region,
            groupId,
            finalPosition[2]
          );
        }

        if (targetInfo && onCardDrop) {
          // Skip pendingDrop for same-group same-index (no-op) drops — Redux state
          // won't change so the clearPendingDrop useEffect would never fire.
          const curIdx = stackIndexRef.current;
          const isNoOp = !isCombineDrop &&
            targetInfo.region?.groupId === groupId &&
            (insertionIndex === curIdx || insertionIndex === curIdx + 1);

          if (!isNoOp && dragStateContext?.setPendingDropState) {
            dragStateContext.setPendingDropState({
              stackId,
              cardId: topCardId,
              sourceGroupId: groupId,
              targetGroupId: targetInfo.region?.groupId,
              dropPosition: finalPosition,
              insertionIndex,
            });
          }

          onCardDrop({
            stackId,
            cardId: topCardId,
            sourceGroupId: groupId,
            sourceRegion: region,
            targetGroupId: targetInfo.region?.groupId,
            targetRegion: targetInfo.region,
            position: finalPosition,
            insertionIndex,
            ...(isCombineDrop ? { combineStackId, combineDirection } : {}),
          });
        }

        if (dragStateContext?.clearDraggedStack) {
          dragStateContext.clearDraggedStack();
        }
      }

      document.body.style.cursor = 'default';

      // Suppress the DOM click that browsers fire after pointerup so that R3F
      // does not deliver a spurious onClick to whatever card is under the cursor
      // (e.g. the attachment target after a combine drop).
      const suppressClick = (e) => {
        e.stopPropagation();
        canvas.removeEventListener('click', suppressClick, true);
      };
      canvas.addEventListener('click', suppressClick, true);
      setTimeout(() => canvas.removeEventListener('click', suppressClick, true), 200);

      event.preventDefault();
    };

    canvas.addEventListener('pointermove', moveHandler);
    canvas.addEventListener('pointerup', upHandler);
    canvas.addEventListener('pointercancel', upHandler);
    canvas.addEventListener('touchmove', moveHandler, { passive: false });
    canvas.addEventListener('touchend', upHandler, { passive: false });
    canvas.addEventListener('touchcancel', upHandler, { passive: false });
    return () => {
      canvas.removeEventListener('pointermove', moveHandler);
      canvas.removeEventListener('pointerup', upHandler);
      canvas.removeEventListener('pointercancel', upHandler);
      canvas.removeEventListener('touchmove', moveHandler);
      canvas.removeEventListener('touchend', upHandler);
      canvas.removeEventListener('touchcancel', upHandler);
    };
  }, [pointerIsDown, camera, gl, raycaster, tablePlane, posSpringApi, dragStateContext, dropContext, stackId, topCardId, groupId, region, gameDef, playerN]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive card dimensions from top card's side data.
  // The longer dimension is always BASE_CARD_SIZE (10) world units.
  const topCard = cardById?.[topCardId];
  const topCardSide = topCard?.sides?.[topCard?.currentSide];
  const BASE_CARD_SIZE = 10;
  const rawW = topCardSide?.width;
  const rawH = topCardSide?.height;
  const cardAspect = rawW && rawH ? rawW / rawH : 0.714;
  const isLandscape = cardAspect > 1;
  const cardWidth = isLandscape ? BASE_CARD_SIZE : BASE_CARD_SIZE * cardAspect;
  const cardHeight = isLandscape ? BASE_CARD_SIZE / cardAspect : BASE_CARD_SIZE;

  // Shadow material
  const cornerRadius = 0.3;
  const shadowSpread = 1.0;

  const shadowGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(cardWidth + shadowSpread * 2, cardHeight + shadowSpread * 2);
  }, [cardWidth, cardHeight]);

  const shadowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        halfSize: { value: new THREE.Vector2(cardWidth / 2, cardHeight / 2) },
        radius: { value: cornerRadius },
        shadowSoftness: { value: 0.8 },
        opacity: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vPos;
        void main() {
          vPos = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec2 halfSize;
        uniform float radius;
        uniform float shadowSoftness;
        uniform float opacity;
        varying vec2 vPos;

        float sdRoundedRect(vec2 p, vec2 b, float r) {
          vec2 q = abs(p) - b + vec2(r);
          return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        }

        void main() {
          float d = sdRoundedRect(vPos, halfSize, radius);
          float alpha = 1.0 - smoothstep(-shadowSoftness, shadowSoftness, d);
          gl_FragColor = vec4(0.0, 0.0, 0.0, alpha * opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.KeepStencilOp,
      stencilZFail: THREE.KeepStencilOp,
      stencilZPass: THREE.KeepStencilOp,
    });
  }, [cardWidth, cardHeight, cornerRadius]);

  // useFrame: position, floating, shadow
  useFrame(({ clock, invalidate }, delta) => {
    if (!groupRef.current) return;

    // Keep rendering while springs are settling (required for frameloop="demand")
    if (posSpring.x.isAnimating || posSpring.y.isAnimating || posSpring.z.isAnimating ||
        springProps.scale.isAnimating) {
      invalidate();
    }

    if (!isDraggingRef.current && crossRegionInitializedRef.current) {
      groupRef.current.position.x = posSpring.x.get();
      groupRef.current.position.z = posSpring.z.get();

      const springY = posSpring.y.get();
      if (!hovered) {
        groupRef.current.position.y = springY + Math.sin(clock.getElapsedTime() * 0.5) * 0.02;
      } else {
        groupRef.current.position.y = springY;
      }
    }

    // Update shadow
    if (shadowRef.current && shadowMaterial.uniforms) {
      const groupY = groupRef.current.position.y;

      shadowRef.current.position.y = -groupY + 0.05;

      // Shadow rotation: lay flat on table
      shadowRef.current.rotation.set(-Math.PI / 2, 0, 0);

      const lifted = isDragging || isLifted;
      const targetOpacity = lifted ? 0.65 : 0.0;
      const currentOpacity = shadowMaterial.uniforms.opacity.value;
      const fadeSpeed = lifted ? 8 : 5;
      shadowMaterial.uniforms.opacity.value += (targetOpacity - currentOpacity) * Math.min(delta * fadeSpeed, 1);

      const height = Math.max(0, groupY);
      const baseSoftness = 0.6;
      const heightSoftness = baseSoftness + height * 0.25;
      shadowMaterial.uniforms.shadowSoftness.value = heightSoftness;

      const shadowScale = 1.0 + height * 0.04;
      shadowRef.current.scale.set(shadowScale, shadowScale, 1);
    }
  });

  // Ref callback to set initial position imperatively
  const groupRefCallback = useCallback((el) => {
    groupRef.current = el;
    if (el && !el.userData._positionInitialized) {
      const initPos = pendingDropPosition || position;
      el.position.set(initPos[0], initPos[1], initPos[2]);
      el.userData._positionInitialized = true;
      if (pendingDropPosition) {
        el.visible = false;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute stack bounds (includes attachment edges) for zone detection + indicator positioning
  const stackBounds = useMemo(() => getStackBounds(stack, cardById, cardWidth, cardHeight), [stack, cardById, cardWidth, cardHeight]);

  // Register stack position for attachment detection
  const registerStackPosition = dragStateContext?.registerStackPosition;
  const unregisterStackPosition = dragStateContext?.unregisterStackPosition;

  useEffect(() => {
    if (!registerStackPosition) return;
    registerStackPosition(stackId, {
      x: position[0],
      z: position[2],
      cardWidth,
      cardHeight,
      groupId,
      edges: stackBounds.edges,
    });
    return () => {
      if (unregisterStackPosition) {
        unregisterStackPosition(stackId);
      }
    };
  }); // runs every render to keep positions up-to-date

  if (!stack || !stack.cardIds) return null;

  const cardCount = stack.cardIds.length;

  return (
    <group ref={groupRefCallback}>
      <animated.group scale={springProps.scale}>
        {stack.cardIds.map((cardId, idx) => {
          const localOffset = getAttachmentLocalOffset(idx, cardById, stack);
          return (
            <R3FCardFromRedux
              key={cardId}
              cardId={cardId}
              stackId={stackId}
              groupId={groupId}
              region={region}
              localPosition={localOffset}
              cardIndexInStack={idx}
              baseZIndex={baseZIndex + (cardCount - idx)}
              isDragging={isDragging}
              onPointerDownForDrag={!isNonInteractive && idx === 0 ? handlePointerDown : undefined}
              isAttachmentHover={isAttachmentHover}
              attachmentIndicatorDirection={idx === 0 ? attachmentIndicatorDirection : null}
              attachmentEdges={idx === 0 ? stackBounds.edges : undefined}
              stackIndex={stackIndex}
            />
          );
        })}
      </animated.group>

      {/* Shadow - one per stack */}
      <group ref={shadowRef}>
        <mesh renderOrder={1} geometry={shadowGeometry} material={shadowMaterial} />
      </group>
    </group>
  );
};

export default R3FStack;
