import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setActiveCardId } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useDoActionList } from "./hooks/useDoActionList";
import { dragnActionLists } from "./functions/dragnActionLists";

interface ReminderButtonProps {
  triggerCardIds: string[];
  stepId: string;
}

export const ReminderButton = React.memo(({ triggerCardIds, stepId }: ReminderButtonProps) => {
  const dispatch = useDispatch();
  const numTriggers = triggerCardIds ? triggerCardIds.length : 0;
  const cardById = useSelector((state: any) => state?.gameUi?.game?.cardById);
  const playerN = useSelector((state: any) => state?.playerUi?.playerN);
  const triggerCard = triggerCardIds?.length === 1 ? cardById[triggerCardIds[0]] : null;
  const doActionList: any = useDoActionList();
  const targetTriggers = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!playerN) return;
    var actionList: any[] = dragnActionLists.clearTargets();
    for (var cardId of triggerCardIds) {
      actionList = actionList.concat([["VAR", "$ACTIVE_CARD_ID", cardId]]);
      actionList = actionList.concat((dragnActionLists as any).targetCard(cardId));
    }
    doActionList(actionList, `Target triggers for step ${stepId}`);
  };
  const handleStartHover = () => {
    dispatch(setActiveCardId(triggerCard?.id));
  };
  const handleStopHover = () => {
    dispatch(setActiveCardId(null));
  };
  return (
    <div
      role="button"
      aria-label={`${numTriggers} ${numTriggers === 1 ? "trigger" : "triggers"} for step ${stepId}`}
      className="absolute flex items-center justify-center bg-red-800 hover:bg-red-600 border"
      style={{ height: "2.5dvh", width: "2.5dvh", right: "-2dvh", borderRadius: "2.5dvh", zIndex: 1 }}
      onClick={(event) => targetTriggers(event)}
      onMouseEnter={() => handleStartHover()}
      onMouseLeave={() => handleStopHover()}
    >
      {numTriggers}
    </div>
  );
});

interface Props {
  stepId: string;
  triggerCardIds?: string[];
}

export const SideBarRoundStep = React.memo(({ stepId, triggerCardIds }: Props) => {
  const gameL10n = useGameL10n();
  const gameDef = useGameDefinition();
  const currentStepId = useSelector((state: any) => state?.gameUi?.game?.stepId);
  const playerN = useSelector((state: any) => state?.playerUi?.playerN);
  const stepInfo = gameDef?.steps?.[stepId];
  const [hovering, setHovering] = useState(false);
  const isRoundStep = currentStepId === stepId;
  const doActionList: any = useDoActionList();

  const handleButtonClick = () => {
    if (!playerN) return;
    doActionList(dragnActionLists.setStep(stepId, gameDef.steps?.[stepId]), `Set step to ${stepId}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={isRoundStep ? "step" : undefined}
      aria-label={gameL10n(stepInfo.label)}
      className="relative flex flex-1 items-center cursor-pointer select-none"
      style={{ fontSize: "1.7dvh" }}
      onClick={() => handleButtonClick()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleButtonClick();
        }
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="flex justify-center" style={{ width: "3dvh" }} />
      <div
        className={`flex h-full items-center justify-center ${isRoundStep ? "bg-red-800" : "bg-gray-500"}`}
        style={{ width: "3dvh" }}
      >
        {stepId}
      </div>
      {triggerCardIds && triggerCardIds.length > 0 && (
        <ReminderButton triggerCardIds={triggerCardIds} stepId={stepId} />
      )}
      {/* Label reveals as an absolute flyout on hover so the narrow rail never reflows. */}
      <div
        className={`absolute left-full top-0 h-full flex items-center px-3 ml-1 whitespace-nowrap rounded-r-lg shadow-lg ${
          isRoundStep ? "bg-red-800" : "bg-gray-500"
        } ${hovering ? "flex" : "hidden"}`}
        style={{ zIndex: 2 }}
      >
        {gameL10n(stepInfo.label)}
      </div>
    </div>
  );
});
