/**
 * Region calculation utilities for R3F 3D view
 */

import { TABLE_WIDTH, TABLE_HEIGHT } from './cameraUtils';

/**
 * Parse percentage value to a number (0-100 scale)
 * Handles multiple formats:
 * - Number 0-1: 0.5 -> 50
 * - Number > 1: 50 -> 50
 * - String with %: "50%" -> 50
 * - Fraction: "1/2" -> 50
 * @param {number|string} value - Value to parse
 * @returns {number} - Parsed percentage value
 */
export const parsePercent = (value) => {
  if (typeof value === 'number') {
    // If number is between 0 and 1, treat it as a decimal percentage
    if (value >= 0 && value <= 1) {
      return value * 100;
    }
    return value;
  }
  if (typeof value === 'string') {
    // Check for fraction format like "1/2"
    const fractionMatch = value.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const numerator = parseFloat(fractionMatch[1]);
      const denominator = parseFloat(fractionMatch[2]);
      if (denominator === 0) return 0;
      return (numerator / denominator) * 100;
    }
    // Check for percentage format like "50%" or just "50"
    const percentMatch = value.match(/^([\d.]+)%?$/);
    if (percentMatch) return parseFloat(percentMatch[1]);
  }
  return 0;
};

/**
 * Convert 2D percentage position (0-100) to 3D world coordinates
 * Table is centered at origin, with -TABLE_WIDTH/2 to +TABLE_WIDTH/2 on X
 * and -TABLE_HEIGHT/2 to +TABLE_HEIGHT/2 on Z
 * @param {number} leftPercent - Left position as percentage
 * @param {number} topPercent - Top position as percentage
 * @param {number} baseY - Y position (height above table)
 * @returns {[number, number, number]} - World coordinates [x, y, z]
 */
export const percentToWorld = (leftPercent, topPercent, baseY = 0.1) => {
  const x = ((leftPercent / 100) - 0.5) * TABLE_WIDTH;
  const z = ((topPercent / 100) - 0.5) * TABLE_HEIGHT;
  return [x, baseY, z];
};

/**
 * Convert 3D world position to percentage position on table
 * @param {number} x - World X coordinate
 * @param {number} z - World Z coordinate
 * @returns {{left: number, top: number}} - Percentage position
 */
export const worldToPercent = (x, z) => {
  const leftPercent = ((x / TABLE_WIDTH) + 0.5) * 100;
  const topPercent = ((z / TABLE_HEIGHT) + 0.5) * 100;
  return { left: leftPercent, top: topPercent };
};

/**
 * Convert a position within a region to world coordinates
 * Region has its own position and size, stack position is relative to region
 * @param {Object} region - Region definition
 * @param {string} stackLeftPercent - Stack left position within region
 * @param {string} stackTopPercent - Stack top position within region
 * @param {number} baseY - Y position
 * @returns {[number, number, number]} - World coordinates
 */
export const regionToWorld = (region, stackLeftPercent, stackTopPercent, baseY = 0.1) => {
  // Get region bounds in percentages
  const regionLeft = parsePercent(region.left);
  const regionTop = parsePercent(region.top);
  const regionWidth = parsePercent(region.width);
  const regionHeight = parsePercent(region.height);

  // Calculate absolute position on table
  // Stack position is relative to region, so multiply by region size
  const absoluteLeft = regionLeft + (parsePercent(stackLeftPercent) / 100) * regionWidth;
  const absoluteTop = regionTop + (parsePercent(stackTopPercent) / 100) * regionHeight;

  return percentToWorld(absoluteLeft, absoluteTop, baseY);
};

/**
 * Calculate insertion index based on X position for row/fan regions
 * @param {number} dragX - Drag X position in world coordinates
 * @param {Object} region - Region definition
 * @param {number} stackCount - Number of stacks in the region
 * @param {string} regionType - Region type ('row' or 'fan')
 * @returns {number} - Insertion index
 */
export const calculateInsertionIndex = (dragX, region, stackCount, regionType) => {
  if (stackCount === 0) return 0;

  const regionLeft = parsePercent(region.left);
  const regionWidth = parsePercent(region.width);
  const regionWidthWorld = (regionWidth / 100) * TABLE_WIDTH;
  const regionLeftWorld = ((regionLeft / 100) - 0.5) * TABLE_WIDTH;

  const CARD_WIDTH = 6;
  const CARD_HEIGHT = 8.4;

  if (regionType === 'row') {
    const landscapeCardWidth = CARD_HEIGHT;
    const edgePadding = landscapeCardWidth * 0.5;
    const availableWidth = regionWidthWorld - (2 * edgePadding);

    let cardSpacing;
    if (stackCount <= 1) {
      cardSpacing = landscapeCardWidth * 1.02;
    } else {
      cardSpacing = Math.min(availableWidth / (stackCount - 1), landscapeCardWidth * 1.02);
    }

    const startX = regionLeftWorld + edgePadding;
    const relativeX = dragX - startX;

    // Calculate insertion point - add 0.5 to round to nearest slot
    const insertIndex = Math.round(relativeX / cardSpacing);
    return Math.max(0, Math.min(stackCount, insertIndex));
  } else if (regionType === 'fan') {
    const portraitCardWidth = CARD_WIDTH;
    const edgePadding = portraitCardWidth * 0.8;
    const availableWidth = regionWidthWorld - (2 * edgePadding);

    let cardSpacing;
    if (stackCount <= 1) {
      cardSpacing = portraitCardWidth * 0.7;
    } else {
      cardSpacing = Math.min(availableWidth / (stackCount - 1), portraitCardWidth * 0.7);
    }

    const startX = regionLeftWorld + edgePadding;
    const relativeX = dragX - startX;
    const insertIndex = Math.round(relativeX / cardSpacing);
    return Math.max(0, Math.min(stackCount, insertIndex));
  }

  return stackCount; // Default to end
};
