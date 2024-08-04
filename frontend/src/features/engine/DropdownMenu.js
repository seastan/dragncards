import React, { useState, useEffect } from "react";
import { DropdownMenuCommon } from "./DropdownMenuCommon";

import "../../css/custom-dropdown.css";
import { useSelector } from "react-redux";
import { useTouchAction } from "./hooks/useTouchAction";

export const DropdownMenu = React.memo(({}) => {
  const dropdownMenu = useSelector(state => state?.playerUi?.dropdownMenu);
  const touchMode = useSelector(state => state?.playerUi?.userSettings?.touchMode);
  const touchAction = useTouchAction();
  const mouseXY = useSelector(state => state?.playerUi?.mouseXY);
  
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0); 
  const [isNull, setIsNull] = useState(true);

  useEffect(() => {
    const xOffset = (touchMode ? 50 : 0);
    setMouseX(mouseXY?.x + xOffset);
    setMouseY(mouseXY?.y);
    setIsNull(dropdownMenu === null);
  }, [dropdownMenu])


  console.log("Rendering DropdownMenu ",mouseXY,dropdownMenu,isNull,touchAction);
  if (!mouseXY) return null;
  if (!dropdownMenu) return null;
  if (isNull) return null;
  if (touchAction) return null;

  return (
    <DropdownMenuCommon
      mouseX={mouseX}
      mouseY={mouseY}
    />
  )

})