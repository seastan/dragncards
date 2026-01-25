/**
 * R3FCard - Draggable card component for the 3D view
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { useCardTexture } from '../hooks/useCardTexture';
import { createRoundedRectShape } from '../utils/geometry';
import { Token3D } from './R3FToken';

// Global counter to track drag order for z-indexing
let globalDragCounter = 0;

// Minimum distance in pixels the pointer must move before a drag starts
const DRAG_THRESHOLD = 5;

/**
 * DraggableCard - A 3D card that can be dragged around the table
 */
export const DraggableCard = ({
  position = [0, 0, 0],
  color = '#4A5568',
  cardWidth = 6,
  cardHeight = 8.4,
  label = 'Card',
  initialZIndex = 0,
  imageSrc = null,
  rotation = 0, // Card rotation in degrees (0, 90, 180, 270)
  tokens = {}, // Token values like { resource: 3, damage: 1 }
  tokenDefinitions = {}, // Token definitions from game def
  onDragStart = null,
  onDragEnd = null,
  onDragMove = null,
  onClick = null,
  cardId = null,
  onHover = null,
  onHoverEnd = null,
  isActive = false,
  pendingDropPosition = null, // For cross-region drops: where the card was dropped (lifted Y)
}) => {
  const meshRef = useRef();
  const groupRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const [isLifted, setIsLifted] = useState(false); // Keep card scaled up during slide animation
  const [hovered, setHovered] = useState(false);
  const hoveredRef = useRef(false); // Track hovered state for use in event handlers
  const [zIndex, setZIndex] = useState(initialZIndex);
  const dragOffsetRef = useRef({ x: 0, z: 0 });
  const isDraggingRef = useRef(false);

  // For distinguishing click vs drag
  const pointerDownRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const dragStartedRef = useRef(false);

  // Base Y height with zIndex offset to prevent z-fighting
  const baseY = 0.1 + (zIndex * 0.02);
  const currentPosRef = useRef([position[0], baseY, position[2]]);

  // Track target position for smooth animation
  const targetPosRef = useRef([position[0], baseY, position[2]]);

  // Track the position where card was dropped (for smooth animation from drop to final position)
  const dropPositionRef = useRef(null);
  const justDroppedRef = useRef(false);

  // Load texture if imageSrc provided
  const { texture, loading, error } = useCardTexture(imageSrc);

  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const tablePlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  // Spring for scale - only scale up when dragging, not on hover
  const [springProps, springApi] = useSpring(() => ({
    scale: 1,
    config: { tension: 400, friction: 30, clamp: true }
  }));

  // Spring for position - smooth animation when dropping (clamp prevents overshoot)
  // For cross-region drops, initialize at the drop position to avoid jitter
  const [posSpring, posSpringApi] = useSpring(() => ({
    x: pendingDropPosition ? pendingDropPosition[0] : position[0],
    y: pendingDropPosition ? pendingDropPosition[1] : baseY,
    z: pendingDropPosition ? pendingDropPosition[2] : position[2],
    config: { tension: 200, friction: 26, clamp: true }
  }));

  // Spring for rotation - smooth animation when rotation changes (clamp prevents overshoot)
  const [rotSpring, rotSpringApi] = useSpring(() => ({
    rotation: -(rotation * Math.PI) / 180,
    config: { tension: 300, friction: 30, clamp: true }
  }));

  // Update scale on drag or lift state change (not hover)
  useEffect(() => {
    springApi.start({ scale: (isDragging || isLifted) ? 1.1 : 1 });
  }, [isDragging, isLifted, springApi]);

  // Update rotation spring when rotation prop changes
  useEffect(() => {
    const targetRotation = -(rotation * Math.PI) / 180;
    rotSpringApi.start({ rotation: targetRotation });
  }, [rotation, rotSpringApi]);

  // Track if we're waiting for Redux to update position after a drop
  const waitingForPositionUpdateRef = useRef(false);

  // Track if a drop animation is in progress (to prevent interruption)
  const animationInProgressRef = useRef(false);

  // Track if cross-region animation has been initialized (to prevent useFrame from overwriting position)
  const crossRegionInitializedRef = useRef(!pendingDropPosition);

  // Handle cross-region drops: new component mounted with pendingDropPosition
  // Use useLayoutEffect to run synchronously before paint (prevents jitter)
  React.useLayoutEffect(() => {
    if (pendingDropPosition && !animationInProgressRef.current) {
      console.log('→ Cross-region drop: initializing from pendingDropPosition', pendingDropPosition);
      animationInProgressRef.current = true;
      setIsLifted(true);

      const liftedY = pendingDropPosition[1];
      const newBaseY = 0.1 + (zIndex * 0.02);

      // Directly set group position to prevent any jitter before spring takes over
      if (groupRef.current) {
        groupRef.current.position.x = pendingDropPosition[0];
        groupRef.current.position.y = liftedY;
        groupRef.current.position.z = pendingDropPosition[2];
      }

      // Set spring to the drop position (lifted)
      posSpringApi.set({
        x: pendingDropPosition[0],
        y: liftedY,
        z: pendingDropPosition[2],
      });

      // Now that spring is set correctly, allow useFrame to apply spring values
      crossRegionInitializedRef.current = true;

      // Slide to final position while lifted, then drop Y and scale simultaneously
      posSpringApi.start({
        x: position[0],
        y: liftedY,
        z: position[2],
        onRest: () => {
          // Start Y drop and scale reduction at the same time
          setIsLifted(false);
          posSpringApi.start({
            y: newBaseY,
            onRest: () => {
              animationInProgressRef.current = false;
            },
          });
        },
      });
    }
  }, [pendingDropPosition, position[0], position[2], zIndex, posSpringApi]);

  // Update position spring when position prop changes (for when Redux state updates)
  useEffect(() => {
    // Skip if this is a cross-region drop (handled by the other useEffect)
    if (pendingDropPosition) {
      return;
    }

    // Skip if an animation is already in progress
    if (animationInProgressRef.current) {
      return;
    }

    if (!isDraggingRef.current) {
      const newBaseY = 0.1 + (zIndex * 0.02);
      targetPosRef.current = [position[0], newBaseY, position[2]];

      console.log('Position useEffect:', {
        cardId,
        position: [position[0], position[2]],
        zIndex,
        justDropped: justDroppedRef.current,
        waitingForUpdate: waitingForPositionUpdateRef.current,
        dropPosition: dropPositionRef.current,
      });

      // If we just dropped (same-region), we need to wait for Redux to update the position
      if (justDroppedRef.current && dropPositionRef.current) {
        console.log('→ Just dropped, waiting for position update');
        waitingForPositionUpdateRef.current = true;
        justDroppedRef.current = false;

        // Fallback: if position doesn't change (dropped at same index), animate anyway after a short delay
        const savedDropPos = [...dropPositionRef.current];
        const fallbackTimeout = setTimeout(() => {
          if (waitingForPositionUpdateRef.current && !animationInProgressRef.current) {
            console.log('→ Fallback: no position change, sliding back to proper position');
            animationInProgressRef.current = true;
            waitingForPositionUpdateRef.current = false;
            dropPositionRef.current = null;

            // Slide back to proper position while lifted, then drop Y and scale simultaneously
            posSpringApi.start({
              x: position[0],
              y: savedDropPos[1], // Stay lifted during slide
              z: position[2],
              onRest: () => {
                // Start Y drop and scale reduction at the same time
                setIsLifted(false);
                posSpringApi.start({
                  y: newBaseY,
                  onRest: () => {
                    animationInProgressRef.current = false;
                  },
                });
              },
            });
          }
        }, 100);

        return;
      }

      // If we're waiting for position update after a same-region drop
      if (waitingForPositionUpdateRef.current && dropPositionRef.current) {
        // Check if position actually changed from drop position (same-region reorder)
        // If position hasn't changed much, this might be a cross-region drop where
        // the source card should stay frozen until it unmounts
        const dropX = dropPositionRef.current[0];
        const dropZ = dropPositionRef.current[2];
        const positionChanged = Math.abs(position[0] - dropX) > 0.5 || Math.abs(position[2] - dropZ) > 0.5;

        if (!positionChanged) {
          console.log('→ Position unchanged, staying frozen (likely cross-region source card)');
          return;
        }

        console.log('→ Got position update, doing slide-then-drop');
        animationInProgressRef.current = true;
        const liftedY = dropPositionRef.current[1];
        const savedDropPos = [...dropPositionRef.current];
        dropPositionRef.current = null;
        waitingForPositionUpdateRef.current = false;

        // First, immediately set spring to drop position (still lifted)
        posSpringApi.set({
          x: savedDropPos[0],
          y: liftedY,
          z: savedDropPos[2],
        });
        // Slide to final X/Z position while staying lifted, then drop Y and scale simultaneously
        posSpringApi.start({
          x: position[0],
          y: liftedY,
          z: position[2],
          onRest: () => {
            // Start Y drop and scale reduction at the same time
            setIsLifted(false);
            posSpringApi.start({
              y: newBaseY,
              onRest: () => {
                animationInProgressRef.current = false;
              },
            });
          },
        });
      } else if (!waitingForPositionUpdateRef.current) {
        console.log('→ Normal position update');
        posSpringApi.start({
          x: position[0],
          y: newBaseY,
          z: position[2],
        });
      }
    }
  }, [position[0], position[2], zIndex, posSpringApi, pendingDropPosition]);

  const getPointerCoords = (event) => {
    const rect = gl.domElement.getBoundingClientRect();
    let clientX, clientY;
    if (event.touches?.length > 0) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
    else if (event.changedTouches?.length > 0) { clientX = event.changedTouches[0].clientX; clientY = event.changedTouches[0].clientY; }
    else { clientX = event.clientX; clientY = event.clientY; }
    if (clientX === undefined) return null;
    return new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  };

  const handlePointerDown = (event) => {
    event.stopPropagation();

    // Store the initial screen position for threshold detection
    const rect = gl.domElement.getBoundingClientRect();
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

    // Calculate and store the drag offset for when/if drag actually starts
    const coords = getPointerCoords(event);
    if (!coords || !groupRef.current) return;
    raycaster.setFromCamera(coords, camera);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(tablePlane, intersectPoint);
    dragOffsetRef.current = { x: groupRef.current.position.x - intersectPoint.x, z: groupRef.current.position.z - intersectPoint.z };

    if (event.target?.setPointerCapture && event.pointerId !== undefined) {
      event.target.setPointerCapture(event.pointerId);
    }

    // Trigger effect to set up global event listeners
    setPointerIsDown(true);
  };

  // Start the actual drag (called when threshold is exceeded)
  const startDrag = () => {
    if (dragStartedRef.current) return;
    dragStartedRef.current = true;
    isDraggingRef.current = true;
    setIsDragging(true);
    setIsLifted(true); // Keep scaled up through drag and slide animation
    // Stop spring animation during drag
    posSpringApi.stop();

    // Notify about drag start for Trello-style reordering
    if (onDragStart) {
      onDragStart();
    }
  };

  // Track pointer state for setting up global listeners
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

      // Check if we should start dragging (threshold exceeded)
      if (!dragStartedRef.current) {
        const dx = clientX - pointerStartRef.current.x;
        const dy = clientY - pointerStartRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= DRAG_THRESHOLD) {
          startDrag();
        } else {
          // Not yet exceeding threshold, don't move the card
          return;
        }
      }

      // We're now dragging - update position
      const coords = getPointerCoords(event);
      if (!coords) return;
      raycaster.setFromCamera(coords, camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(tablePlane, intersectPoint);

      // Direct position update during drag (no animation)
      groupRef.current.position.x = intersectPoint.x + dragOffsetRef.current.x;
      groupRef.current.position.z = intersectPoint.z + dragOffsetRef.current.z;
      groupRef.current.position.y = 2; // Lift card while dragging

      // Notify about drag position for hover detection
      if (onDragMove) {
        onDragMove([groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z]);
      }
      event.preventDefault();
    };

    const upHandler = (event) => {
      const wasPointerDown = pointerDownRef.current;
      const wasDragging = dragStartedRef.current;

      // Reset pointer state
      pointerDownRef.current = false;
      setPointerIsDown(false);

      // If we weren't dragging, treat as a click
      if (wasPointerDown && !wasDragging) {
        // Prevent the click event that follows from bubbling to Table's click handler
        // which would clear the dropdown menu
        const preventNextClick = (e) => {
          e.stopPropagation();
          canvas.removeEventListener('click', preventNextClick, true);
        };
        canvas.addEventListener('click', preventNextClick, true);
        // Clean up if click doesn't fire within 100ms
        setTimeout(() => canvas.removeEventListener('click', preventNextClick, true), 100);

        if (onClick) {
          onClick(cardId, event);
        }
        return;
      }

      // We were dragging - handle drop
      isDraggingRef.current = false;
      dragStartedRef.current = false;

      // Increment global counter for z-index
      globalDragCounter++;
      const newZIndex = globalDragCounter;
      const newBaseY = 0.1 + (newZIndex * 0.02);

      let finalPosition = null;
      if (groupRef.current) {
        // Store where the card was dropped (current visual position)
        const dropX = groupRef.current.position.x;
        const dropZ = groupRef.current.position.z;
        const liftedY = 2; // Keep card lifted until it slides to final position

        // IMPORTANT: Set refs BEFORE any state changes that trigger re-renders
        dropPositionRef.current = [dropX, liftedY, dropZ];
        justDroppedRef.current = true;
        console.log('Drop handler: set refs', { dropPosition: [dropX, liftedY, dropZ], cardId });

        finalPosition = [dropX, newBaseY, dropZ];
        currentPosRef.current = finalPosition;
        targetPosRef.current = finalPosition;

        // Keep card at lifted position - it will slide then drop when Redux updates
        posSpringApi.set({
          x: dropX,
          y: liftedY,
          z: dropZ,
        });
      }

      // Now trigger state changes (these cause re-renders)
      setIsDragging(false);
      setZIndex(newZIndex);

      // Notify about drag end for drop handling
      if (onDragEnd && finalPosition) {
        onDragEnd(finalPosition);
      }

      // If pointer is still over the card, re-trigger hover to set active state
      if (hoveredRef.current && onHover && cardId) {
        // Small delay to ensure drag state is fully cleared
        setTimeout(() => {
          onHover(cardId, event);
        }, 0);
      }

      document.body.style.cursor = hoveredRef.current ? 'grab' : 'default';
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
  }, [pointerIsDown, camera, gl, raycaster, tablePlane, onDragEnd, onDragMove, posSpringApi, onHover, cardId, onClick]);

  // Update group position from spring when not dragging
  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    if (isDraggingRef.current) {
      // During drag, position is set directly in moveHandler
      return;
    }

    // Skip spring updates if cross-region animation hasn't been initialized yet
    // This prevents jitter where the spring has wrong values on first frame
    if (!crossRegionInitializedRef.current) {
      return;
    }

    // Apply spring position
    groupRef.current.position.x = posSpring.x.get();
    groupRef.current.position.z = posSpring.z.get();

    // Add subtle floating animation when idle
    const springY = posSpring.y.get();
    if (!hovered) {
      groupRef.current.position.y = springY + Math.sin(clock.getElapsedTime() * 0.5) * 0.02;
    } else {
      groupRef.current.position.y = springY;
    }
  });

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);
    hoveredRef.current = true;
    document.body.style.cursor = 'grab';
    if (onHover && cardId) {
      onHover(cardId, e);
    }
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    if (!isDraggingRef.current) {
      setHovered(false);
      hoveredRef.current = false;
      document.body.style.cursor = 'default';
      if (onHoverEnd && cardId) {
        onHoverEnd(cardId);
      }
    }
  };

  // Yellow glow color for active/hovered state - hide during drag
  const showYellowGlow = (hovered || isActive) && !isDragging;

  // Corner radius for rounded cards (proportional to card size)
  const cornerRadius = 0.3;

  // Create rounded rectangle geometry
  const cardGeometry = useMemo(() => {
    const shape = createRoundedRectShape(cardWidth, cardHeight, cornerRadius);
    const geometry = new THREE.ShapeGeometry(shape);
    // Generate UVs for texture mapping
    const pos = geometry.attributes.position;
    const uvs = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uvs.push((x + cardWidth / 2) / cardWidth, (y + cardHeight / 2) / cardHeight);
    }
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return geometry;
  }, [cardWidth, cardHeight, cornerRadius]);

  // Create rounded border geometry for yellow glow
  const borderGeometry = useMemo(() => {
    const shape = createRoundedRectShape(cardWidth + 0.3, cardHeight + 0.3, cornerRadius + 0.1);
    const points = shape.getPoints(32);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [cardWidth, cardHeight, cornerRadius]);

  const outerBorderGeometry = useMemo(() => {
    const shape = createRoundedRectShape(cardWidth + 0.6, cardHeight + 0.6, cornerRadius + 0.2);
    const points = shape.getPoints(32);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [cardWidth, cardHeight, cornerRadius]);

  // Get animated rotation value for the yellow glow (needs current value for non-animated elements)
  const currentRotation = rotSpring.rotation;

  // For cross-region drops, start at the drop position to avoid jitter on first frame
  const initialGroupPosition = pendingDropPosition || position;

  return (
    <group ref={groupRef} position={initialGroupPosition}>
      <animated.mesh
        ref={meshRef}
        scale={springProps.scale}
        rotation={currentRotation.to(r => [-Math.PI / 2, 0, r])}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        geometry={cardGeometry}
      >
        {texture ? (
          <meshBasicMaterial map={texture} side={THREE.DoubleSide} transparent />
        ) : (
          <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.7} metalness={0.1} />
        )}
        {/* Only show label if no texture */}
        {!texture && (
          <Html position={[0, 0.01, 0]} center rotation={[Math.PI / 2, 0, 0]} style={{ pointerEvents: 'none' }} transform>
            <div style={{ color: 'white', fontSize: '16px', fontFamily: 'Arial', fontWeight: 'bold', textShadow: '0 0 5px black', userSelect: 'none' }}>{label}</div>
          </Html>
        )}
      </animated.mesh>

      {/* Tokens rendered as 3D planes that lay flat on the card */}
      <animated.group rotation={currentRotation.to(r => [-Math.PI / 2, 0, r])} position={[0, 0.15, 0]}>
        {Object.entries(tokens).map(([tokenType, tokenValue]) => {
          if (!tokenValue || tokenValue === 0) return null;
          const tokenDef = tokenDefinitions[tokenType];
          if (!tokenDef) return null;

          const parsePercent = (value) => {
            if (typeof value === 'string' && value.endsWith('%')) {
              return parseFloat(value) / 100;
            }
            return parseFloat(value) / 100;
          };

          const leftPercent = parsePercent(tokenDef.left || '50%');
          const topPercent = parsePercent(tokenDef.top || '50%');
          const tokenWidthPercent = parsePercent(tokenDef.width || '15%');
          const tokenHeightPercent = parsePercent(tokenDef.height || '15%');

          // Position in card's local space (XY plane)
          const localX = (leftPercent + tokenWidthPercent / 2 - 0.33) * cardWidth;
          const localY = (0.39 - topPercent - tokenHeightPercent / 2) * cardHeight;

          // Token size relative to card
          const tokenSize = cardWidth * tokenWidthPercent * 8;

          let displayLabel = tokenValue;
          if (tokenDef.modifier) displayLabel = '+' + tokenValue;
          if (tokenValue === 1 && tokenDef.hideLabel1) displayLabel = '';

          return (
            <Token3D
              key={tokenType}
              position={[localX, localY, 0.01]}
              size={tokenSize}
              imageUrl={tokenDef.imageUrl}
              label={displayLabel}
            />
          );
        })}
      </animated.group>

      {/* Yellow border when hovered or active - rendered as rounded line loop */}
      {showYellowGlow && (
        <animated.group rotation={currentRotation.to(r => [-Math.PI / 2, 0, r])} position={[0, 0.05, 0]}>
          {/* Outer glow - slightly larger, more transparent */}
          <line geometry={outerBorderGeometry}>
            <lineBasicMaterial color="#FFD700" transparent opacity={0.4} linewidth={3} />
          </line>
          {/* Inner border - card edge */}
          <line geometry={borderGeometry}>
            <lineBasicMaterial color="#FFD700" transparent opacity={0.9} linewidth={2} />
          </line>
        </animated.group>
      )}
    </group>
  );
};

export default DraggableCard;
