import React, { useEffect, useState } from "react";
import { SideBarPhase } from "./SideBarPhase";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useSelector } from "react-redux";

type TriggerMap = { [stepId: string]: string[] };

export const SideBar = React.memo(() => {
  const gameDef = useGameDefinition();
  const cardById = useSelector((state: any) => state?.gameUi?.game?.cardById);
  const [triggerMap, setTriggerMap] = useState<TriggerMap>({});
  useEffect(() => {
    const newTriggerMap: TriggerMap = {};
    if (cardById) {
      for (const [cardId, card] of Object.entries<any>(cardById)) {
        if (!card?.inPlay) continue;
        for (const [stepId, val] of Object.entries<any>(card?.sides?.[card.currentSide]?.triggers)) {
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
    setTriggerMap(newTriggerMap);
  }, [cardById]);

  return (
    <div className="bg-gray-500" style={{ width: "6dvh", zIndex: 10000 }}>
      <div className="h-full">
        {gameDef?.phaseOrder?.map((phaseId: string) => (
          <SideBarPhase key={phaseId} phaseId={phaseId} triggerMap={triggerMap} />
        ))}
      </div>
    </div>
  );
});
