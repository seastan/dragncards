/**
 * PixiCardSprite - Visual card component for the PixiJS view.
 *
 * Renders a card as a textured Sprite. Handles:
 *   - Texture loading and display
 *   - Rotation (tap/exhaust)
 *   - Flip animation (scale-X trick: 1 → 0 → swap texture → 0 → 1)
 *   - Glow on hover/active
 *   - Shadow sprite
 *   - Scale-up during drag
 *   - Pointer events (hover, click, drag start)
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Sprite, Graphics, Container } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useCardTexture } from '../hooks/useCardTexture';

// Animation duration constants
const FLIP_DURATION = 250; // ms

/**
 * PixiCardSprite - Renders a single card as a PixiJS sprite.
 */
const PixiCardSpriteInner = ({
  cardId,
  x,
  y,
  cardWidth,
  cardHeight,
  imageSrc,
  backImageSrc,
  rotation = 0,        // in degrees, matches game state
  currentSide,
  previousSide,
  isActive = false,
  isDragging = false,
  isAttachmentHover = false,
  cardIndexInStack = 0,
  onPointerDown,
  onPointerUp,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const { texture: frontTex } = useCardTexture(imageSrc);

  // Flip state
  const [flipScaleX, setFlipScaleX] = useState(1);
  const [displayTexture, setDisplayTexture] = useState(null);
  const prevSideRef = useRef(currentSide);
  const rafRef = useRef(null);

  // Track when texture changes
  useEffect(() => {
    setDisplayTexture(frontTex);
  }, [frontTex]);

  // Trigger flip when side changes
  useEffect(() => {
    if (prevSideRef.current !== currentSide && prevSideRef.current !== undefined) {
      triggerFlip();
    }
    prevSideRef.current = currentSide;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSide]);

  const triggerFlip = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startTime = performance.now();
    let swapped = false;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / FLIP_DURATION, 1);

      // Scale X: 1 → 0 (first half), 0 → 1 (second half)
      let scaleX;
      if (progress < 0.5) {
        scaleX = 1 - progress * 2;
      } else {
        if (!swapped) {
          swapped = true;
          setDisplayTexture(prev => prev); // texture already updated by useEffect above
        }
        scaleX = (progress - 0.5) * 2;
      }

      setFlipScaleX(scaleX);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setFlipScaleX(1);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Rounded corner mask — recreated when card dimensions change
  const cardFaceRef = useRef(null);
  const roundedMask = useMemo(() => {
    const g = new PIXI.Graphics();
    const r = cardWidth * 0.04;
    g.beginFill(0xffffff);
    g.drawRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, r);
    g.endFill();
    return g;
  }, [cardWidth, cardHeight]);

  useEffect(() => {
    const container = cardFaceRef.current;
    if (!container) return;
    container.addChild(roundedMask);
    container.mask = roundedMask;
    return () => {
      if (container) {
        container.removeChild(roundedMask);
        container.mask = null;
      }
      if (!roundedMask.destroyed) {
        roundedMask.destroy();
      }
    };
  }, [roundedMask]);

  // Visual adjustments
  const scale = isDragging ? 1.08 : 1;
  const alpha = isAttachmentHover ? 0.4 : 1;
  const rotationRad = (rotation * Math.PI) / 180;

  // Glow: draw a yellow rectangle slightly larger than the card when active
  const drawGlow = useCallback((g) => {
    g.clear();
    if (!isActive && !isDragging) return;
    const glowColor = isDragging ? 0x88bbff : 0xFFD700;
    const glowAlpha = 0.35;
    const pad = cardWidth * 0.04;
    g.lineStyle(0);
    g.beginFill(glowColor, glowAlpha);
    g.drawRoundedRect(
      -cardWidth / 2 - pad,
      -cardHeight / 2 - pad,
      cardWidth + pad * 2,
      cardHeight + pad * 2,
      cardWidth * 0.06
    );
    g.endFill();
  }, [isActive, isDragging, cardWidth, cardHeight]);

  // Shadow: only shown while dragging — gaussian-blurred card shape beneath
  const drawShadow = useCallback((g) => {
    g.clear();
    if (!isDragging) {
      g.filters = null;
      return;
    }
    const offsetY = cardHeight * 0.08;
    const blur = cardWidth * 0.07;
    const r = cardWidth * 0.04;
    g.lineStyle(0);
    g.beginFill(0x000000, 0.55);
    g.drawRoundedRect(-cardWidth / 2, -cardHeight / 2 + offsetY, cardWidth, cardHeight, r);
    g.endFill();
    if (!g.filters || g.filters.length === 0) {
      g.filters = [new PIXI.filters.BlurFilter(blur, 8)];
    } else {
      g.filters[0].blur = blur;
    }
  }, [isDragging, cardWidth, cardHeight]);

  const zIndex = (cardIndexInStack * 2) + (isDragging ? 1000 : 0);

  return (
    <Container
      x={x}
      y={y}
      rotation={rotationRad}
      zIndex={zIndex}
      sortableChildren={false}
      alpha={alpha}
      scale={{ x: scale * flipScaleX, y: scale }}
      interactive={true}
      cursor={isDragging ? 'grabbing' : 'grab'}
      onpointerdown={onPointerDown}
      onpointerup={onPointerUp}
      onpointerover={onPointerOver}
      onpointerout={onPointerOut}
      onclick={onClick}
    >
      {/* Shadow */}
      <Graphics draw={drawShadow} zIndex={-1} />

      {/* Glow */}
      <Graphics draw={drawGlow} zIndex={0} />

      {/* Card face with rounded-corner mask */}
      <Container ref={cardFaceRef} zIndex={1}>
        <Sprite
          texture={displayTexture || PIXI.Texture.WHITE}
          width={cardWidth}
          height={cardHeight}
          anchor={{ x: 0.5, y: 0.5 }}
          roundPixels={true}
        />
      </Container>
    </Container>
  );
};

export const PixiCardSprite = React.memo(PixiCardSpriteInner);
export default PixiCardSprite;
