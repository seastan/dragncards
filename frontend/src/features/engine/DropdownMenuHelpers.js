import React from "react";
import { faReply } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import "../../css/custom-dropdown.css";

// Mobile UI renders the menus inside its own sheet (MobileMenuSheet) rather
// than floating them at the pointer: undo .dropdown's absolute positioning,
// fixed width and animated height so the menu just fills its container.
export const EMBEDDED_MENU_STYLE = {
  position: "relative",
  width: "100%",
  height: "auto",
  top: "auto",
  left: "auto",
  overflow: "visible",
  border: "none",
  borderRadius: 0,
  background: "transparent",
  padding: "4px 8px",
};

export const calcHeightCommon = (el, setMenuHeight) => {
  const height = el.clientHeight+50;
  setMenuHeight(height);
}

export const GoBack = (props) => {
  return (
    <DropdownItem goToMenu={props.goToMenu} leftIcon={<FontAwesomeIcon icon={faReply}/>} clickCallback={props.clickCallback}>
      Go back
    </DropdownItem>
  )
}

export const DropdownItem = (props) => {
  const handleDropDownItemClick = (event) => {
    event.stopPropagation();
    props.clickCallback(props);
  }

  const handleRightIconClick = (event) => {
    event.stopPropagation(); // Prevents triggering the click event of the parent element
    if (props.rightIconClickCallback) {
      props.rightIconClickCallback(props);
    }
  }

  return (
    <a href="#" className="menu-item" onClick={(event) => handleDropDownItemClick(event)}>    
      {props.leftIcon && <span className="icon-button">{props.leftIcon}</span>}
      {props.children}
      {props.rightIconClickCallback ? 
        <span className="icon-right icon-button hover:bg-red-700" onClick={handleRightIconClick}>{props.rightIcon}</span> :
        <span className="icon-right">{props.rightIcon}</span>
      }
    </a>
  );
}

