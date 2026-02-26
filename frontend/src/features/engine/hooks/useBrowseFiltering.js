import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useGameDefinition } from "./useGameDefinition";
import { getParentCardsInGroup } from "../functions/common";

const isNormalInteger = (val) => {
  var n = Math.floor(Number(val));
  return n !== Infinity && n === val && n >= 0;
}

export const useBrowseFiltering = () => {
  const [searchForProperty, setSearchForProperty] = useState('All');
  const [searchForText, setSearchForText] = useState('');
  const gameDef = useGameDefinition();
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const groupId = useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.browseGroup?.id);
  const browseGroupTopN = useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.browseGroup?.topN);
  const game = useSelector(state => state?.gameUi?.game);
  const group = useSelector(state => state?.gameUi?.game?.groupById?.[groupId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stackIds = group?.stackIds || [];
  const numStacks = stackIds.length;
  const parentCards = getParentCardsInGroup(game, groupId);

  const filteredStackIndices = useMemo(() => {
    // If browseGroupTopN not set, or equal to "All" or "None", show all stacks
    var browseGroupTopNint = isNormalInteger(browseGroupTopN) ? parseInt(browseGroupTopN) : numStacks;
    if (browseGroupTopNint < 0) browseGroupTopNint = numStacks;
    if (browseGroupTopNint > numStacks) browseGroupTopNint = numStacks;
    var indices = [...Array(browseGroupTopNint).keys()];

    // Filter by selected card type
    if (searchForProperty === "Other") {
      indices = indices.filter((stackIndex) => {
        const stackId = stackIds[stackIndex];
        const propertyValue = parentCards[stackIndex]?.sides?.A?.[gameDef?.browse?.filterPropertySideA];
        const isValueOther = !gameDef?.browse?.filterValuesSideA?.includes(propertyValue);
        const isPeekingOrCurrentSideA = (
          parentCards[stackIndex]?.peeking?.[playerN] ||
          parentCards[stackIndex]?.currentSide === "A"
        );
        return stackId && isPeekingOrCurrentSideA && isValueOther;
      });
    } else if (searchForProperty !== "All") {
      indices = indices.filter((stackIndex) => (
        stackIds[stackIndex] &&
        parentCards[stackIndex]?.sides?.A?.[gameDef?.browse?.filterPropertySideA] === searchForProperty &&
        (parentCards[stackIndex]?.peeking?.[playerN] || parentCards[stackIndex]?.currentSide === "A")
      ));
    }

    if (searchForText) {
      const properties = gameDef?.browse?.textPropertiesSideA || [];
      indices = indices.filter((stackIndex) => {
        const stackId = stackIds[stackIndex];
        const card = parentCards[stackIndex]?.sides?.A;
        const isCardMatching = properties.some((prop) =>
          card?.[prop]?.toLowerCase().includes(searchForText.toLowerCase())
        );
        const isPeekingOrCurrentSideA = (
          parentCards[stackIndex]?.peeking?.[playerN] ||
          parentCards[stackIndex]?.currentSide === "A"
        );
        return stackId && isCardMatching && isPeekingOrCurrentSideA;
      });
    }

    return indices;
  }, [browseGroupTopN, numStacks, stackIds, parentCards, searchForProperty, searchForText, gameDef, playerN]);

  const resetFilters = () => {
    setSearchForProperty('All');
    setSearchForText('');
  };

  return {
    filteredStackIndices,
    searchForProperty,
    setSearchForProperty,
    searchForText,
    setSearchForText,
    resetFilters,
  };
};
