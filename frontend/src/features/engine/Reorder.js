
// A little function to help us with reordering the result
const Reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

export const getGroupIdAndRegionType = (droppableId) => {
  if (!droppableId) return [null, null, null];
  // Split the droppableId to get the groupId and regionType: "groupId--regionType" -> ["groupId", "regionType"]
  const split = droppableId.split("--");
  return split;
};

export const reorderGroupStackIds = (groupById, origGroupId, origIndex, destGroupId, destIndex) => {

  const origGroupStackIds = groupById[origGroupId].stackIds;
  const destGroupStackIds = groupById[destGroupId].stackIds;
  const stack = origGroupStackIds[origIndex];

  // Moving to same list
  if (origGroupId === destGroupId) {
    const reorderedStackIds = Reorder(origGroupStackIds, origIndex, destIndex);
    const newGroupById = {
      ...groupById,
      [origGroupId]: {
        ...groupById[origGroupId],
        stackIds: reorderedStackIds
      }
    };
    return newGroupById;
  }

  // Moving to different list

  // Remove from original
  const newOrigGroupStackIds = Array.from(origGroupStackIds);
  newOrigGroupStackIds.splice(origIndex, 1);
  // Insert into next
  const newDestGroupStackIds = Array.from(destGroupStackIds);
  newDestGroupStackIds.splice(destIndex, 0, stack);

  const newGroupById = {
    ...groupById,
    [origGroupId]: {
      ...groupById[origGroupId],
      stackIds: newOrigGroupStackIds,
    },
    [destGroupId]: {
      ...groupById[destGroupId],
      stackIds: newDestGroupStackIds,
    }
  };

  return newGroupById;
};
