import { createSelector } from "@reduxjs/toolkit";
import { useMemo } from "react";
import { useSelector } from "react-redux";

const makeGetAttachmentDirections = () => createSelector(
  state => state?.gameUi?.game?.cardById,
  (_, cardIds) => cardIds,
  (cardById, cardIds) => cardIds.map(cardId => cardById[cardId].attachmentDirection)
);

export const useOffsetTotalsAndAmounts = (stackId) => {
    const stack = useSelector(state => state?.gameUi?.game?.stackById[stackId]);
    const lookingUnder = stack?.lookingUnder;
    const cardIds = stack?.cardIds || [];  
    const getAttachmentDirections = useMemo(makeGetAttachmentDirections, []);
    const attachmentDirections = useSelector(state => getAttachmentDirections(state, cardIds));
  
    console.log("Rendering useOffsetTotalsAndAmounts", stackId, attachmentDirections)

    if (!stack) return {offsetTotals: {top: 0, left: 0, right: 0, bottom: 0, behind: 0}, offsetAmounts: [{top: 0, left: 0}]};
    const offsetTotals = {top: 0, left: 0, right: 0, bottom: 0, behind: 0};
    const offsetAmounts = [{top: 0, left: 0}];
    for (var i = 1; i<attachmentDirections.length; i++) {
      const attachmentDirection = attachmentDirections[i];
      if (attachmentDirection === "left") {
        offsetTotals.left++;
        offsetAmounts.push({top: 0, left: -offsetTotals.left});
      } else if (attachmentDirection === "top") {
        offsetTotals.top++;
        offsetAmounts.push({top: -offsetTotals.top, left: 0});
      } else if (attachmentDirection === "bottom") {
        offsetTotals.bottom++;
        offsetAmounts.push({top: offsetTotals.bottom, left: 0});
      } else if (attachmentDirection === "behind") {
        offsetTotals.behind++;
        if (lookingUnder) {
          offsetTotals.bottom += 0.3;
          offsetAmounts.push({top: offsetTotals.bottom, left: 0});
        } else {
          offsetAmounts.push({top: 0, left: 0});
        }
      } else {
        offsetTotals.right++;
        offsetAmounts.push({top: 0, left: offsetTotals.right});
      } 
    }
    // Add the left and top offsetTotals to each offsetAmount
    offsetAmounts.forEach((offsetAmount, index) => {
      offsetAmount.top += offsetTotals.top;
      offsetAmount.left += offsetTotals.left;
    });
    return {offsetTotals, offsetAmounts};
  }
  