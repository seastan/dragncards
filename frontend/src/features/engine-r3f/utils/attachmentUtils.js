/**
 * Attachment utilities for R3F 3D engine
 * Pure functions for attachment zone detection and validation.
 * Mirrors the 2D engine's useHoverStackIdAndDirection.js and DragContainer.js logic.
 */

import store from '../../../store';
import { getVisibleFace } from '../../engine/functions/common';

// Match the 2D engine's COMBINE_REGION_WIDTH_FACTOR
const COMBINE_ZONE_FACTOR = 0.45;

/**
 * Check if a direction is valid for a given region type/direction.
 * Matches the 2D engine's isDirectionValid logic.
 */
const isDirectionValid = (direction, region) => {
  const regionType = region.type;
  const regionDirection = region.direction;

  if ((direction === 'left' || direction === 'right') &&
    ((regionType === 'row' && regionDirection === 'horizontal') ||
      regionType === 'free')) {
    return true;
  }
  if ((direction === 'top' || direction === 'bottom') &&
    ((regionType === 'row' && regionDirection === 'vertical') ||
      regionType === 'free')) {
    return true;
  }
  return false;
};

/**
 * Find which attachment zone the drag position is over.
 *
 * @param {number} dragX - Drag position X (world coords)
 * @param {number} dragZ - Drag position Z (world coords)
 * @param {Array} stackPositions - Array of {stackId, x, z, cardWidth, cardHeight}
 * @param {number} draggingCardWidth - Width of the card being dragged
 * @param {object} region - The target region object
 * @returns {{stackId: string|null, direction: string|null}}
 */
export const findAttachmentTarget = (dragX, dragZ, stackPositions, draggingCardWidth, region) => {
  if (!stackPositions || stackPositions.length === 0) {
    return { stackId: null, direction: null };
  }

  const combineZoneWidth = COMBINE_ZONE_FACTOR * draggingCardWidth;

  for (const sp of stackPositions) {
    const { stackId, x: sx, z: sz, cardWidth: cw, cardHeight: ch } = sp;
    const halfW = cw / 2;
    const halfH = ch / 2;

    // Define the 5 zones (left, right, top, bottom, center) in world coords
    // "left" zone: extends from left edge outward
    const leftZone = {
      minX: sx - halfW - combineZoneWidth,
      maxX: sx - halfW + combineZoneWidth,
      minZ: sz - halfH * 0.5,
      maxZ: sz + halfH * 0.5,
    };

    // "right" zone: extends from right edge outward
    const rightZone = {
      minX: sx + halfW - combineZoneWidth,
      maxX: sx + halfW + combineZoneWidth,
      minZ: sz - halfH * 0.5,
      maxZ: sz + halfH * 0.5,
    };

    // "top" zone: extends from top edge outward (negative Z direction)
    const topZone = {
      minX: sx - halfW - combineZoneWidth,
      maxX: sx + halfW + combineZoneWidth,
      minZ: sz - halfH - halfH * 0.25,
      maxZ: sz - halfH + halfH * 0.25,
    };

    // "bottom" zone: extends from bottom edge outward (positive Z direction)
    const bottomZone = {
      minX: sx - halfW - combineZoneWidth,
      maxX: sx + halfW + combineZoneWidth,
      minZ: sz + halfH - halfH * 0.25,
      maxZ: sz + halfH + halfH * 0.25,
    };

    // Check directional zones first (they take priority over center)
    const inBox = (zone) =>
      dragX >= zone.minX && dragX <= zone.maxX &&
      dragZ >= zone.minZ && dragZ <= zone.maxZ;

    if (isDirectionValid('left', region) && inBox(leftZone)) {
      return { stackId, direction: 'left' };
    }
    if (isDirectionValid('right', region) && inBox(rightZone)) {
      return { stackId, direction: 'right' };
    }
    if (isDirectionValid('top', region) && inBox(topZone)) {
      return { stackId, direction: 'top' };
    }
    if (isDirectionValid('bottom', region) && inBox(bottomZone)) {
      return { stackId, direction: 'bottom' };
    }

    // Center zone: inside the card bounds
    if (dragX >= sx - halfW && dragX <= sx + halfW &&
      dragZ >= sz - halfH && dragZ <= sz + halfH) {
      return { stackId, direction: 'center' };
    }
  }

  return { stackId: null, direction: null };
};

/**
 * Check if attachment is allowed between the dragging stack and target stack.
 * Checks disableDroppableAttachments, canOnlyAttachToTypes, canOnlyHaveAttachmentsOfTypes.
 *
 * @param {string} draggingStackId - Stack being dragged
 * @param {string} targetStackId - Stack being hovered over
 * @param {object} gameDef - Game definition
 * @param {string} playerN - Current player string (e.g., "player1")
 * @param {object} region - Target region
 * @returns {boolean}
 */
// Attachment offset in world units (~50% card width, matches 2D ATTACHMENT_OFFSET)
const ATTACHMENT_OFFSET_3D = 3.5;

/**
 * Compute the local [x, y, z] offset for a card at cardIndexInStack
 * relative to the stack origin (parent card position).
 *
 * @param {number} cardIndexInStack - Index of the card within the stack (0 = parent)
 * @param {object} cardById - Redux cardById map
 * @param {object} stack - Stack object with cardIds array
 * @returns {[number, number, number]} - Local offset [x, y, z]
 */
export const getAttachmentLocalOffset = (cardIndexInStack, cardById, stack) => {
  const stackSize = stack?.cardIds?.length || 1;
  if (cardIndexInStack <= 0) return [0, stackSize * 0.04, 0];

  const stackEdges = { top: 0, left: 0, right: 0, bottom: 0 };
  let offsetX = 0, offsetZ = 0;

  for (let i = 1; i <= cardIndexInStack; i++) {
    const cId = stack.cardIds[i];
    const dir = cardById?.[cId]?.attachmentDirection || 'right';
    if (i < cardIndexInStack) {
      switch (dir) {
        case 'left':   stackEdges.left -= ATTACHMENT_OFFSET_3D; break;
        case 'right':  stackEdges.right += ATTACHMENT_OFFSET_3D; break;
        case 'top':    stackEdges.top -= ATTACHMENT_OFFSET_3D; break;
        case 'bottom': stackEdges.bottom += ATTACHMENT_OFFSET_3D; break;
        default: break;
      }
    } else {
      switch (dir) {
        case 'left':
          offsetX = stackEdges.left - ATTACHMENT_OFFSET_3D;
          break;
        case 'right':
          offsetX = stackEdges.right + ATTACHMENT_OFFSET_3D;
          break;
        case 'top':
          offsetZ = stackEdges.top - ATTACHMENT_OFFSET_3D;
          break;
        case 'bottom':
          offsetZ = stackEdges.bottom + ATTACHMENT_OFFSET_3D;
          break;
        case 'behind':
          break;
        default:
          offsetX = stackEdges.right + ATTACHMENT_OFFSET_3D;
          break;
      }
    }
  }

  return [offsetX, (stackSize - cardIndexInStack) * 0.04, offsetZ];
};

/**
 * Compute the total bounding width and height of a stack including attachment offsets.
 * Returns { width, height } in world units.
 *
 * @param {object} stack - Stack object with cardIds array
 * @param {object} cardById - Redux cardById map
 * @param {number} baseCardWidth - Width of a single card (default 7.14)
 * @param {number} baseCardHeight - Height of a single card (default 10)
 * @returns {{ width: number, height: number }}
 */
export const getStackBounds = (stack, cardById, baseCardWidth = 7.14, baseCardHeight = 10) => {
  if (!stack || !stack.cardIds || stack.cardIds.length <= 1) {
    return { width: baseCardWidth, height: baseCardHeight, parentOffsetX: 0, parentOffsetZ: 0 };
  }

  // Track how far attachments extend in each direction
  const edges = { left: 0, right: 0, top: 0, bottom: 0 };

  for (let i = 1; i < stack.cardIds.length; i++) {
    const cId = stack.cardIds[i];
    const dir = cardById?.[cId]?.attachmentDirection || 'right';
    switch (dir) {
      case 'left':   edges.left -= ATTACHMENT_OFFSET_3D; break;
      case 'right':  edges.right += ATTACHMENT_OFFSET_3D; break;
      case 'top':    edges.top -= ATTACHMENT_OFFSET_3D; break;
      case 'bottom': edges.bottom += ATTACHMENT_OFFSET_3D; break;
      default: break; // 'behind' adds no size
    }
  }

  // The parent card center is NOT at the bounding box center when attachments
  // are asymmetric (e.g., only right attachments). Compute the offset from the
  // bounding box center to the parent card center.
  // Bounding box left edge relative to parent: edges.left - cardWidth/2
  // Bounding box right edge relative to parent: edges.right + cardWidth/2
  // Bounding box center relative to parent: (edges.left + edges.right) / 2
  // So parentOffset = -(edges.left + edges.right) / 2
  return {
    width: baseCardWidth + edges.right - edges.left,
    height: baseCardHeight + edges.bottom - edges.top,
    parentOffsetX: -(edges.left + edges.right) / 2,
    parentOffsetZ: -(edges.top + edges.bottom) / 2,
  };
};

export const isAttachmentAllowed = (draggingStackId, targetStackId, gameDef, playerN, region) => {
  // Check region-level disable
  if (region?.disableDroppableAttachments) {
    return false;
  }

  const game = store.getState()?.gameUi?.game;
  if (!game) return true;

  // Get the top card of the dragging stack
  const draggingStack = game.stackById?.[draggingStackId];
  const draggingCardId = draggingStack?.cardIds?.[0];
  const draggingCard = game.cardById?.[draggingCardId];
  const draggingFace = getVisibleFace(draggingCard, playerN);
  const draggingCardType = draggingFace?.type;

  // Get the top card of the target stack
  const targetStack = game.stackById?.[targetStackId];
  const targetCardId = targetStack?.cardIds?.[0];
  const targetCard = game.cardById?.[targetCardId];
  const targetFace = getVisibleFace(targetCard, playerN);
  const targetCardType = targetFace?.type;

  // Check canOnlyAttachToTypes (dragging card restriction)
  const canOnlyAttachToTypes = gameDef?.cardTypes?.[draggingCardType]?.canOnlyAttachToTypes;
  if (canOnlyAttachToTypes && !canOnlyAttachToTypes.includes(targetCardType)) {
    return false;
  }

  // Check canOnlyHaveAttachmentsOfTypes (target card restriction)
  const canOnlyHaveAttachmentsOfTypes = gameDef?.cardTypes?.[targetCardType]?.canOnlyHaveAttachmentsOfTypes;
  if (canOnlyHaveAttachmentsOfTypes && !canOnlyHaveAttachmentsOfTypes.includes(draggingCardType)) {
    return false;
  }

  return true;
};
