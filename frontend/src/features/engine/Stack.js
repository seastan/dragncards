import React, { useState } from "react";
import { useSelector } from 'react-redux';
import { Card } from "./Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp, faChevronDown, faEye, faLink } from "@fortawesome/free-solid-svg-icons";
import { useOffsetTotalsAndAmounts } from "./hooks/useOffsetTotalsAndAmounts";
import { DEFAULT_CARD_Z_INDEX } from "./functions/common";
import { useDoActionList } from "./hooks/useDoActionList";
import { useLayout } from "./hooks/useLayout";

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

//left: ${props => props.left || 0}dvh;
// background: ${props => (props.hidden) ? "red" : "blue"};
  // display: ${props => (props.hidden) ? "none" : "flex"};

export const Stack = React.memo(({
  stackId,
  isDragging,
  stackZoomFactor,
  hideArrows,
}) => {
  const layout = useLayout();
  const stack = useSelector(state => state?.gameUi?.game?.stackById[stackId]);
  const isHoveredOver = useSelector(state => state?.playerUi?.dragging.hoverOverStackId === stackId);
  const hoverOverDirection = useSelector(state => isHoveredOver ? state?.playerUi?.dragging.hoverOverDirection : null);
  const hoverOverAttachmentAllowed = useSelector(state => isHoveredOver ? state?.playerUi?.dragging.hoverOverAttachmentAllowed : null);
  const [showingUnder, setShowingUnder] = useState(stack?.lookingUnder);
  const doActionList = useDoActionList();
  const cardIds = stack?.cardIds;

  const {offsetTotals, offsetAmounts, stackEdges} = useOffsetTotalsAndAmounts(stackId);
  if (!stack) return null;

  console.log('Rendering StackId hover ', isHoveredOver, hoverOverDirection, layout)
  console.log('Rendering StackId offsets', offsetTotals, offsetAmounts)

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
      className="h-full w-full"
      style={{
        transform: `scale(${stackZoomFactor})`
      }}
    >
      {(layout?.stackStyleWhenHoveredOver && isHoveredOver) &&
        <div 
          className="absolute h-full w-full"
          style={{...layout.stackStyleWhenHoveredOver, zIndex: DEFAULT_CARD_Z_INDEX+1}}
        />
      }

      
      {isHoveredOver && hoverOverAttachmentAllowed && hoverOverDirection == "center" && <LinkIcon top="0" left="0" width="100%" height="6dvh"  transform="translate(0%, 0%)"/>}
      {isHoveredOver && hoverOverAttachmentAllowed && hoverOverDirection == "top" && <LinkIcon top="0" left="0" width="100%" height="6dvh"  transform="translate(0%, -50%)"/>}
      {isHoveredOver && hoverOverAttachmentAllowed && hoverOverDirection == "left" && <LinkIcon top="0" left="0" width="6dvh"  height="100%" transform="translate(-50%, 0%)"/>}
      {isHoveredOver && hoverOverAttachmentAllowed && hoverOverDirection == "right" && <LinkIcon top="0" left="100%" width="6dvh"  height="100%" transform="translate(-50%, 0%)"/>}
      {isHoveredOver && hoverOverAttachmentAllowed && hoverOverDirection == "bottom" && <LinkIcon top="100%" left="0" width="100%" height="6dvh"  transform="translate(0%, -50%)"/>}
      {cardIds.map((cardId, cardIndex) => {
        return(
          <Card
            key={cardId}
            offset={offsetAmounts[cardIndex]}
            cardId={cardId}
            cardIndexFromGui={cardIndex}
            isDragging={(cardIndex === cardIds.length - 1) ? isDragging : false}
            hideArrows={hideArrows}
          />
        )
      })}
      {numBehind > 0 &&
        <div
          className="flex items-center justify-center"
          style={{
            position: "absolute", 
            height: "3dvh",
            top: "calc(100% - 3dvh)",
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
          width: "6dvh",
          height: "6dvh",
          border: "0.5dvh solid black",
          borderRadius: "50%",
        }}
      >
        <FontAwesomeIcon className="w-full h-full" style={{fontSize: '4dvh'}} icon={controlPressed ? faArrowDown : faLink}/>
      </div>
    </div>
  );
})
