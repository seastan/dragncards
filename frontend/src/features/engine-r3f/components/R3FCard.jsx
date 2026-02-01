/**
 * R3FCard - Draggable card component for the 3D view
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
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
  cardWidth = 7.14,
  cardHeight = 10,
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
  const shadowRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const [isLifted, setIsLifted] = useState(false); // Keep card scaled up during slide animation
  const [hovered, setHovered] = useState(false);
  const hoveredRef = useRef(false); // Track hovered state for use in event handlers
  const [zIndex, setZIndex] = useState(initialZIndex);
  const dragOffsetRef = useRef({ x: 0, z: 0 });
  const isDraggingRef = useRef(false);

  // DEBUG: frame-by-frame logging around drop events
  const debugLogFramesRef = useRef(0); // counts down frames to log
  const debugTagRef = useRef(''); // 'source' or 'target'

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

  // Set max anisotropic filtering on texture for sharper rendering
  // useEffect(() => {
  //   if (texture && gl) {
  //     const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
  //     texture.anisotropy = maxAnisotropy;
  //     texture.needsUpdate = true;
  //   }
  // }, [texture, gl]);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const tablePlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  // Spring for scale - only scale up when dragging, not on hover
  // For cross-region drops, start at 1.1 to match the source card's lifted scale
  const [springProps, springApi] = useSpring(() => ({
    scale: pendingDropPosition ? 1.1 : 1,
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

  // DEBUG: log unmount
  useEffect(() => {
    return () => {
      const y = groupRef.current?.position?.y;
      const vis = groupRef.current?.visible;
      console.log(`[DEBUG:unmount:${cardId}] Y=${y?.toFixed(3)}, visible=${vis}`);
    };
  }, []);

  // Handle cross-region drops: new component mounted with pendingDropPosition
  // Use useLayoutEffect to run synchronously before paint (prevents jitter)
  React.useLayoutEffect(() => {
    if (pendingDropPosition && !animationInProgressRef.current) {
      animationInProgressRef.current = true;
      setIsLifted(true);

      const liftedY = pendingDropPosition[1];
      const newBaseY = 0.1 + (zIndex * 0.02);

      console.log(`[DEBUG:target:${cardId}] useLayoutEffect: setting position Y=${liftedY}, visible=true`);
      debugTagRef.current = 'target';
      debugLogFramesRef.current = 30;

      // Directly set group position to prevent any jitter before spring takes over
      if (groupRef.current) {
        groupRef.current.position.x = pendingDropPosition[0];
        groupRef.current.position.y = liftedY;
        groupRef.current.position.z = pendingDropPosition[2];
        // Show the group now that position and spring are correctly set.
        // It was hidden in the ref callback to prevent any flash.
        groupRef.current.visible = true;
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

        // Activate frame logging for the source card
        debugTagRef.current = 'source';
        debugLogFramesRef.current = 30;
        console.log(`[DEBUG:source:${cardId}] drop: spring set Y=${liftedY}, pos Y=${groupRef.current.position.y}`);

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
  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;

    // DEBUG: log frame-by-frame state for 30 frames after drop
    if (debugLogFramesRef.current > 0) {
      const tag = debugTagRef.current;
      const f = 31 - debugLogFramesRef.current;
      console.log(
        `[DEBUG:${tag}:${cardId}] frame ${f}: Y=${groupRef.current.position.y.toFixed(3)}, ` +
        `visible=${groupRef.current.visible}, isDragging=${isDraggingRef.current}, ` +
        `crossRegInit=${crossRegionInitializedRef.current}, springY=${posSpring.y.get().toFixed(3)}, ` +
        `scale=${meshRef.current?.scale?.x?.toFixed(2) || '?'}`
      );
      debugLogFramesRef.current--;
    }

    if (!isDraggingRef.current && crossRegionInitializedRef.current) {
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
    }

    // Write stencil=1 whenever the shadow has any visible opacity so the
    // shadow can't draw on top of its own card. This avoids timing gaps
    // between isLifted turning false and the shadow finishing its fade-out.
    if (meshRef.current && meshRef.current.material) {
      const shadowVisible = shadowMaterial.uniforms.opacity.value > 0.01;
      const mat = meshRef.current.material;
      mat.stencilWrite = shadowVisible;
      mat.stencilRef = 1;
      mat.stencilFunc = THREE.AlwaysStencilFunc;
      mat.stencilZPass = THREE.ReplaceStencilOp;
      mat.stencilFail = THREE.KeepStencilOp;
      mat.stencilZFail = THREE.KeepStencilOp;
    }

    // Update shadow
    if (shadowRef.current && shadowMaterial.uniforms) {
      const groupY = groupRef.current.position.y;

      // Pin shadow to the table surface: offset local Y so world Y ≈ 0.05
      shadowRef.current.position.y = -groupY + 0.05;

      // Match card rotation (lay flat via X rotation, card yaw via Z)
      const cardRot = rotSpring.rotation.get();
      shadowRef.current.rotation.set(-Math.PI / 2, 0, cardRot);

      const lifted = isDragging || isLifted;
      const targetOpacity = lifted ? 0.65 : 0.0;
      const currentOpacity = shadowMaterial.uniforms.opacity.value;
      // Smooth fade in/out
      const fadeSpeed = lifted ? 8 : 5;
      shadowMaterial.uniforms.opacity.value += (targetOpacity - currentOpacity) * Math.min(delta * fadeSpeed, 1);

      // Height-based softness: higher card = softer, larger shadow
      const height = Math.max(0, groupY);
      const baseSoftness = 0.6;
      const heightSoftness = baseSoftness + height * 0.25;
      shadowMaterial.uniforms.shadowSoftness.value = heightSoftness;

      // Slight scale increase with height
      const shadowScale = 1.0 + height * 0.04;
      shadowRef.current.scale.set(shadowScale, shadowScale, 1);
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

  // Glow: use a simple plane with SDF-based fragment shader for pixel-perfect gradient
  const glowWidth = 0.8;
  const glowGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(cardWidth + glowWidth * 2, cardHeight + glowWidth * 2);
  }, [cardWidth, cardHeight]);

  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color('#FFD700') },
        halfSize: { value: new THREE.Vector2(cardWidth / 2, cardHeight / 2) },
        radius: { value: cornerRadius },
        glowDist: { value: glowWidth },
      },
      vertexShader: `
        varying vec2 vPos;
        void main() {
          // Pass local XY position to fragment shader
          vPos = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform vec2 halfSize;
        uniform float radius;
        uniform float glowDist;
        varying vec2 vPos;

        // Signed distance to a rounded rectangle centered at origin
        float sdRoundedRect(vec2 p, vec2 b, float r) {
          vec2 q = abs(p) - b + vec2(r);
          return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        }

        void main() {
          float d = sdRoundedRect(vPos, halfSize, radius);

          // Inside the card: fully transparent
          if (d < 0.0) discard;

          // Outside the glow range: fully transparent
          if (d > glowDist) discard;

          // Gradient: 1 at card edge, 0 at outer edge
          float t = 1.0 - d / glowDist;
          float alpha = t * t * 0.8; // Quadratic falloff
          gl_FragColor = vec4(glowColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [cardWidth, cardHeight, cornerRadius, glowWidth]);

  // Shadow: SDF-based rounded-rect shadow that stays pinned to the table surface
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
      // Only draw where the lifted card hasn't written stencil=1.
      // stencilWrite must be true to enable stencil testing; all ops are Keep
      // so the shadow doesn't actually modify the stencil buffer.
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.KeepStencilOp,
      stencilZFail: THREE.KeepStencilOp,
      stencilZPass: THREE.KeepStencilOp,
    });
  }, [cardWidth, cardHeight, cornerRadius]);

  // Get animated rotation value for the yellow glow (needs current value for non-animated elements)
  const currentRotation = rotSpring.rotation;

  // Don't pass a position prop to the group. R3F reconciles position props
  // against the actual Three.js state every render — if useFrame has set Y=2
  // (lifted) but the prop says Y=baseY, R3F resets Y to baseY for one frame.
  // Instead, set the initial position imperatively via the ref callback, and
  // let useFrame / useLayoutEffect handle all subsequent updates.
  const groupRefCallback = useCallback((el) => {
    groupRef.current = el;
    if (el && !el.userData._positionInitialized) {
      const initPos = pendingDropPosition || position;
      el.position.set(initPos[0], initPos[1], initPos[2]);
      el.userData._positionInitialized = true;
      // Hide the group for cross-region drops until useLayoutEffect has set
      // up the position and spring. This prevents any one-frame flash where
      // the card might appear at the wrong position before animation begins.
      if (pendingDropPosition) {
        el.visible = false;
        console.log(`[DEBUG:target:${cardId}] refCallback: pos Y=${initPos[1]}, visible=false`);
      } else {
        console.log(`[DEBUG:normal:${cardId}] refCallback: pos Y=${initPos[1]}, visible=true`);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group ref={groupRefCallback}>
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
          <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
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

      {/* Yellow gradient glow when hovered or active */}
      {showYellowGlow && (
        <animated.group rotation={currentRotation.to(r => [-Math.PI / 2, 0, r])} position={[0, 0.02, 0]}>
          <mesh geometry={glowGeometry} material={glowMaterial} />
        </animated.group>
      )}

      {/* Shadow pinned to table surface — renderOrder=1 ensures it draws
           after region backgrounds (renderOrder=0) so the shadow isn't
           washed out by transparent-sort flipping */}
      <group ref={shadowRef}>
        <mesh renderOrder={1} geometry={shadowGeometry} material={shadowMaterial} />
      </group>
    </group>
  );
};

export default DraggableCard;
