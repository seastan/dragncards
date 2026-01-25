/**
 * Camera utilities for R3F 3D view
 */

export const DEFAULT_CAMERA_ANGLE = 80;
export const MIN_CAMERA_ANGLE = 20;
export const MAX_CAMERA_ANGLE = 90;
export const TABLE_WIDTH = 100;
export const TABLE_HEIGHT = 100 * (9/16);

/**
 * Calculate camera position based on angle and zoom
 * @param {number} angleDegrees - Camera angle in degrees (20-90)
 * @param {number} zoomPercent - Zoom percentage (100 = normal, 200 = closer, 25 = farther)
 * @returns {[number, number, number]} - Camera position [x, y, z]
 */
export const getCameraPosition = (angleDegrees, zoomPercent = 100) => {
  const radians = (angleDegrees * Math.PI) / 180;
  const baseHeight = 80;
  // Zoom: 100% = normal, 200% = half distance (closer), 25% = 4x distance (farther)
  const zoomFactor = 100 / zoomPercent;
  const height = baseHeight * zoomFactor;
  const zOffset = height / Math.tan(radians);
  return [0, height, zOffset];
};
