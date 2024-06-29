import React, { useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { setKeypressAlt, setKeypressControl, setKeypressShift, setKeypressSpace, setKeypressTab } from "../store/playerUiSlice";
import { DragContainer } from "./DragContainer";
import { useKeyDown } from "./hooks/useKeyDown";

const RoomGame = React.memo(({}) => {
  console.log('Rendering RoomGame');
  const dispatch = useDispatch();
  const typing = useSelector(state => state?.playerUi.typing);
  const onKeyDown = useKeyDown();

  useEffect(() => {
    
    const onKeyUp = (event) => {
      const k = event.key;
      if (k === "Alt") dispatch(setKeypressAlt(0));
      if (k === "Meta") dispatch(setKeypressAlt(0));
      if (k === " ") dispatch(setKeypressSpace(0));
      if (k === "Control") dispatch(setKeypressControl(0));
      if (k === "Shift") dispatch(setKeypressShift(0));
      if (k === "Tab") dispatch(setKeypressTab(0));
    }

    if (!typing) {
      document.addEventListener('keyup', onKeyUp);
      document.addEventListener('keydown', onKeyDown);
    }

    return () => {
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('keydown', onKeyDown);
    }
  }, [onKeyDown]); //, typing]);

  return (
    <div className="h-full w-full">
      <DragContainer/>
    </div>
  )
})

export default RoomGame;
