import React, { useState } from "react";
import { useSelector } from 'react-redux';
import { Card } from "./Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp, faChevronDown, faEye, faLink } from "@fortawesome/free-solid-svg-icons";
import { useOffsetTotalsAndAmounts } from "./hooks/useOffsetTotalsAndAmounts";
import { DEFAULT_CARD_Z_INDEX } from "./functions/common";
import { useDoActionList } from "./hooks/useDoActionList";

const lookUnderActionList = (stackId) => {
  return ([
    ["LOG", "{{$ALIAS_N}} fanned out the cards under ", ["FACEUP_NAME_FROM_STACK_ID", stackId], "."],
    ["SET", `/stackById/${stackId}/lookingUnder`, true]
  ])
}

const hideUnderActionList = (stackId) => {
  return ([
    ["LOG", "{{$ALIAS_N}} hid the cards under ", ["FACEUP_NAME_FROM_STACK_ID", stackId], "."],
    ["SET", `/stackById/${stackId}/lookingUnder`, false]
  ])
}

//left: ${props => props.left || 0}vh;
// background: ${props => (props.hidden) ? "red" : "blue"};
  // display: ${props => (props.hidden) ? "none" : "flex"};

export const Stack = React.memo(({
  stackId,
  isDragging,
  stackZoomFactor
}) => {
  const stack = useSelector(state => state?.gameUi?.game?.stackById[stackId]);
  const isHoveredOver = useSelector(state => state?.playerUi?.dragging.hoverOverStackId === stackId);
  const hoverOverDirection = useSelector(state => isHoveredOver ? state?.playerUi?.dragging.hoverOverDirection : null);
  const [showingUnder, setShowingUnder] = useState(stack?.lookingUnder);
  const doActionList = useDoActionList();
  console.log('Rendering StackId ', isHoveredOver, hoverOverDirection)
  const cardIds = stack?.cardIds;

  const {offsetTotals, offsetAmounts} = useOffsetTotalsAndAmounts(stackId);
  if (!stack) return null;

  const numBehind = offsetTotals.behind;

  const handleShowUnder = () => {
    if (showingUnder) {
      console.log("Hiding Under", hideUnderActionList(stackId));
      doActionList(hideUnderActionList(stackId));
    } else {
      console.log("Looking Under", lookUnderActionList(stackId));
      doActionList(lookUnderActionList(stackId));
    }
    setShowingUnder(!showingUnder);
  }

  return(
    <div 
      style={{
        transform: `scale(${stackZoomFactor})`,
      }}
    >
      {isHoveredOver && hoverOverDirection == "top" && <LinkIcon top="0" left="0" width="100%" height="6vh"  transform="translate(0%, -50%)"/>}
      {isHoveredOver && hoverOverDirection == "left" && <LinkIcon top="0" left="0" width="6vh"  height="100%" transform="translate(-50%, 0%)"/>}
      {isHoveredOver && hoverOverDirection == "right" && <LinkIcon top="0" left="100%" width="6vh"  height="100%" transform="translate(-50%, 0%)"/>}
      {isHoveredOver && hoverOverDirection == "bottom" && <LinkIcon top="100%" left="0" width="100%" height="6vh"  transform="translate(0%, -50%)"/>}
      {cardIds.map((cardId, cardIndex) => {
        return(
          <Card
            key={cardId}
            offset={offsetAmounts[cardIndex]}
            cardId={cardId}
            cardIndexFromGui={cardIndex}
            isDragging={(cardIndex === cardIds.length - 1) ? isDragging : false}
          />
        )
      })}
      {numBehind > 0 &&
        <div
          className="flex items-center justify-center"
          style={{
            position: "absolute", 
            height: "3vh",
            top: "calc(100% - 3vh)",
            zIndex: DEFAULT_CARD_Z_INDEX,
            opacity: 0.85,
          }}>
            <div
              className={"flex bg-gray-500 rounded p-0.5 px-1 hover:bg-gray-400 cursor-default text-white"}
              onClick={() => handleShowUnder()}
            >
              <div
                className="flex items-center justify-center"
              >
                {numBehind}
              </div>
              <div
                className="flex items-center justify-center pl-1"
              >
                <FontAwesomeIcon icon={showingUnder ? faArrowUp : faArrowDown}/> 
              </div>
            </div>
        </div>
      }
    </div>
  );
});

const LinkIcon = React.memo(({
  top,
  left,
  width,
  height,
  transform,
}) => {
  const controlPressed = useSelector(state => state?.playerUi?.keypress?.Control);
  return(
    <div
      className="flex items-center justify-center"
      style={{
        position: "absolute", 
        width: width,
        height: height,
        top: top,
        left: left,
        zIndex: 1e9,
        opacity: 0.7,
        transform: transform,
      }}
    >
      <div
        className="flex items-center justify-center bg-gray-200"
        style={{
          width: "6vh",
          height: "6vh",
          border: "0.5vh solid black",
          borderRadius: "50%",
        }}
      >
        <FontAwesomeIcon className="w-full h-full" style={{fontSize: '4vh'}} icon={controlPressed ? faArrowDown : faLink}/>
      </div>
    </div>
  );
})
