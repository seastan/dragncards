import React from "react";
import { useSelector } from "react-redux";
import { useDoActionList } from "./hooks/useDoActionList";
import { useGameL10n } from "./hooks/useGameL10n";
import { CounterStepper } from "./CounterStepper";

interface Props {
  playerI: string;
  playerProperty: string;
  imageUrl: string;
  label: string;
}

export const TopBarUserCounter = React.memo(({ playerI, playerProperty, imageUrl, label }: Props) => {
  const doActionList: any = useDoActionList();
  const gameL10n = useGameL10n();
  const backEndValue = useSelector((state: any) => state?.gameUi?.game?.playerData?.[playerI]?.[playerProperty]);
  const playerN = useSelector((state: any) => state?.playerUi?.playerN);
  const touchMode = useSelector((state: any) => state?.playerUi?.touchMode);

  const handleCommit = (newValue: number, totalDelta: number) => {
    if (totalDelta === 0) return;
    const listOfActions = [
      ["INCREASE_VAL", `/playerData/${playerI}/${playerProperty}`, totalDelta],
      ["LOG", "$ALIAS_N", totalDelta >= 0 ? " increased " : " decreased ", playerI, "'s ", gameL10n(label), " by ", Math.abs(totalDelta), "."],
    ];
    doActionList(listOfActions, `Update ${playerProperty} counter for ${playerI} to ${newValue}`);
  };

  return (
    <CounterStepper
      backEndValue={backEndValue || 0}
      imageUrl={imageUrl}
      label={gameL10n(label)}
      disabled={!playerN}
      refocusAfterCommit={!touchMode}
      onCommit={handleCommit}
    />
  );
});
