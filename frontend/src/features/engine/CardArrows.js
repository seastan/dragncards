import React, { useEffect, useMemo } from "react";
import { ArcherElement } from "react-archer";
import { useDispatch, useSelector } from "react-redux";
import { getPlayerIColor } from "./functions/common";
import { setValues } from "../store/gameUiSlice";

const getArrowColor = (playerI) => {
  // If not present in colorMap, return grey
  const baseColor = getPlayerIColor(playerI);
  return baseColor.replace(")", ",0.6)");
}

const arrowDivStyle = {
  position: 'relative',
  width: '0px',
  height: '0px',
  top: '50%',
  left: '50%',  
};

export const CardArrows = React.memo(({ cardId, hideArrows }) => {
  const dispatch = useDispatch();
  const cardArrows = useSelector(state => state?.gameUi?.game?.cardById[cardId]?.arrows);

  const currentMinute = new Date().getMinutes();

  // useEffect(() => {
  //   const updates = [["game", "cardById", cardId, "arrows", {...cardArrows}]];
  //   dispatch(setValues({updates: updates}));
  // }, [stack.left, stack.top, resources]);

  console.log("Rendering CardArrows", cardId, cardArrows);
  const arrowElements = useMemo(() => {
    const arrowRelations = [];
    Object.entries(cardArrows).map(([playerI, playerIArrows]) => {
      for (var destCardId of playerIArrows) {
        arrowRelations.push({
          targetId: "arrow-" + destCardId + "-" + currentMinute,
          targetAnchor: 'middle',
          sourceAnchor: 'bottom',
          style: {
            strokeColor: getArrowColor(playerI),
            strokeOpacity: 0.5
          }
        });
      }
    });
    console.log("CardArrow relations", cardId, arrowRelations);
    return (
      <ArcherElement
        id={"arrow-" + cardId + "-" + currentMinute}
        relations={arrowRelations}
      >
        <div style={arrowDivStyle} />
      </ArcherElement>
    );
  }, [cardArrows, cardId]);

  if (hideArrows) return null;

  return <>{arrowElements}</>;
});
