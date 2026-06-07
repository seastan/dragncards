import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import useFocus from "../../hooks/useFocus";
import { useDoActionList } from "./hooks/useDoActionList";
import { setTyping } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";

interface Props {
  gameProperty: string;
  imageUrl: string;
  label: string;
}

export const TopBarSharedCounter = React.memo(({ gameProperty, imageUrl, label }: Props) => {
  const dispatch = useDispatch();
  const doActionList: any = useDoActionList();
  const gameL10n = useGameL10n();
  const stateValue = useSelector((state: any) => state?.gameUi?.game?.[gameProperty]);
  const [value, setValue] = useState(stateValue || 0);
  const [previousValue, setPreviousValue] = useState(value);
  const playerN = useSelector((state: any) => state?.playerUi?.playerN);
  const [inputRef, setInputFocus] = useFocus() as any;
  const touchMode = useSelector((state: any) => state?.playerUi?.touchMode);
  // Debounce timer is per-instance (was previously a shared module-level global).
  const delayBroadcast = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setValue(stateValue);
    setPreviousValue(stateValue);
  }, [stateValue]);

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(event.target.value);
    setValue(newValue);
    // Set up a delayed broadcast to update the game state that interrupts itself if the button is clicked again shortly after.
    if (delayBroadcast.current) clearTimeout(delayBroadcast.current);
    delayBroadcast.current = setTimeout(function () {
      const totalDelta = newValue - previousValue;
      setPreviousValue(newValue);
      const listOfActions = [
        ["SET", "/" + gameProperty, newValue],
        ["LOG", "$ALIAS_N", totalDelta >= 0 ? " increased " : " decreased ", gameL10n(label), " by ", Math.abs(totalDelta), "."],
      ];
      doActionList(listOfActions, `Update shared counter ${gameProperty} to ${newValue}`);
      if (!touchMode) setInputFocus();
    }, 400);
  };

  return (
    <>
      <div className="h-1/2 w-full flex justify-center">{gameL10n(label)}</div>
      <div className="h-1/2 w-full flex justify-center">
        <img className="h-full ml-1 object-contain" src={imageUrl} alt={gameL10n(label)} />
        <input
          className="h-full w-1/2 text-center bg-transparent"
          value={value ? value : 0}
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
    </>
  );
});
