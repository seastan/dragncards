/**
 * Geometry utilities for R3F 3D view
 */

import * as THREE from 'three';

/**
 * Create a rounded rectangle shape for card geometry
 * @param {number} width - Width of the rectangle
 * @param {number} height - Height of the rectangle
 * @param {number} radius - Corner radius
 * @returns {THREE.Shape} - Rounded rectangle shape
 */
export const createRoundedRectShape = (width, height, radius) => {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return shape;
};
