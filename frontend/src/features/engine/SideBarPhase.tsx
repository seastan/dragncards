import React from "react";
import { useSelector } from "react-redux";
import { useGameL10n } from "./hooks/useGameL10n";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { SideBarRoundStep } from "./SideBarRoundStep";

interface Props {
  phaseId: string;
  triggerMap: { [stepId: string]: string[] };
}

export const SideBarPhase = React.memo(({ phaseId, triggerMap }: Props) => {
  const gameL10n = useGameL10n();
  const gameDef = useGameDefinition();
  const currentStepId = useSelector((state: any) => state?.gameUi?.game?.stepId);
  const currentPhaseId = gameDef?.steps?.[currentStepId]?.phaseId;
  const phaseInfo = gameDef?.phases?.[phaseId];
  const isPhase = phaseId === currentPhaseId;
  if (!phaseInfo) return null;
  return (
    <div
      className="relative text-center select-none text-gray-100"
      style={{
        height: phaseInfo.height,
        maxHeight: phaseInfo.height,
        borderBottom: phaseId === "End" ? "" : "1px solid rgb(55,65,81)",
      }}
    >
      <div
        className={`absolute h-full pointer-events-none transition-colors ${isPhase ? "bg-red-700" : ""}`}
        style={{ width: "3dvh" }}
      >
        <div
          className={`absolute h-full w-full flex items-center justify-center font-medium tracking-wide ${
            isPhase ? "text-white" : "text-gray-400"
          }`}
          style={{ writingMode: "vertical-rl" }}
        >
          {gameL10n(phaseInfo.label)}
        </div>
      </div>
      <div className="w-full h-full flex flex-col">
        {gameDef?.stepOrder?.map((stepId: string) => {
          const stepInfo = gameDef?.steps?.[stepId];
          if (stepInfo?.phaseId === phaseId)
            return <SideBarRoundStep key={stepId} stepId={stepId} triggerCardIds={triggerMap?.[stepId]} />;
          return null;
        })}
      </div>
    </div>
  );
});
