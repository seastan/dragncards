import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import useFocus from "../../hooks/useFocus";
import { useDoActionList } from "./hooks/useDoActionList";
import { setTyping } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";

var delayBroadcast;

export const TopBarUserCounter = React.memo(({
  playerI,
  playerProperty,
  imageUrl,
  label,
}) => {
  const dispatch = useDispatch();
  const doActionList = useDoActionList();
  const gameL10n = useGameL10n();
  const backEndValue = useSelector(state => state?.gameUi?.game?.playerData?.[playerI]?.[playerProperty]);
  const [value, setValue] = useState( backEndValue || 0);
  const [previousValue, setPreviousValue] = useState(value);
  const playerN = useSelector(state => state?.playerUi?.playerN);  
  const [inputRef, setInputFocus] = useFocus();
  const playerIAlias = useSelector(state => state?.gameUi?.playerInfo?.[playerI]?.alias);
  const touchMode = useSelector(state => state?.playerUi?.touchMode);

  const handleValueChange = (event) => {
    const newValue = Number(event.target.value);
    setValue(newValue);
    // Set up a delayed broadcast to update the game state that interrupts itself if the button is clicked again shortly after.
    if (delayBroadcast) clearTimeout(delayBroadcast);
    delayBroadcast = setTimeout(function() {
      const totalDelta = newValue - previousValue;
      setPreviousValue(newValue);
      const listOfActions = [
        ["INCREASE_VAL", `/playerData/${playerI}/${playerProperty}`, totalDelta],
        ["LOG", "$ALIAS_N", totalDelta >= 0 ? " increased " : " decreased ", playerI, "'s ", gameL10n(label), " by ", Math.abs(totalDelta), "."]
      ]
      doActionList(listOfActions);
      if (!touchMode) setInputFocus();
    }, 400);
  }

  useEffect(() => {
    setValue(backEndValue);
    setPreviousValue(backEndValue);
  },[backEndValue]);

  return(
    <div className="h-full w-full flex justify-center">
      <img className="h-full w-1/3 object-contain ml-1" src={imageUrl}></img>
      <input 
        className="h-full w-2/3 float-left text-center bg-transparent" 
        value={value}
        onChange={handleValueChange}
        type="number" min="0" step="1"
        disabled={playerN ? false : true}
        onFocus={event => dispatch(setTyping(true))}
        onBlur={event => dispatch(setTyping(false))}
        ref={inputRef}>
      </input>
    </div>
  )
})