import { COMBINE_REGION_WIDTH_FACTOR } from "../functions/common";
import { useGetRegionFromId } from "./useGetRegionFromId";

const isXYinBox = (x, y, boxX, boxY, boxWidth, boxHeight) => {
  return (x >= boxX && x <= boxX + boxWidth && y >= boxY && y <= boxY + boxHeight);
}

const isDirectionValid = (direction, region) => {
  const regionType = region.type;
  const regionDirection = region.direction;
  if ((direction === "left" || direction === "right") && 
    (
      (regionType === "row" && regionDirection === "horizontal") ||
      regionType === "free")
    ) return true;
  if ((direction === "top" || direction === "bottom") &&
    (
      (regionType === "row" && regionDirection === "vertical") ||
      regionType === "free")
    ) return true;
  return false;
}

export const useHoverStackIdAndDirection = () => {
  const getRegionFromId = useGetRegionFromId();
  
  return (mouseCurrentX, mouseCurrentY, draggingRectangle, stackRectangles, groupRectangle, droppableId) => {
      
    const region = getRegionFromId(droppableId);

    if (!stackRectangles || stackRectangles.length === 0 || !groupRectangle) {
      return {stackId: null, direction: null};
    }
    
    for (let i = 0; i < stackRectangles.length; i++) {
      const stackRectangle = stackRectangles[i];
      const combineRegionWidth = COMBINE_REGION_WIDTH_FACTOR*draggingRectangle.width;
      const leftRectangle = {
        left: stackRectangle.left - combineRegionWidth,
        top: stackRectangle.top + 0.25*stackRectangle.height,
        width: combineRegionWidth*2,
        height: 0.5*stackRectangle.height
      }
      const rightRectangle = {
        left: stackRectangle.left + stackRectangle.width - combineRegionWidth,
        top: stackRectangle.top + 0.25*stackRectangle.height,
        width: combineRegionWidth*2,
        height: 0.5*stackRectangle.height
      }
      const topRectangle = {
        left: stackRectangle.left - combineRegionWidth,
        top: stackRectangle.top - 0.25*stackRectangle.height,
        width: combineRegionWidth*2 + stackRectangle.width,
        height: 0.5*stackRectangle.height
      }
      const bottomRectangle = {
        left: stackRectangle.left - combineRegionWidth,
        top: stackRectangle.top + stackRectangle.height - 0.25*stackRectangle.height,
        width: combineRegionWidth*2 + stackRectangle.width,
        height: 0.5*stackRectangle.height
      }
      const isInsideStack = isXYinBox(mouseCurrentX, mouseCurrentY, stackRectangle.left, stackRectangle.top, stackRectangle.width, stackRectangle.height);
      const isInsideLeft = isDirectionValid("left", region) && isXYinBox(mouseCurrentX, mouseCurrentY, leftRectangle.left, leftRectangle.top, leftRectangle.width, leftRectangle.height);
      const isInsideRight = isDirectionValid("right", region) && isXYinBox(mouseCurrentX, mouseCurrentY, rightRectangle.left, rightRectangle.top, rightRectangle.width, rightRectangle.height);
      const isInsideTop = isDirectionValid("top", region) && isXYinBox(mouseCurrentX, mouseCurrentY, topRectangle.left, topRectangle.top, topRectangle.width, topRectangle.height);
      const isInsideBottom = isDirectionValid("bottom", region) && isXYinBox(mouseCurrentX, mouseCurrentY, bottomRectangle.left, bottomRectangle.top, bottomRectangle.width, bottomRectangle.height);


      console.log("Checking stackRectangle", {isInsideStack, isInsideLeft, isInsideRight, isInsideTop, isInsideBottom});
      if (isInsideLeft) {
        return {stackId: stackRectangle.stackId, direction: "left"};
      } else if (isInsideRight) {
        return {stackId: stackRectangle.stackId, direction: "right"};
      } else if (isInsideTop) {
        return {stackId: stackRectangle.stackId, direction: "top"};
      } else if (isInsideBottom) {
        return {stackId: stackRectangle.stackId, direction: "bottom"};
      } else if (isInsideStack) {
        return {stackId: stackRectangle.stackId, direction: "center"};
      }
    }
    return {stackId: null, direction: null};
  }
}