import { createSelector } from "@reduxjs/toolkit";
import { useMemo } from "react";
import { useSelector, shallowEqual } from "react-redux";
import { useLayout } from "./useLayout";
import { ATTACHMENT_OFFSET } from "../functions/common";
import { useCardScaleFactor } from "./useCardScaleFactor";

// Generalized selector factory to get specific properties of cards
const makeGetStackCardProperties = (property) => createSelector(
  state => state?.gameUi?.game?.cardById,
  (_, cardIds) => cardIds,
  (cardById, cardIds) => cardIds.map(cardId => cardById[cardId]?.[property])
);
// Generalized selector factory to get specific properties of cards
const makeGetStackFaceProperties = (property) => createSelector(
  state => state?.gameUi?.game?.cardById,
  (_, cardIds) => cardIds,
  (cardById, cardIds) => cardIds.map(cardId => {
    const card = cardById[cardId];
    const currentSide = card?.currentSide;
    return card?.sides?.[currentSide]?.[property];
  })
);

export const useOffsetTotalsAndAmounts = (stackId) => {
  // Selector to get the stack by its id
  const stack = useSelector(state => state?.gameUi?.game?.stackById[stackId], shallowEqual);
  const cardIds = stack?.cardIds || [];
  const lookingUnder = stack?.lookingUnder;
  const layout = useLayout();
  const cardScaleFactor = useCardScaleFactor();
  // Memoize the selector factory

  // Memoize the selector factory with the specified property
  const getAttachmentDirections = useMemo(() => makeGetStackCardProperties("attachmentDirection"), []);
  const attachmentDirections = useSelector(state => getAttachmentDirections(state, cardIds), shallowEqual);

  const getCardWidths = useMemo(() => makeGetStackFaceProperties("width"), []);
  const cardWidths = useSelector(state => getCardWidths(state, cardIds), shallowEqual);

  const getCardHeights = useMemo(() => makeGetStackFaceProperties("height"), []);
  const cardHeights = useSelector(state => getCardHeights(state, cardIds), shallowEqual);

  console.log("Rendering useOffsetTotalsAndAmounts", stackId, attachmentDirections, cardWidths);

  if (!stack) return { 
    offsetTotals: { top: 0, left: 0, right: 0, bottom: 0, behind: 0 }, 
    offsetAmounts: [{ top: 0, left: 0 }],
    stackEdges: { top: 0, left: 0, right: 0, bottom: 0 }
  };
  
  const offsetTotals = { top: 0, left: 0, right: 0, bottom: 0, behind: 0 };
  const offsetAmounts = [{ top: 0, left: 0 }];
  const stackEdges = { top: 0, left: 0, right: cardWidths[0]*cardScaleFactor, bottom: cardHeights[0]*cardScaleFactor };
  
  for (let i = 1; i < attachmentDirections.length; i++) {
    const attachmentDirection = attachmentDirections[i];
    const currentWidth = cardWidths[i]*cardScaleFactor;
    const currentHeight = cardHeights[i]*cardScaleFactor;
    if (attachmentDirection === "left") {
      const left = stackEdges.left - ATTACHMENT_OFFSET;
      offsetAmounts.push({ top: 0, left: left });
      stackEdges.left -= ATTACHMENT_OFFSET;
      offsetTotals.left++;
    } else if (attachmentDirection === "top") {
      const top = stackEdges.top - ATTACHMENT_OFFSET;
      offsetAmounts.push({ top: top, left: 0 });
      stackEdges.top -= ATTACHMENT_OFFSET;
      offsetTotals.top++;
    } else if (attachmentDirection === "bottom") {
      const top = stackEdges.bottom - currentHeight + ATTACHMENT_OFFSET;
      offsetAmounts.push({ top: top, left: 0 });
      stackEdges.bottom += ATTACHMENT_OFFSET;
      offsetTotals.bottom++;
    } else if (attachmentDirection === "behind") {
      offsetTotals.behind++;
      if (lookingUnder) {
        const top = stackEdges.bottom - currentHeight + 0.5*ATTACHMENT_OFFSET;
        offsetAmounts.push({ top: top, left: 0 });
        stackEdges.bottom += 0.5*ATTACHMENT_OFFSET;
        offsetTotals.bottom++;
      } else {
        offsetAmounts.push({ top: 0, left: 0 });
      }
    } else {
      const left = stackEdges.right - currentWidth + ATTACHMENT_OFFSET;
      offsetAmounts.push({ top: 0, left: left });
      stackEdges.right += ATTACHMENT_OFFSET;
      offsetTotals.right++;
    }
  }

  // Add the left and top offsetTotals to each offsetAmount
  offsetAmounts.forEach((offsetAmount, index) => {
    offsetAmount.top -= stackEdges.top;
    offsetAmount.left -= stackEdges.left;
  });
  console.log("Returning offsetTotals", offsetTotals, offsetAmounts, stackEdges)
  return { offsetTotals, offsetAmounts, stackEdges };
}
