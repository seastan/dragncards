/**
 * PixiJS Drag and Drop System
 *
 * Action dispatch logic adapted from R3FDragSystem.
 * Uses pixel coordinates instead of 3D world coordinates.
 */

import { useCallback } from 'react';
import store from '../../store';
import { parsePercent, pixelToPercent } from './utils/regionUtils';

/**
 * Hook to handle drag operations with the action list system.
 * Mirrors useR3FDragActions from R3FDragSystem.jsx.
 */
export const usePixiDragActions = (doActionList) => {
  const handleDrop = useCallback((dropData) => {
    const {
      stackId,
      sourceGroupId,
      targetGroupId,
      targetRegion,
      positionPx,       // { x, y } in canvas pixels
      tableWidth,
      tableHeight,
      insertionIndex,
      combineStackId,
      combineDirection,
    } = dropData;

    if (!stackId || !targetGroupId) return;

    const game = store.getState()?.gameUi?.game;
    if (!game) return;

    const stack = game.stackById?.[stackId];
    if (!stack) return;

    const cardId = stack.cardIds?.[0];
    const card = game.cardById?.[cardId];
    const cardName = card?.sides?.[card?.currentSide]?.name || 'card';

    const sourceGroup = game.groupById?.[sourceGroupId];
    const targetGroup = game.groupById?.[targetGroupId];

    // --- Combine (attachment) drop ---
    if (combineStackId && combineDirection) {
      const destStack = game.stackById?.[combineStackId];
      const destCardId = destStack?.cardIds?.[0];
      const destCard = game.cardById?.[destCardId];
      const destStackIndex = destCard?.stackIndex ?? 0;

      doActionList([
        ["LOG", "$ALIAS_N", " attached ", cardName, " from ", `$GAME.groupById.${sourceGroupId}.label`, " to ", ["FACEUP_NAME_FROM_STACK_ID", combineStackId], "."],
        ["MOVE_STACK", stackId, targetGroupId, destStackIndex, { "combine": combineDirection, "allowFlip": true }],
      ], `Attached ${cardName}`);
      return;
    }

    // --- Normal move drop ---
    let stackLeft = null;
    let stackTop = null;

    if (targetRegion?.type === 'free' && positionPx && tableWidth && tableHeight) {
      const rLeft = parsePercent(targetRegion.left);
      const rTop = parsePercent(targetRegion.top);
      const rWidth = parsePercent(targetRegion.width);
      const rHeight = parsePercent(targetRegion.height);

      const tablePercent = pixelToPercent(positionPx.x, positionPx.y, tableWidth, tableHeight);

      stackLeft = ((tablePercent.left - rLeft) / rWidth * 100) + '%';
      stackTop = ((tablePercent.top - rTop) / rHeight * 100) + '%';
    }

    let destIndex;
    if (targetRegion?.type === 'pile') {
      destIndex = 0;
    } else if (insertionIndex !== null && insertionIndex !== undefined) {
      destIndex = insertionIndex;
    } else {
      destIndex = targetGroup?.stackIds?.length || 0;
    }

    const actionList = [
      ["LOG", "$ALIAS_N", " moved ", cardName, " from ", `$GAME.groupById.${sourceGroupId}.label`, " to ", `$GAME.groupById.${targetGroupId}.label`, "."],
      ["MOVE_STACK", stackId, targetGroupId, destIndex, { "allowFlip": true }],
    ];

    if (stackLeft !== null && stackTop !== null) {
      actionList.push([
        "COND",
        ["DEFINED", `$GAME.stackById.${stackId}`],
        [
          ["SET", `/stackById/${stackId}/left`, stackLeft],
          ["SET", `/stackById/${stackId}/top`, stackTop],
        ],
      ]);
    }

    doActionList(actionList, `Moved ${cardName} from ${sourceGroup?.label} to ${targetGroup?.label}`);
  }, [doActionList]);

  return { handleDrop };
};
