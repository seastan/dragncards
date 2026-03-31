/**
 * Region calculation utilities for Pixi 2D view.
 * Coordinate system: top-left origin, x right, y down — pixel space.
 */

// Ratio of the card's longer dimension relative to table height.
// Matches R3F: BASE_CARD_SIZE (10) / TABLE_HEIGHT (56.25) ≈ 0.1778
export const CARD_SIZE_RATIO = 10 / (100 * (9 / 16));

/**
 * Parse percentage value to a number (0-100 scale)
 */
export const parsePercent = (value) => {
  if (typeof value === 'number') {
    if (value >= 0 && value <= 1) return value * 100;
    return value;
  }
  if (typeof value === 'string') {
    const fractionMatch = value.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const n = parseFloat(fractionMatch[1]);
      const d = parseFloat(fractionMatch[2]);
      return d === 0 ? 0 : (n / d) * 100;
    }
    const percentMatch = value.match(/^([\d.]+)%?$/);
    if (percentMatch) return parseFloat(percentMatch[1]);
  }
  return 0;
};

/** Convert percentage (0-100) to pixel position. */
export const percentToPixel = (leftPercent, topPercent, tw, th) => ({
  x: (leftPercent / 100) * tw,
  y: (topPercent / 100) * th,
});

/** Convert pixel position back to percentage (0-100). */
export const pixelToPercent = (x, y, tw, th) => ({
  left: (x / tw) * 100,
  top: (y / th) * 100,
});

/** Convert a stack's left/top (region-relative %) to canvas pixels. */
export const regionToPixel = (region, stackLeftPercent, stackTopPercent, tw, th) => {
  const rLeft = parsePercent(region.left);
  const rTop = parsePercent(region.top);
  const rWidth = parsePercent(region.width);
  const rHeight = parsePercent(region.height);
  const absLeft = rLeft + (parsePercent(stackLeftPercent) / 100) * rWidth;
  const absTop = rTop + (parsePercent(stackTopPercent) / 100) * rHeight;
  return percentToPixel(absLeft, absTop, tw, th);
};

/** Get region bounding box in pixels. */
export const getRegionBounds = (region, tw, th) => {
  const left = parsePercent(region.left);
  const top = parsePercent(region.top);
  const width = parsePercent(region.width);
  const height = parsePercent(region.height);
  return {
    x: (left / 100) * tw,
    y: (top / 100) * th,
    w: (width / 100) * tw,
    h: (height / 100) * th,
  };
};

/** Check if a pixel point is inside a region. */
export const isPointInRegion = (px, py, region, tw, th) => {
  const b = getRegionBounds(region, tw, th);
  return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
};

/**
 * Base card size in pixels given canvas height.
 * Matches R3F BASE_CARD_SIZE relative to TABLE_HEIGHT.
 */
export const getBaseCardSize = (canvasHeight) => canvasHeight * CARD_SIZE_RATIO;

/**
 * Calculate card dimensions in pixels from card side metadata.
 */
export const getCardDimsPx = (sideData, canvasHeight) => {
  const base = getBaseCardSize(canvasHeight);
  const rawW = sideData?.width;
  const rawH = sideData?.height;
  const aspect = rawW && rawH ? rawW / rawH : 0.714;
  const landscape = aspect > 1;
  return {
    cardWidth: landscape ? base : base * aspect,
    cardHeight: landscape ? base / aspect : base,
    aspect,
  };
};

/**
 * Calculate insertion index for row/fan regions.
 * Adapted from R3F regionUtils — uses pixel coords instead of world coords.
 */
export const calculateInsertionIndex = (dragX, dragY, region, stackCount, tw, th) => {
  if (stackCount === 0) return 0;
  const isVertical = region.direction === 'vertical';
  const b = getRegionBounds(region, tw, th);
  const baseCardPx = getBaseCardSize(th);
  const CARD_WIDTH = baseCardPx * 0.714;
  const CARD_HEIGHT = baseCardPx;
  const LANDSCAPE_W = CARD_HEIGHT;

  if (region.type === 'row') {
    const edgePad = LANDSCAPE_W * 0.5;
    if (isVertical) {
      const available = b.h - 2 * edgePad;
      const spacing = stackCount <= 1 ? LANDSCAPE_W : Math.min(available / (stackCount - 1), LANDSCAPE_W * 1.02);
      const rel = dragY - (b.y + edgePad);
      return Math.max(0, Math.min(stackCount, Math.round(rel / spacing)));
    } else {
      const available = b.w - 2 * edgePad;
      const spacing = stackCount <= 1 ? LANDSCAPE_W : Math.min(available / (stackCount - 1), LANDSCAPE_W * 1.02);
      const rel = dragX - (b.x + edgePad);
      return Math.max(0, Math.min(stackCount, Math.round(rel / spacing)));
    }
  }

  if (region.type === 'fan') {
    const edgePad = CARD_WIDTH * 0.8;
    if (isVertical) {
      const available = b.h - 2 * edgePad;
      const spacing = stackCount <= 1 ? CARD_WIDTH * 0.7 : Math.min(available / (stackCount - 1), CARD_WIDTH * 0.7);
      const rel = dragY - (b.y + edgePad);
      return Math.max(0, Math.min(stackCount, Math.round(rel / spacing)));
    } else {
      const available = b.w - 2 * edgePad;
      const spacing = stackCount <= 1 ? CARD_WIDTH * 0.7 : Math.min(available / (stackCount - 1), CARD_WIDTH * 0.7);
      const rel = dragX - (b.x + edgePad);
      return Math.max(0, Math.min(stackCount, Math.round(rel / spacing)));
    }
  }

  return stackCount;
};
