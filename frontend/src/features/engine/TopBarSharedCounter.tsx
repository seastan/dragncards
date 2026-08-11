import React from "react";
import { useSelector } from "react-redux";
import { useDoActionList } from "./hooks/useDoActionList";
import { useGameL10n } from "./hooks/useGameL10n";
import { CounterStepper } from "./CounterStepper";

interface Props {
  gameProperty: string;
  imageUrl: string;
  label: string;
}

export const TopBarSharedCounter = React.memo(({ gameProperty, imageUrl, label }: Props) => {
  const doActionList: any = useDoActionList();
  const gameL10n = useGameL10n();
  const stateValue = useSelector((state: any) => state?.gameUi?.game?.[gameProperty]);
  const playerN = useSelector((state: any) => state?.playerUi?.playerN);
  const touchMode = useSelector((state: any) => state?.playerUi?.userSettings?.touchMode);

  const handleCommit = (newValue: number, totalDelta: number) => {
    if (totalDelta === 0) return;
    const listOfActions = [
      ["SET", "/" + gameProperty, newValue],
      ["LOG", "$ALIAS_N", totalDelta >= 0 ? " increased " : " decreased ", gameL10n(label), " by ", Math.abs(totalDelta), "."],
    ];
    doActionList(listOfActions, `Update shared counter ${gameProperty} to ${newValue}`);
  };

  return (
    <div className="flex flex-col h-full w-full items-center justify-center px-0.5 py-0.5">
      <div
        className="text-gray-400 truncate w-full text-center leading-none flex-shrink-0"
        style={{ fontSize: "1.2dvh" }}
      >
        {gameL10n(label)}
      </div>
      <div className="w-full flex-1 min-h-0">
        <CounterStepper
          backEndValue={stateValue || 0}
          imageUrl={imageUrl}
          label={gameL10n(label)}
          disabled={!playerN}
          refocusAfterCommit={!touchMode}
          vertical
          onCommit={handleCommit}
        />
      </div>
    </div>
  );
});
