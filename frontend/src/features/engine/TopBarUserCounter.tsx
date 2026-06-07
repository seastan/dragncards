import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import useFocus from "../../hooks/useFocus";
import { useDoActionList } from "./hooks/useDoActionList";
import { setTyping } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";

interface Props {
  playerI: string;
  playerProperty: string;
  imageUrl: string;
  label: string;
}

export const TopBarUserCounter = React.memo(({ playerI, playerProperty, imageUrl, label }: Props) => {
  const dispatch = useDispatch();
  const doActionList: any = useDoActionList();
  const gameL10n = useGameL10n();
  const backEndValue = useSelector((state: any) => state?.gameUi?.game?.playerData?.[playerI]?.[playerProperty]);
  const [value, setValue] = useState(backEndValue || 0);
  const [previousValue, setPreviousValue] = useState(value);
  const playerN = useSelector((state: any) => state?.playerUi?.playerN);
  const [inputRef, setInputFocus] = useFocus() as any;
  const touchMode = useSelector((state: any) => state?.playerUi?.touchMode);
  // Debounce timer is per-instance (was previously a shared module-level global).
  const delayBroadcast = useRef<ReturnType<typeof setTimeout>>();

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(event.target.value);
    setValue(newValue);
    // Set up a delayed broadcast to update the game state that interrupts itself if the button is clicked again shortly after.
    if (delayBroadcast.current) clearTimeout(delayBroadcast.current);
    delayBroadcast.current = setTimeout(function () {
      const totalDelta = newValue - previousValue;
      setPreviousValue(newValue);
      const listOfActions = [
        ["INCREASE_VAL", `/playerData/${playerI}/${playerProperty}`, totalDelta],
        ["LOG", "$ALIAS_N", totalDelta >= 0 ? " increased " : " decreased ", playerI, "'s ", gameL10n(label), " by ", Math.abs(totalDelta), "."],
      ];
      doActionList(listOfActions, `Update ${playerProperty} counter for ${playerI} to ${newValue}`);
      if (!touchMode) setInputFocus();
    }, 400);
  };

  useEffect(() => {
    setValue(backEndValue);
    setPreviousValue(backEndValue);
  }, [backEndValue]);

  return (
    <div className="h-full w-full flex justify-center">
      <img className="h-full w-1/3 object-contain ml-1" src={imageUrl} alt={gameL10n(label)} />
      <input
        className="h-full w-2/3 text-center bg-transparent"
        value={value}
        onChange={handleValueChange}
        type="number"
        min="0"
        step="1"
        disabled={playerN ? false : true}
        onFocus={() => dispatch(setTyping(true))}
        onBlur={() => dispatch(setTyping(false))}
        ref={inputRef}
      />
    </div>
  );
});
