import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { setKeypressAlt, setKeypressControl, setKeypressShift, setKeypressSpace, setKeypressTab } from "../store/playerUiSlice";
import { DragContainer } from "./DragContainer";
import { useKeyDown } from "./hooks/useKeyDown";

const RoomGame = React.memo(({}) => {
  console.log('Rendering RoomGame');
  const dispatch = useDispatch();
  const typing = useSelector(state => state?.playerUi.typing);
  const onKeyDown = useKeyDown();
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMouseMove = (e) => { lastMouse.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  useEffect(() => {

    const onKeyUp = (event) => {
      const k = event.key;
      if (k === "Alt") dispatch(setKeypressAlt(0));
      if (k === "Meta") dispatch(setKeypressAlt(0));
      if (k === " ") dispatch(setKeypressSpace(0));
      if (k === "Control") dispatch(setKeypressControl(0));
      if (k === "Shift") dispatch(setKeypressShift(0));
      if (k === "Tab") {
        dispatch(setKeypressTab(0));
        // The overlay closed but the cursor hasn't moved, so no native
        // mouseover fires to re-highlight the card underneath. After the
        // overlay unmounts, synthesize a mouseover at the cursor position so
        // the card region's normal hover logic re-activates it (if any).
        const { x, y } = lastMouse.current;
        setTimeout(() => {
          const el = document.elementFromPoint(x, y);
          if (el) el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }));
        }, 0);
      }
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
