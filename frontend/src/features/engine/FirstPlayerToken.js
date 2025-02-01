import React from "react";
import { useSelector, useDispatch } from 'react-redux';
import { setDropdownMenu} from "../store/playerUiSlice";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { TopBarUserButton } from "./TopBarUser";



export const FirstPlayerToken = React.memo(() => {
  const dispatch = useDispatch();
  const gameDef = useGameDefinition();
  const playerN = useSelector(state => state?.playerUi?.playerN);


  const handleFirstPlayerClick = (event) => {
    event.stopPropagation();
    if (!playerN) return;
    const dropdownMenu = {
        type: "firstPlayer",
        title: "Set first player",
    }
    dispatch(setDropdownMenu(dropdownMenu));
  }
  
  return(
    <TopBarUserButton 
      onClickHandler={(event) => handleFirstPlayerClick(event)} 
      extraButtonClass={"bg-gray-500 px-0 cursor-pointer px-1"}
      extraParentClass={"mr-1"}>
        <div style={{fontSize: "1.3dvh"}}>
          1st
        </div>
        <FontAwesomeIcon icon={faChevronDown} className="ml-1" style={{fontSize: "1.2dvh"}}/>
    </TopBarUserButton>

    // <img 
    //   className="h-full mr-1 mb-1" 
    //   src={gameDef?.firstPlayerImageUrl}
    //   onClick={(event) => handleFirstPlayerClick(event)}/>
  )
})