
import React, { useEffect } from "react";
import useLongPress from "./hooks/useLongPress";
import { useDispatch, useSelector } from "react-redux";
import { setMouseTopBottom, setDropdownMenu, setActiveCardId, setScreenLeftRight, setCardClicked } from "../store/playerUiSlice";
import { useHandleTouchAction } from "./hooks/useHandleTouchAction";
import { useCardZIndex } from "./hooks/useCardZIndex";
import { useVisibleFace } from "./hooks/useVisibleFace";
import { useTouchAction } from "./hooks/useTouchAction";
import { useDoActionList } from "./hooks/useDoActionList";
import { useGetDefaultAction } from "./hooks/useGetDefaultAction";


export const CardMouseRegion = React.memo(({
    topOrBottom,
    cardId,
    isActive
}) => {
    const dispatch = useDispatch();
    const card = useSelector(state => state?.gameUi?.game?.cardById[cardId]);
    const visibleFace = useVisibleFace(cardId);
    const playerN = useSelector(state => state?.playerUi?.playerN);
    const touchMode = useSelector(state => state?.playerUi?.userSettings?.touchMode);
    const touchAction = useTouchAction();
    const dropdownMenuVisible = useSelector(state => state?.playerUi?.dropdownMenu?.visible);
    const zIndex = useCardZIndex(cardId);
    const handleTouchAction = useHandleTouchAction();
    const doActionList = useDoActionList();
    const getDefaultAction = useGetDefaultAction(cardId);

    const makeActive = (event) => {
        const screenLeftRight = event.clientX > (window.innerWidth/2) ? "right" : "left";
        dispatch(setActiveCardId(cardId));
        dispatch(setScreenLeftRight(screenLeftRight));
        dispatch(setMouseTopBottom(topOrBottom))
        dispatch(setCardClicked(true));
    }

    const handleSetDropDownMenu = () => {
        const dropdownMenu = {
            type: "card",
            cardId: card.id,
            title: visibleFace?.name,
            visible: true,
        }
        if (playerN) dispatch(setDropdownMenu(dropdownMenu));
    }

    const handleClick = (event) => {
        console.log("cardaction click", {card, touchMode, isActive, touchAction});
        event.stopPropagation(); 
        if (touchMode) {
            if (isActive) {
                doActionList(getDefaultAction()?.actionList)
            } else if (touchAction !== null) {
                handleTouchAction(card);
            } else {
                makeActive(event); 
                handleSetDropDownMenu();
            }
        } else {
            makeActive(event); 
            handleSetDropDownMenu();
        }
    }
    
    const handleMouseOver = (event) => {
        console.log("cardaction mouseover", card);
        event.stopPropagation();
        if (!touchMode && !dropdownMenuVisible) makeActive(event);
        //setIsActive(true);
    }

    const onLongPress = (event) => {
        event.preventDefault();
        handleSetDropDownMenu();
    };

    // const defaultOptions = {
    //     shouldPreventDefault: true,
    //     delay: 800,
    // };

    //const longPress = useLongPress(onLongPress, handleClick, defaultOptions);
    const regionStyle = {
        position: 'absolute',
        top: topOrBottom === "top" ? "0%" : "50%",
        width: '100%',
        height: '50%',
        zIndex: zIndex,
    }

    // if (touchMode) {
    //     return(
    //         <div 
    //             {...longPress}
    //             style={regionStyle}
    //             onMouseOver={event => !isActive && !touchAction && makeActive(event)}
    //         />
    // )} else 
      const handleEvent = (event) => {
        console.log("clicklog", event.type, event);
        if (touchMode) doActionList(["LOG", "click", event.type]);
        if (event.type === "click") handleClick(event);
      };
    
      return (
        <div
          id="my-element"
          style={regionStyle}
          onTouchStart={handleEvent}
          onTouchMove={handleEvent}
          onTouchEnd={handleEvent}
          onMouseDown={handleEvent}
          onMouseOver={handleEvent}
          onMouseUp={handleEvent}
          onClick={handleEvent}
          onDoubleClick={handleEvent}
          onPointerDown={handleEvent}
          onPointerUp={handleEvent}
          onPointerCancel={handleEvent}
          onKeyDown={handleEvent}
          onKeyUp={handleEvent}
        />
      );

    // return (
    //     <div 
    //         style={regionStyle}
    //         onMouseOver={event =>  handleMouseOver(event)}
    //         onClick={event => handleClick(event)}
    //     />  
    // )
})