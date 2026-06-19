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
      className="absolute flex items-center justify-center bg-red-600 hover:bg-red-500 border border-red-900 text-white font-bold shadow cursor-pointer"
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

  // The id box is a fixed 3dvh wide, but step ids vary in length (e.g. "1.1"
  // vs "6.11"). Scale the font down for longer ids so they fit without
  // overflowing or changing the box width.
  const idLength = String(stepId).length;
  const idFontSize = `${Math.min(1.7, 4.8 / Math.max(idLength, 1))}dvh`;

  // The reminder badge pokes ~2dvh past the rail's right edge; when present,
  // start the hover label further right so it doesn't overlap the badge.
  const hasReminder = !!(triggerCardIds && triggerCardIds.length > 0);

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
      className="group relative flex flex-1 items-center cursor-pointer select-none"
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
        className={`flex h-full items-center justify-center font-semibold leading-none transition-colors ${
          isRoundStep ? "bg-red-700 text-white" : "bg-gray-700 text-gray-200 group-hover:bg-gray-600"
        }`}
        style={{ width: "3dvh", fontSize: idFontSize }}
      >
        {stepId}
      </div>
      {hasReminder && <ReminderButton triggerCardIds={triggerCardIds!} stepId={stepId} />}
      {/* Label reveals as an absolute flyout on hover so the narrow rail never reflows. */}
      <div
        className={`absolute left-full top-0 h-full flex items-center px-3 whitespace-nowrap rounded-md border border-gray-700 shadow-xl ${
          isRoundStep ? "bg-red-700 text-white" : "bg-gray-800 text-gray-100"
        }`}
        style={{
          zIndex: 2,
          marginLeft: hasReminder ? "2.7dvh" : "0.25rem",
          clipPath: hovering ? "inset(0 0% 0 0 round 0.375rem)" : "inset(0 100% 0 0 round 0.375rem)",
          opacity: hovering ? 1 : 0,
          pointerEvents: hovering ? "auto" : "none",
          transition: "clip-path 0.2s ease-out, opacity 0.15s ease-out",
        }}
      >
        {gameL10n(stepInfo.label)}
      </div>
    </div>
  );
});
