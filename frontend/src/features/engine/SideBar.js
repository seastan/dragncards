import React, { useEffect, useState } from "react";
import { SideBarPhase } from "./SideBarPhase";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useSelector } from "react-redux";

export const SideBar = React.memo(({}) => {
  const gameDef = useGameDefinition();
  const cardById = useSelector(state => state?.gameUi?.game?.cardById);
  const [triggerMap, setTriggerMap] = useState({})
  useEffect(() => {
      const newTriggerMap = {};
      if (cardById) {
        for (const [cardId, card] of Object.entries(cardById)) {
          if (!card?.inPlay) continue;
          for (const [stepId, val] of Object.entries(card?.sides?.[card.currentSide]?.triggers)) {
            if (val === true) {
              if (newTriggerMap?.[stepId]) {
                newTriggerMap[stepId].push(cardId);
              } else {
                newTriggerMap[stepId] = [cardId];
              }
            }
          }
        }
      }
      console.log("newtriggermap", newTriggerMap)
      setTriggerMap(newTriggerMap);
  }, [cardById])

  return(
    <div className="bg-gray-500" style={{width:"6dvh", zIndex: 1e4}}>
      <div className="h-full">
        {gameDef?.phaseOrder?.map((phaseId, phaseIndex) => {
          return(<SideBarPhase key={phaseIndex} phaseId={phaseId} triggerMap={triggerMap}/>)
      })}
      </div>
    </div>
  )
})
