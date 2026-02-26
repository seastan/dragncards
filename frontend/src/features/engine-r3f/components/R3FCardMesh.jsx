/**
 * R3FCardMesh - Visual-only card component for the 3D view
 *
 * Handles card geometry, materials, flip animation, rotation, opacity,
 * tokens, glow, and link indicator. Has NO drag logic — receives
 * onPointerDownForDrag from the parent R3FStack.
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { useCardTexture } from '../hooks/useCardTexture';
import { createRoundedRectShape } from '../utils/geometry';
import { Token3D } from './R3FToken';

// Cache the last stable texture per card so cross-region remounts can show
// the old face during the flip animation
const lastTextureByCard = new Map();

/**
 * R3FLinkIndicator - Shows a circular link icon at the edge of a card
 * indicating where an attachment will be placed.
 */
const R3FLinkIndicator = ({ direction, cardWidth, cardHeight, rotation }) => {
  const halfW = cardWidth / 2;
  const halfH = cardHeight / 2;
  const indicatorSize = 4.0;
  const yOffset = 0.3;

  let posX = 0, posZ = 0;
  switch (direction) {
    case 'left':   posX = -halfW; break;
    case 'right':  posX = halfW; break;
    case 'top':    posZ = -halfH; break;
    case 'bottom': posZ = halfH; break;
    case 'center': break;
    default: break;
  }

  return (
    <animated.group
      rotation={rotation.to(r => [-Math.PI / 2, 0, r])}
      position={[0, yOffset, 0]}
    >
      <group position={[posX, -posZ, 0.01]}>
        <mesh>
          <circleGeometry args={[indicatorSize / 2, 32]} />
          <meshBasicMaterial
            color="#d1d5db"
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <lineLoop>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={33}
              array={(() => {
                const pts = new Float32Array(33 * 3);
                for (let i = 0; i <= 32; i++) {
                  const angle = (i / 32) * Math.PI * 2;
                  pts[i * 3] = Math.cos(angle) * (indicatorSize / 2);
                  pts[i * 3 + 1] = Math.sin(angle) * (indicatorSize / 2);
                  pts[i * 3 + 2] = 0;
                }
                return pts;
              })()}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#374151" linewidth={2} />
        </lineLoop>
        <Html
          center
          style={{ pointerEvents: 'none' }}
          zIndexRange={[0, 0]}
        >
          <div style={{
            fontSize: '36px',
            color: '#374151',
            userSelect: 'none',
            lineHeight: 1,
          }}>
            🔗
          </div>
        </Html>
      </group>
    </animated.group>
  );
};

/**
 * R3FCardMesh - Visual card rendering with flip, rotation, glow, tokens
 */
export const R3FCardMesh = ({
  cardId,
  localPosition = [0, 0, 0],
  cardIndexInStack = 0,
  baseZIndex = 0,
  imageSrc = null,
  color = '#4A5568',
  label = 'Card',
  rotation = 0,
  currentSide = null,
  previousSide = null,
  tokens = {},
  tokenDefinitions = {},
  isActive = false,
  isDragging = false,
  cardWidth = 7.14,
  cardHeight = 10,
  isAttachmentHover = false,
  attachmentIndicatorDirection = null,
  onClick = null,
  onHover = null,
  onHoverEnd = null,
  onPointerDownForDrag = null,
  stackIndex = 0,
}) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const hoveredRef = useRef(false);

  // Flip animation refs
  const flipGroupRef = useRef();
  const flipLiftGroupRef = useRef(); // Lifts card during flip to prevent table clipping
  const prevTextureRef = useRef(null);
  const isFlipPendingRef = useRef(false); // true while a flip is queued or in progress
  const prevCurrentSideRef = useRef(
    (previousSide != null && previousSide !== currentSide) ? previousSide : currentSide
  );
  const flipAxisVec = useMemo(() => new THREE.Vector3(), []);

  // Load texture
  const { texture } = useCardTexture(imageSrc);

  // Spring for rotation
  const [rotSpring, rotSpringApi] = useSpring(() => ({
    rotation: -(rotation * Math.PI) / 180,
    config: { tension: 300, friction: 30, clamp: true }
  }));

  // Spring for flip animation progress (0 -> 1)
  const [flipSpring, flipSpringApi] = useSpring(() => ({
    progress: 0,
    config: { duration: 250 }
  }));

  // Spring for opacity (1.0 normal, 0.4 when attachment-hovering)
  const [opacitySpring, opacitySpringApi] = useSpring(() => ({
    opacity: 1.0,
    config: { tension: 300, friction: 26 }
  }));

  // Drive opacity from isAttachmentHover prop
  useEffect(() => {
    opacitySpringApi.start({ opacity: isAttachmentHover ? 0.4 : 1.0 });
  }, [isAttachmentHover, opacitySpringApi]);

  // Detect side change and start flip animation
  useEffect(() => {
    if (prevCurrentSideRef.current === null) {
      prevCurrentSideRef.current = currentSide;
      return;
    }
    if (currentSide !== prevCurrentSideRef.current) {
      prevTextureRef.current = lastTextureByCard.get(cardId) || texture;
      prevCurrentSideRef.current = currentSide;
      isFlipPendingRef.current = true;
      flipSpringApi.set({ progress: 0 });
      flipSpringApi.start({
        progress: 1,
        delay: stackIndex * 10,
        onRest: () => { isFlipPendingRef.current = false; },
      });
    }
  }, [currentSide]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update rotation spring when rotation prop changes
  useEffect(() => {
    const targetRotation = -(rotation * Math.PI) / 180;
    rotSpringApi.start({ rotation: targetRotation });
  }, [rotation, rotSpringApi]);

  // Per-card useFrame: flip animation, opacity uniform, stencil write, texture swap
  useFrame(() => {
    // Flip animation
    const fp = flipSpring.progress.get();
    const isFlipping = fp > 0.001 && fp < 0.999;
    if (flipGroupRef.current) {
      if (isFlipping) {
        const cardRot = rotSpring.rotation.get();
        flipAxisVec.set(-Math.sin(cardRot), 0, -Math.cos(cardRot));
        flipGroupRef.current.quaternion.setFromAxisAngle(flipAxisVec, fp * Math.PI);
        // Lift the card during flip so edges don't clip through the table.
        // At 90° the bottom edge extends cardWidth/2 below center; sin curve
        // peaks at the midpoint to match.
        if (flipLiftGroupRef.current) {
          flipLiftGroupRef.current.position.y = Math.sin(fp * Math.PI) * (cardWidth / 2);
        }
      } else {
        flipGroupRef.current.quaternion.identity();
        if (flipLiftGroupRef.current) {
          flipLiftGroupRef.current.position.y = 0;
        }
      }
    }

    // Update two-sided material textures.
    // Use isFlipPendingRef (not isFlipping) so the old face is held during the
    // delay period (fp=0 but animation hasn't started yet) as well as mid-flip.
    if (meshRef.current?.material?.uniforms?.mapFront) {
      if (isFlipPendingRef.current) {
        meshRef.current.material.uniforms.mapFront.value = prevTextureRef.current;
        meshRef.current.material.uniforms.mapBack.value = isFlipping ? texture : prevTextureRef.current;
      } else {
        meshRef.current.material.uniforms.mapFront.value = texture;
        meshRef.current.material.uniforms.mapBack.value = texture;
        if (texture && cardId) {
          lastTextureByCard.set(cardId, texture);
        }
      }
    }

    // Update card opacity from spring
    if (meshRef.current?.material?.uniforms?.opacity) {
      const curOpacity = opacitySpring.opacity.get();
      meshRef.current.material.uniforms.opacity.value = curOpacity;
      meshRef.current.material.transparent = curOpacity < 0.99;
    }

    // Write stencil=1 so the stack's shadow doesn't draw on top of this card
    if (meshRef.current && meshRef.current.material) {
      const cardOpacity = opacitySpring.opacity.get();
      const isSemiTransparent = cardOpacity < 0.95;
      const mat = meshRef.current.material;
      // Shadow visibility is controlled by the parent stack, but we always
      // write stencil when not semi-transparent to be safe
      mat.stencilWrite = !isSemiTransparent;
      mat.stencilRef = 1;
      mat.stencilFunc = THREE.AlwaysStencilFunc;
      mat.stencilZPass = THREE.ReplaceStencilOp;
      mat.stencilFail = THREE.KeepStencilOp;
      mat.stencilZFail = THREE.KeepStencilOp;
    }
  });

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);
    hoveredRef.current = true;
    document.body.style.cursor = cardIndexInStack === 0 ? 'grab' : 'pointer';
    if (onHover && cardId) {
      onHover(cardId, e);
    }
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setHovered(false);
    hoveredRef.current = false;
    document.body.style.cursor = 'default';
    if (onHoverEnd && cardId) {
      onHoverEnd(cardId);
    }
  };

  const handlePointerDown = (e) => {
    if (onPointerDownForDrag) {
      onPointerDownForDrag(e);
    }
    // Attachment cards (no drag handler): click is handled via handleMeshClick
  };

  // Click handler for all cards.
  // For parent cards (idx=0), R3FStack's upHandler detects pointer-up-without-drag
  // and allows R3F's onClick to bubble through to this handler.
  // For attachment cards, onClick fires directly from R3F's event system.
  const handleMeshClick = (e) => {
    if (onClick) {
      e.stopPropagation();
      onClick(cardId, e);
    }
  };

  // Yellow glow color for active/hovered state - hide during drag
  const showYellowGlow = (hovered || isActive) && !isDragging;

  const cornerRadius = 0.3;

  const cardGeometry = useMemo(() => {
    const shape = createRoundedRectShape(cardWidth, cardHeight, cornerRadius);
    const geometry = new THREE.ShapeGeometry(shape);
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

        float sdRoundedRect(vec2 p, vec2 b, float r) {
          vec2 q = abs(p) - b + vec2(r);
          return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        }

        void main() {
          float d = sdRoundedRect(vPos, halfSize, radius);
          if (d < 0.0) discard;
          if (d > glowDist) discard;
          float t = 1.0 - d / glowDist;
          float alpha = t * t * 0.8;
          gl_FragColor = vec4(glowColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [cardWidth, cardHeight, cornerRadius, glowWidth]);

  // Two-sided card material
  const flipCardMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        mapFront: { value: null },
        mapBack: { value: null },
        opacity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D mapFront;
        uniform sampler2D mapBack;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          vec4 color;
          if (gl_FrontFacing) {
            color = texture2D(mapFront, vUv);
          } else {
            color = texture2D(mapBack, vec2(1.0 - vUv.x, vUv.y));
          }
          color.a *= opacity;
          gl_FragColor = color;
          #include <colorspace_fragment>
        }
      `,
      transparent: false,
      side: THREE.DoubleSide,
    });
  }, []);

  const currentRotation = rotSpring.rotation;

  return (
    <group position={localPosition}>
      <group ref={flipLiftGroupRef}>
      <group ref={flipGroupRef}>
        <animated.mesh
          ref={meshRef}
          renderOrder={baseZIndex}
          rotation={currentRotation.to(r => [-Math.PI / 2, 0, r])}
          onPointerDown={handlePointerDown}
          onClick={handleMeshClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          geometry={cardGeometry}
        >
          {texture ? (
            <primitive object={flipCardMaterial} attach="material" />
          ) : (
            <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.7} metalness={0.1} />
          )}
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

            const localX = (leftPercent + tokenWidthPercent / 2 - 0.33) * cardWidth;
            const localY = (0.39 - topPercent - tokenHeightPercent / 2) * cardHeight;
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

        {/* Attachment link indicator */}
        {attachmentIndicatorDirection && (
          <R3FLinkIndicator
            direction={attachmentIndicatorDirection}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            rotation={currentRotation}
          />
        )}
      </group>
      </group>
    </group>
  );
};

export default R3FCardMesh;
