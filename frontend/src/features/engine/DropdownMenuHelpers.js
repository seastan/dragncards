import React from "react";
import { faReply } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import "../../css/custom-dropdown.css";

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

