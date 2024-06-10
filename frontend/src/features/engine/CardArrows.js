import React, { useMemo } from "react";
import { ArcherElement } from "react-archer";
import { useSelector } from "react-redux";
import { getPlayerIColor } from "./functions/common";

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
  left: '50%'
};

export const CardArrows = React.memo(({ cardId }) => {
  const cardArrows = useSelector(state => state?.gameUi?.game?.cardById[cardId]?.arrows);


  const arrowElements = useMemo(() => {
    const arrowRelations = [];
    Object.entries(cardArrows).map(([playerI, playerIArrows]) => {
      for (var destCardId of playerIArrows) {
        arrowRelations.push({
          targetId: "arrow-" + destCardId,
          targetAnchor: 'middle',
          sourceAnchor: 'bottom',
          style: {
            strokeColor: getArrowColor(playerI),
            strokeOpacity: 0.5,
          }
        });
      }
    });
    console.log("Arrow relations", arrowRelations);
    return (
      <ArcherElement
        id={"arrow-" + cardId}
        relations={arrowRelations}
      >
        <div style={arrowDivStyle} />
      </ArcherElement>
    );
  }, [cardArrows, cardId]);

  return <>{arrowElements}</>;
});
