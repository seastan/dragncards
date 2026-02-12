import React, { useMemo } from "react";
import { ArcherElement } from "react-archer";
import { useSelector } from "react-redux";
import { getPlayerIColor } from "./functions/common";

const getArrowColor = (playerI) => {
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
  const cardArrows = useSelector(state => state?.gameUi?.game?.cardById[cardId]?.arrows);

  const arrowRelations = useMemo(() => {
    const relations = [];
    Object.entries(cardArrows).forEach(([playerI, playerIArrows]) => {
      for (const destCardId of playerIArrows) {
        relations.push({
          targetId: "arrow-" + destCardId,
          targetAnchor: 'middle',
          sourceAnchor: 'bottom',
          style: {
            strokeColor: getArrowColor(playerI),
            strokeOpacity: 0.5
          }
        });
      }
    });
    return relations;
  }, [cardArrows]);

  if (hideArrows) return null;

  return (
    <ArcherElement
      id={"arrow-" + cardId}
      relations={arrowRelations}
    >
      <div style={arrowDivStyle} />
    </ArcherElement>
  );
});
