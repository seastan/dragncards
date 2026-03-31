/**
 * Perspective coordinate utilities for the PixiJS engine.
 *
 * The PixiJS canvas sits inside a CSS `rotateX(tiltDeg)` + `perspective(perspectivePx)`
 * wrapper. This creates a genuine perspective projection but breaks the default
 * mapping PixiJS uses to convert DOM pointer events (clientX/Y) to canvas coordinates.
 *
 * These utilities compute the exact inverse of the CSS perspective-rotateX transform
 * so that pointer events land on the correct canvas pixel.
 *
 * Sign convention: CSS rotateX(+θ) tilts the BOTTOM of the element toward the
 * viewer (positive Z), making the bottom appear larger. For a card-game table
 * viewed at ~80° from horizontal, tiltDeg = 10 (10° from vertical = 80° from horizontal).
 */

/**
 * Convert a CSS screen-space pointer position to PixiJS canvas-space coordinates.
 *
 * @param {number} clientX      - DOM clientX
 * @param {number} clientY      - DOM clientY
 * @param {DOMRect} canvasRect  - getBoundingClientRect() of the PixiJS canvas element
 * @param {number} tiltDeg      - CSS rotateX angle in degrees (10 = 80° view)
 * @param {number} perspPx      - CSS perspective value in pixels
 * @param {number} [canvasCssW] - Actual canvas CSS width before transform (= Stage width prop)
 * @param {number} [canvasCssH] - Actual canvas CSS height before transform (= Stage height prop)
 * @returns {{ x: number, y: number }} Canvas-space coordinates in CSS pixels
 *
 * Why canvasCssW/H are needed:
 *   After rotateX(θ), getBoundingClientRect() returns an ASYMMETRIC bounding box.
 *   The bottom edge (closer to viewer) extends further in screen space than the top,
 *   so the bounding rect center is below the actual projected canvas center.
 *   Similarly, the bounding rect width is wider than the canvas CSS width because
 *   the bottom corners (closer) are scaled out further than the top corners.
 *   Using the raw bounding rect values causes hover/drag positions to drift down
 *   and to the right at non-zero tilt angles.
 */
export const screenToCanvas = (clientX, clientY, canvasRect, tiltDeg, perspPx, canvasCssW = null, canvasCssH = null) => {
  if (tiltDeg === 0) {
    // No tilt — simple rect-relative mapping
    return {
      x: clientX - canvasRect.left,
      y: clientY - canvasRect.top,
    };
  }

  const theta = (tiltDeg * Math.PI) / 180;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const P = perspPx;

  // Use actual canvas CSS dimensions when provided.
  // Fallback: derive from bounding rect (small error due to perspective distortion).
  const W = canvasCssW ?? canvasRect.width;
  const H = canvasCssH ?? (canvasRect.height / cosT);

  // Exact screen-space position of the projected canvas center (= CSS perspective origin).
  //
  // After rotateX(θ) + perspective(P), the canvas top edge (y = -H/2) projects to:
  //   y_screen = -H/2 * cosT * P / (P + H/2 * sinT)   [above center]
  // So the bounding rect top is at (projected_center - topHalfExtent), giving:
  //   projected_center_Y = canvasRect.top + topHalfExtent
  //
  // For X: the bounding rect IS x-symmetric around the projected center, so the
  // bounding rect midpoint is correct.
  const topHalfExtent = (H / 2) * cosT * P / (P + (H / 2) * sinT);
  const screenCenterX = canvasRect.left + canvasRect.width / 2;
  const screenCenterY = canvasRect.top + topHalfExtent;

  // Pointer position relative to projected canvas center
  const sx = clientX - screenCenterX;
  const sy = clientY - screenCenterY;

  // Inverse of the perspective-rotateX projection:
  //   screen_x = u * P / (P - v*sinT)
  //   screen_y = v * cosT * P / (P - v*sinT)
  // Solution:
  //   denom = cosT*P + sy*sinT
  //   v = sy * P / denom
  //   u = sx * cosT * P / denom  (derived from substituting v back into screen_x)
  const denom = cosT * P + sy * sinT;
  const u = Math.abs(denom) > 0.001 ? (sx * cosT * P) / denom : sx;
  const v = Math.abs(denom) > 0.001 ? (sy * P) / denom : sy;

  return {
    x: W / 2 + u,
    y: H / 2 + v,
  };
};

/**
 * CSS style objects for the two perspective wrapper divs.
 * Put `outerStyle` on the outer container and `innerStyle` on the div
 * that directly contains the PixiJS <Stage> canvas.
 */
export const getPerspectiveStyles = (tiltDeg, perspPx) => ({
  outerStyle: {
    width: '100%',
    height: '100%',
    perspective: `${perspPx}px`,
    perspectiveOrigin: '50% 50%',
    overflow: 'hidden',
  },
  innerStyle: {
    width: '100%',
    height: '100%',
    transform: `rotateX(${tiltDeg}deg)`,
    transformOrigin: '50% 50%',
    transformStyle: 'preserve-3d',
  },
});
