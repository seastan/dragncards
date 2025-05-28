import React, { useState } from "react";
import { DropdownMenuCard } from "./DropdownMenuCard";
import { DropdownMenuGroup } from "./DropdownMenuGroup";
import { DropdownMenuFirstPlayer } from "./DropdownMenuFirstPlayer";
import { useDispatch, useSelector } from 'react-redux';
import { calcHeightCommon } from "./DropdownMenuHelpers";
import "../../css/custom-dropdown.css";
import { setActiveCardId, setDropdownMenu } from "../store/playerUiSlice";
import { useDoActionList } from "./hooks/useDoActionList";

export const DropdownMenuCommon = React.memo(({
  mouseX,
  mouseY,
}) => {
  
  const dispatch = useDispatch();
  const dropdownMenu = useSelector(state => state?.playerUi?.dropdownMenu)
  const [activeMenu, setActiveMenu] = useState('main');
  const [menuHeight, setMenuHeight] = useState(null);
  const doActionList = useDoActionList();

  const calcHeight = (el) => {
    calcHeightCommon(el, setMenuHeight);
  }

  const handleDropdownClick = (dropdownOptions) => {
    console.log("handleDropdownClick", dropdownOptions)
    if (dropdownOptions.goToMenu) {
      setActiveMenu(dropdownOptions.goToMenu);
      return;
    }
    doActionList(dropdownOptions.action, `Dropdown menu action: ${dropdownOptions.description}`);
    setActiveMenu("main");
    dispatch(setDropdownMenu(null));
    dispatch(setActiveCardId(null));
    setMenuHeight(null);
  }

  if (dropdownMenu.type === "card") {
    return (
      <DropdownMenuCard
        mouseX={mouseX}
        mouseY={mouseY}
        menuHeight={menuHeight}
        handleDropdownClick={handleDropdownClick}
        calcHeight={calcHeight}
        activeMenu={activeMenu}
      />
    )
  } else if (dropdownMenu.type === "group") {
    return (
      <DropdownMenuGroup
        mouseX={mouseX}
        mouseY={mouseY}
        menuHeight={menuHeight}
        handleDropdownClick={handleDropdownClick}
        calcHeight={calcHeight}
        activeMenu={activeMenu}
      />
    )
  } else if (dropdownMenu.type === "firstPlayer") {
    return (
      <DropdownMenuFirstPlayer
        mouseX={mouseX}
        mouseY={mouseY}
        menuHeight={menuHeight}
        handleDropdownClick={handleDropdownClick}
        calcHeight={calcHeight}
        activeMenu={activeMenu}
      />
    )
  } else return null;

})