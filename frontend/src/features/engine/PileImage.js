/* The image shown for a pile of cards during  drag over*/

import React from "react";
import styled from "@emotion/styled";
import { useSelector } from 'react-redux';
import useProfile from "../../hooks/useProfile";
import { useCardScaleFactor } from "./hooks/useCardScaleFactor";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { getFirstCardOffset, getVisibleFace, getVisibleFaceSrc } from "./functions/common";
import { Card } from "./Card";
import { DropZone } from "./DroppableRegion";
import { StackContainerSorted } from "./StackDraggable";

// Template for the returned element
const ImageElement = styled.div`
  background: url(${props => props.src}) no-repeat scroll 0% 0% / contain;
  borderRadius: 0.6dvh;
  borderColor: transparent;
  position: absolute;
  width: ${props => props.width}dvh;
  height: ${props => props.height}dvh;
  left: ${props => props.leftOffset}dvh;
  top: 50%;
  transform: translate(0%,-50%);
`;

// Returns an ImageElement or null
export const PileImage = React.memo(({
  region,
  stackIds,
  isDraggingFrom,
}) => {
  // Hooks
  const user = useProfile();
  const gameDef = useGameDefinition();
  const stack0 = useSelector(state => state?.gameUi?.game?.stackById?.[stackIds?.[0]]);
  const stack1 = useSelector(state => state?.gameUi?.game?.stackById?.[stackIds?.[1]]);
  const card0 = useSelector(state => state?.gameUi?.game?.cardById?.[stack0?.cardIds?.[0]]);
  const card1 = useSelector(state => state?.gameUi?.game?.cardById?.[stack1?.cardIds?.[0]]);  
  const playerN = useSelector(state => state?.playerUi?.playerN);

  const cardScaleFactor = useCardScaleFactor();
  const regionCardSizeFactor = region?.cardSizeFactor || 1;
  const zoomFactor = useSelector(state => state?.playerUi?.userSettings?.zoomPercent)/100 * regionCardSizeFactor;

  // If group is not a pile, then no PileImage should be generated
  if (region.type !== "pile") return null;
  // Calculate the card to show based on whether the card being dragged came from this group or another group
  const getCardToShow = (groupSize, isDraggingFrom) => {
    if (groupSize > 0 && !isDraggingFrom) {
      // && isDraggingOver && !isDraggingFrom) {
      return card0; // The card is being dragged from another group onto this one, so show the top card
    } else if (groupSize>1 && isDraggingFrom) {
      return card1; // The card being dragged is from this group, so show the second card from the top
    }
    return null;
  }

  
  // Get the card to show
  const cardToShow = getCardToShow(stackIds.length, isDraggingFrom);
  console.log("Rendering PileImage 2", region, stackIds, cardToShow);

  if (cardToShow === null || cardToShow === undefined) return null;

  // Get the proper image source to display based on the particular user viewing the card
  // (some player might actively be peeking at the card)
  const visibleFace = getVisibleFace(cardToShow, playerN);
  const visibleFaceSrc = getVisibleFaceSrc(visibleFace, user, gameDef)

  console.log("Rendering PileImage 3", region, stackIds, visibleFace, visibleFaceSrc);

  // If there is no card to show, then the pile is empty, so we should not show anything
  if (!visibleFaceSrc) return null;

  console.log("Rendering PileImage 4", region, stackIds, visibleFaceSrc);

  // Calculate properties of the ImageElement
  const stackHeight = visibleFace?.height * cardScaleFactor;
  const stackWidth = visibleFace?.width * cardScaleFactor;

  return(
    <DropZone direction={"vertical"}>
      <StackContainerSorted
        stackWidth={stackWidth}
        stackHeight={stackHeight}>
          <div
            style={{
              transform: `scale(${zoomFactor})`,
            }}
          >
            <Card
              key={cardToShow.id}
              offset={0}
              cardId={cardToShow.id} 
              isDragging={false}
            />
          </div>
      </StackContainerSorted>
    </DropZone>
    )
  //return( <ImageElement width={cardWidth} height={cardHeight} leftOffset={leftOffset} src={visibleFaceSrc.src}/> );
})