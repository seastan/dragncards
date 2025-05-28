import React, { useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { setActiveCardId } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useDoActionList } from "./hooks/useDoActionList";
import { dragnActionLists } from "./functions/dragnActionLists";

export const ReminderButton = React.memo(({
  triggerCardIds,
  stepId
}) => {
  const dispatch = useDispatch();
  const numTriggers = triggerCardIds ? triggerCardIds.length : 0;
  const cardById = useSelector(state => state?.gameUi?.game?.cardById);
  const playerN = useSelector(state => state?.playerUi?.playerN)
  const triggerCard = triggerCardIds?.length === 1 ? cardById[triggerCardIds[0]] : null;
  const doActionList = useDoActionList();
  const targetTriggers = (event) => {
    event.stopPropagation();
    if (!playerN) return;
    var actionList = dragnActionLists.clearTargets();
    for (var cardId of triggerCardIds) {
      actionList = actionList.concat([["VAR", "$ACTIVE_CARD_ID", cardId]]);
      actionList = actionList.concat(dragnActionLists.targetCard(cardId));
    }
    doActionList(actionList, `Target triggers for step ${stepId}`);
  }  
  const handleStartHover = () => {
    dispatch(setActiveCardId(triggerCard?.id));
  }
  const handleStopHover = () => {
    dispatch(setActiveCardId(null));
  };
  return(
    <div 
      className="absolute flex items-center justify-center bg-red-800 hover:bg-red-600 border"
      style={{height:"2.5dvh", width:"2.5dvh", right:"-2dvh", borderRadius: "2.5dvh"}}
      onClick={(event) => targetTriggers(event)}
      onMouseEnter={() => handleStartHover()}
      onMouseLeave={() => handleStopHover()}>
      {numTriggers}
    </div>
  )
})

export const SideBarRoundStep = React.memo(({
  stepId,
  triggerCardIds
}) => {
  const gameL10n = useGameL10n();
  const gameDef = useGameDefinition();
  const currentStepId = useSelector(state => state?.gameUi?.game?.stepId);
  const playerN = useSelector(state => state?.playerUi?.playerN)
  const stepInfo = gameDef?.steps?.[stepId];
  const [hovering, setHovering] = useState(null);
  const isRoundStep = (currentStepId === stepId);
  const doActionList = useDoActionList();

  console.log("Rendering SideBarRoundStep", stepId, triggerCardIds);
  const handleButtonClick = () => {
    if (!playerN) return;
    doActionList(dragnActionLists.setStep(stepId, gameDef.steps?.[stepId]), `Set step to ${stepId}`);
  }

  return (
    <div 
      key={stepId}
      className={`flex flex-1 items-center`} 
      style={{
        width: hovering ? "750px" : "100%",
        fontSize: "1.7dvh",
      }}
      onClick={() => handleButtonClick()}
      onMouseEnter={() => setHovering(stepId)}
      onMouseLeave={() => setHovering(null)}>
      <div className="flex justify-center" style={{width:"3dvh"}}/>
      <div className={`flex h-full items-center justify-center ${isRoundStep ? "bg-red-800" : "bg-gray-500"}`} style={{width:"3dvh"}}>
        {stepId}
      </div>
      {triggerCardIds?.length > 0 &&
        <ReminderButton
          triggerCardIds={triggerCardIds}
          stepId={stepId}
        />
      }
      <div className={`flex flex-1 h-full items-center justify-center rounded-tr-lg rounded-br-lg ${isRoundStep ? "bg-red-800" : "bg-gray-500"} ${hovering ? "block" : "hidden"}`} >
        <div>{gameL10n(stepInfo.label)}</div>
      </div>
    </div>
  )
})